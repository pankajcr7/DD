from flask import Flask, render_template, request, jsonify
import random
import itertools
import json
import os

app = Flask(__name__)

DATA_FILE = 'saved_data.json'

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/load_saved_data')
def load_saved_data():
    return jsonify(load_data())

@app.route('/save_data', methods=['POST'])
def save_data_route():
    data = request.json
    save_data(data)
    return jsonify({"status": "success"})

@app.route('/generate_teams', methods=['POST'])
def generate_teams():
    data = request.json
    
    team1_players = data['team1_players']
    team2_players = data['team2_players']
    team_composition = data['team_composition']
    fix_players = data['fix_players']
    cap_vc_choices = data['cap_vc_choices']
    groups = data['groups']
    contest_size = data['contest_size']
    
    # Generate teams based on constraints
    all_teams = generate_unique_teams(
        team1_players,
        team2_players,
        team_composition,
        fix_players,
        cap_vc_choices,
        groups,
        contest_size
    )
    
    return jsonify({'teams': all_teams})

def generate_unique_teams(team1_players, team2_players, team_composition, fix_players, cap_vc_choices, groups, contest_size):
    all_players = team1_players + team2_players
    teams = []
    max_attempts = contest_size * 10  # Limit attempts to avoid infinite loop
    attempts = 0
    
    # Convert selection percentage to probability
    for player in all_players:
        player['selection_prob'] = float(player['selection_percentage']) / 100
    
    # Get fixed players
    fixed_players = [p for p in all_players if p['name'] in fix_players]
    remaining_slots = 11 - len(fixed_players)
    
    while len(teams) < contest_size and attempts < max_attempts:
        team = generate_single_team(
            team1_players,
            team2_players,
            team_composition,
            fixed_players,
            remaining_slots,
            cap_vc_choices,
            groups
        )
        
        if team and is_unique_team(team, teams):
            teams.append(team)
        attempts += 1
    
    return teams[:contest_size]

def generate_single_team(team1_players, team2_players, composition, fixed_players, remaining_slots, cap_vc_choices, group_constraints):
    try:
        # Initialize team with fixed players
        team = fixed_players.copy()
        if len(team) > 11:
            return None  # Return None if fixed players already exceed 11
            
        available_players = [p for p in team1_players + team2_players if p not in fixed_players]
        
        # Handle group constraints first
        for group in group_constraints:
            if len(team) >= 11:  # Check if team is already full
                break
                
            group_players = [p for p in available_players if p['name'] in group['players']]
            if not group_players:
                continue
                
            # Calculate remaining slots
            slots_left = 11 - len(team)
            
            # Adjust count based on available slots and group constraints
            min_count = min(group['min'], len(group_players), slots_left)
            max_count = min(group['max'], len(group_players), slots_left)
            
            if min_count > max_count:
                continue
                
            count = random.randint(min_count, max_count)
            if count > 0:
                # Filter valid players based on team composition
                valid_group_players = [
                    p for p in group_players 
                    if validate_player_addition(team, p, composition)
                ]
                
                if len(valid_group_players) < count:
                    continue
                    
                selected = random.sample(valid_group_players, count)
                team.extend(selected)
                available_players = [p for p in available_players if p not in selected]
        
        # Fill remaining slots while respecting team composition
        max_attempts = 100  # Increased max attempts
        attempts = 0
        
        while len(team) < 11 and attempts < max_attempts:
            role_counts = count_roles(team)
            remaining = 11 - len(team)
            
            # Prioritize roles that haven't met minimum requirements
            priority_roles = []
            if role_counts['WK'] < composition.get('min_wk', 0):
                priority_roles.append('WK')
            if role_counts['BAT'] < composition.get('min_bat', 0):
                priority_roles.append('BAT')
            if role_counts['ALL'] < composition.get('min_all', 0):
                priority_roles.append('ALL')
            if role_counts['BOWL'] < composition.get('min_bowl', 0):
                priority_roles.append('BOWL')
            
            valid_roles = priority_roles if priority_roles else get_valid_roles(role_counts, composition)
            
            if not valid_roles:
                return None
            
            valid_players = [
                p for p in available_players 
                if p['role'] in valid_roles and validate_player_addition(team, p, composition)
            ]
            
            if not valid_players:
                return None
            
            # Prioritize players from roles that need minimum requirements
            if priority_roles:
                priority_players = [p for p in valid_players if p['role'] in priority_roles]
                if priority_players:
                    valid_players = priority_players
            
            player = random.choice(valid_players)
            team.append(player)
            available_players.remove(player)
            attempts += 1
        
        # Verify final team size and composition
        if len(team) != 11:
            return None
            
        # Verify minimum requirements are met
        final_counts = count_roles(team)
        if (final_counts['WK'] < composition.get('min_wk', 0) or
            final_counts['BAT'] < composition.get('min_bat', 0) or
            final_counts['ALL'] < composition.get('min_all', 0) or
            final_counts['BOWL'] < composition.get('min_bowl', 0)):
            return None
        
        # Select captain and vice-captain
        possible_caps = [p for p in team if p['name'] in cap_vc_choices] if cap_vc_choices else team
        if not possible_caps:
            possible_caps = team
            
        captain = random.choice(possible_caps)
        possible_vcs = [p for p in possible_caps if p != captain]
        if not possible_vcs:
            possible_vcs = [p for p in team if p != captain]
        vice_captain = random.choice(possible_vcs)
        
        return {
            'players': team,
            'captain': captain['name'],
            'vice_captain': vice_captain['name']
        }
    except Exception as e:
        print(f"Error generating team: {str(e)}")
        return None

def count_roles(team):
    return {
        'WK': len([p for p in team if p['role'] == 'WK']),
        'BAT': len([p for p in team if p['role'] == 'BAT']),
        'ALL': len([p for p in team if p['role'] == 'ALL']),
        'BOWL': len([p for p in team if p['role'] == 'BOWL'])
    }

def get_valid_roles(current_counts, composition):
    valid_roles = []
    if current_counts['WK'] < composition['max_wk']:
        valid_roles.append('WK')
    if current_counts['BAT'] < composition['max_bat']:
        valid_roles.append('BAT')
    if current_counts['ALL'] < composition['max_all']:
        valid_roles.append('ALL')
    if current_counts['BOWL'] < composition['max_bowl']:
        valid_roles.append('BOWL')
    return valid_roles

def validate_player_addition(current_team, player, composition):
    # First check if adding this player would exceed 11 players
    if len(current_team) >= 11:
        return False
        
    # Count current roles
    role_count = count_roles(current_team)
    remaining_slots = 11 - len(current_team) - 1  # -1 because we're checking for adding this player
    
    # Check if we can still meet minimum requirements for all roles after adding this player
    min_wk_needed = max(0, composition.get('min_wk', 0) - role_count['WK'])
    min_bat_needed = max(0, composition.get('min_bat', 0) - role_count['BAT'])
    min_all_needed = max(0, composition.get('min_all', 0) - role_count['ALL'])
    min_bowl_needed = max(0, composition.get('min_bowl', 0) - role_count['BOWL'])
    
    # If this player's role matches one of the minimum needs, don't count it in total_min_needed
    total_min_needed = min_wk_needed + min_bat_needed + min_all_needed + min_bowl_needed
    if player['role'] == 'WK':
        total_min_needed = max(0, total_min_needed - 1)
    elif player['role'] == 'BAT':
        total_min_needed = max(0, total_min_needed - 1)
    elif player['role'] == 'ALL':
        total_min_needed = max(0, total_min_needed - 1)
    elif player['role'] == 'BOWL':
        total_min_needed = max(0, total_min_needed - 1)
    
    # Check if we have enough slots left to meet minimum requirements
    if total_min_needed > remaining_slots:
        return False
    
    # Check role limits
    if player['role'] == 'WK':
        if role_count['WK'] >= composition['max_wk']:
            return False
    elif player['role'] == 'BAT':
        if role_count['BAT'] >= composition['max_bat']:
            return False
    elif player['role'] == 'ALL':
        if role_count['ALL'] >= composition['max_all']:
            return False
    elif player['role'] == 'BOWL':
        if role_count['BOWL'] >= composition['max_bowl']:
            return False
    
    # Check team balance (max 7 from one team)
    team1_count = len([p for p in current_team if p['team'] == 'team1'])
    team2_count = len([p for p in current_team if p['team'] == 'team2'])
    
    if player['team'] == 'team1' and team1_count >= 7:
        return False
    if player['team'] == 'team2' and team2_count >= 7:
        return False
    
    return True

def is_unique_team(new_team, existing_teams):
    new_players = set(p['name'] for p in new_team['players'])
    for team in existing_teams:
        existing_players = set(p['name'] for p in team['players'])
        if new_players == existing_players:
            return False
    return True

if __name__ == '__main__':
    app.run(debug=True)
