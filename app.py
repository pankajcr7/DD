from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
import random
import itertools
import json
import os
import math
from dotenv import load_dotenv
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User
from datetime import datetime

load_dotenv()  # Load environment variables from .env file

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///users.db')
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Initialize SQLAlchemy
db.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def initialize_database():
    with app.app_context():
        # Create tables only if they don't exist
        if not os.path.exists('users.db'):
            db.create_all()
            create_admin_user()
            print("Database initialized successfully")
        else:
            print("Database already exists")

def create_admin_user():
    admin_email = "thakurpankaj726@gmail.com"
    try:
        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            admin = User(
                username="admin",
                email=admin_email,
                is_admin=True,
                is_active=True
            )
            admin.set_password("Ipfwcr@7")
            db.session.add(admin)
            db.session.commit()
            print("Admin user created successfully")
        else:
            print("Admin user already exists")
    except Exception as e:
        print(f"Error creating admin user: {str(e)}")

# Initialize database
initialize_database()

# Create data directory if it doesn't exist
DATA_DIR = 'user_data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def get_user_data_file(user_id, sport):
    return os.path.join(DATA_DIR, f'user_{user_id}_{sport}.json')

def save_data(data, sport):
    if not current_user.is_authenticated:
        return False
    try:
        user_file = get_user_data_file(current_user.id, sport)
        with open(user_file, 'w') as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving data for user {current_user.id}, sport {sport}: {str(e)}")
        return False

def load_data(sport):
    if not current_user.is_authenticated:
        return {}
    try:
        user_file = get_user_data_file(current_user.id, sport)
        if os.path.exists(user_file):
            with open(user_file, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading data for user {current_user.id}, sport {sport}: {str(e)}")
    return {}

def check_trial_access():
    if not current_user.is_authenticated:
        return redirect(url_for('login'))
    if not current_user.is_admin and current_user.is_trial_expired():
        return render_template('trial_expired.html')
    return None

@app.route('/')
@login_required
def index():
    trial_check = check_trial_access()
    if trial_check:
        return trial_check
    return render_template('index.html')

@app.route('/load_saved_data')
@login_required
def load_saved_data():
    trial_check = check_trial_access()
    if trial_check:
        return jsonify({'status': 'error', 'message': 'Trial expired'})
    sport = request.args.get('sport', 'cricket')
    data = load_data(sport)
    return jsonify(data)

@app.route('/save_data', methods=['POST'])
@login_required
def save_data_route():
    try:
        data = request.get_json()
        sport = data.get('sport', 'cricket')
        if save_data(data, sport):
            return jsonify({'status': 'success', 'message': 'Data saved successfully'})
        return jsonify({'status': 'error', 'message': 'Failed to save data'})
    except Exception as e:
        print(f"Error in save_data_route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)})

def validate_data(team1_players, team2_players, team_composition, fix_players, contest_size, sport, required_team_size):
    """Validate input data before generating teams"""
    if len(team1_players) < required_team_size:
        return False, f"Team 1 must have {required_team_size} players"
    if len(team2_players) < required_team_size:
        return False, f"Team 2 must have {required_team_size} players"
    if not contest_size or contest_size < 1:
        return False, "Contest size must be at least 1"
    
    # Validate team composition based on sport
    if sport == 'cricket':
        if not all(key in team_composition for key in ['min_wk', 'max_wk', 'min_bat', 'max_bat', 'min_all', 'max_all', 'min_bowl', 'max_bowl']):
            return False, "Invalid cricket team composition"
    elif sport == 'football':
        if not all(key in team_composition for key in ['min_gk', 'max_gk', 'min_def', 'max_def', 'min_mid', 'max_mid', 'min_st', 'max_st']):
            return False, "Invalid football team composition"
    elif sport == 'kabaddi':
        if not all(key in team_composition for key in ['min_kdef', 'max_kdef', 'min_kall', 'max_kall', 'min_krai', 'max_krai']):
            return False, "Invalid kabaddi team composition"
    
    # Validate fixed players
    if len(fix_players) > math.floor(required_team_size * 0.7):
        return False, f"Maximum {math.floor(required_team_size * 0.7)} fixed players allowed"
    
    return True, ""

@app.route('/generate_teams', methods=['POST'])
@login_required
def generate_teams():
    trial_check = check_trial_access()
    if trial_check:
        return trial_check
        
    try:
        data = request.get_json()
        
        # Validate input data
        sport = data.get('sport', 'cricket')
        required_team_size = int(data.get('required_team_size', 11))
        
        is_valid, error_message = validate_data(
            data['team1_players'],
            data['team2_players'],
            data['team_composition'],
            data.get('fix_players', []),
            int(data['contest_size']),
            sport,
            required_team_size
        )
        
        if not is_valid:
            return jsonify({
                'status': 'error',
                'message': error_message
            }), 400
        
        # Generate teams
        teams = generate_unique_teams(
            data['team1_players'],
            data['team2_players'],
            data['team_composition'],
            data.get('fix_players', []),
            data.get('cap_vc_choices', []),
            data.get('groups', []),
            int(data['contest_size']),
            sport,
            required_team_size
        )
        
        if not teams:
            return jsonify({
                'status': 'error',
                'message': 'Could not generate valid teams with given constraints'
            }), 400
        
        # Save the generated teams with timestamp
        user_data = {
            'sport': sport,
            'team1_players': data['team1_players'],
            'team2_players': data['team2_players'],
            'team_composition': data['team_composition'],
            'fix_players': data.get('fix_players', []),
            'cap_vc_choices': data.get('cap_vc_choices', []),
            'groups': data.get('groups', []),
            'contest_size': data['contest_size'],
            'generated_teams': teams,
            'last_generated': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        save_data(user_data, sport)
        
        return jsonify({
            'status': 'success',
            'teams': teams
        })
        
    except Exception as e:
        print(f"Error generating teams: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def generate_unique_teams(team1_players, team2_players, team_composition, fix_players, cap_vc_choices, groups, contest_size, sport, required_team_size):
    all_players = team1_players + team2_players
    teams = []
    attempts = 0
    max_attempts = 10000  # Limit attempts to avoid infinite loop
    
    # Convert fix_players from names to full player objects
    fixed_players = [p for p in all_players if p['name'] in fix_players]
    
    # Validate fixed players composition
    fixed_counts = count_roles(fixed_players, sport)
    for role, count in fixed_counts.items():
        role_key = role.lower()
        if sport == 'kabaddi' and role.startswith('K'):
            role_key = role[1:].lower()  # Remove 'K' prefix for kabaddi roles
        max_key = f'max_{role_key}'
        if max_key in team_composition and count > team_composition[max_key]:
            print(f"Fixed players exceed maximum allowed for role {role}: {count} > {team_composition[max_key]}")
            return []
    
    # Get available players (excluding fixed players)
    available_players = [p for p in all_players if p not in fixed_players]
    
    # First generate all possible combinations of remaining slots
    remaining_slots = required_team_size - len(fixed_players)
    all_combinations = list(itertools.combinations(available_players, remaining_slots))
    
    # Shuffle combinations to get random teams each time
    random.shuffle(all_combinations)
    
    # Apply rules to each combination
    for combo in all_combinations:
        if len(teams) >= contest_size:
            break
            
        if attempts >= max_attempts:
            print("Maximum attempts reached without finding enough valid teams")
            break
            
        attempts += 1
        
        # Create potential team with fixed players + combination
        potential_team = fixed_players + list(combo)
        
        # Validate team composition
        counts = count_roles(potential_team, sport)
        if not validate_team_composition(counts, team_composition, sport):
            continue
            
        # Validate group constraints
        valid_groups = True
        if groups:
            for group in groups:
                group_players = [p['name'] for p in potential_team if p['name'] in group['players']]
                if not (group['min'] <= len(group_players) <= group['max']):
                    valid_groups = False
                    break
        
        if not valid_groups:
            continue
            
        # Validate team balance (not too many from one team)
        team1_count = len([p for p in potential_team if p['team'] == 'team1'])
        team2_count = len([p for p in potential_team if p['team'] == 'team2'])
        if team1_count > 7 or team2_count > 7:
            continue
            
        # If all validations pass, assign captain and vice-captain
        if cap_vc_choices:
            valid_caps = [p for p in potential_team if p['name'] in cap_vc_choices]
            if len(valid_caps) < 2:
                continue
            cap, vc = random.sample(valid_caps, 2)
        else:
            cap, vc = random.sample(potential_team, 2)
            
        final_team = {
            'players': potential_team,
            'captain': cap['name'],
            'vice_captain': vc['name']
        }
        
        # Check if this team is unique
        if is_unique_team(final_team, teams):
            teams.append(final_team)
    
    if len(teams) < contest_size:
        print(f"Could only generate {len(teams)} teams out of requested {contest_size}")
        
    return teams

def count_roles(team, sport):
    counts = {
        'WK': 0, 'BAT': 0, 'ALL': 0, 'BOWL': 0,  # Cricket
        'GK': 0, 'DEF': 0, 'MID': 0, 'ST': 0,    # Football
        'KDEF': 0, 'KALL': 0, 'KRAI': 0          # Kabaddi
    }
    
    for player in team:
        role = player['role']
        if sport == 'kabaddi':
            # Map kabaddi roles to their internal names
            if role == 'DEF':
                counts['KDEF'] += 1
            elif role == 'ALL':
                counts['KALL'] += 1
            elif role == 'RAI':
                counts['KRAI'] += 1
        else:
            counts[role] += 1
    
    return counts

def get_valid_roles(current_counts, composition, sport, required_team_size):
    valid_roles = []
    
    if sport == 'cricket':
        if current_counts['WK'] < composition['max_wk']:
            valid_roles.append('WK')
        if current_counts['BAT'] < composition['max_bat']:
            valid_roles.append('BAT')
        if current_counts['ALL'] < composition['max_all']:
            valid_roles.append('ALL')
        if current_counts['BOWL'] < composition['max_bowl']:
            valid_roles.append('BOWL')
    elif sport == 'football':
        if current_counts['GK'] < composition['max_gk']:
            valid_roles.append('GK')
        if current_counts['DEF'] < composition['max_def']:
            valid_roles.append('DEF')
        if current_counts['MID'] < composition['max_mid']:
            valid_roles.append('MID')
        if current_counts['ST'] < composition['max_st']:
            valid_roles.append('ST')
    else:  # kabaddi
        if current_counts['KDEF'] < composition['max_kdef']:
            valid_roles.append('DEF')
        if current_counts['KALL'] < composition['max_kall']:
            valid_roles.append('ALL')
        if current_counts['KRAI'] < composition['max_krai']:
            valid_roles.append('RAI')
    
    return valid_roles

def validate_player_addition(current_team, player, composition, sport, required_team_size):
    role_counts = count_roles(current_team, sport)
    
    # Check if adding the player exceeds the required team size
    if len(current_team) + 1 > required_team_size:
        return False
    
    if sport == 'cricket':
        if player['role'] == 'WK' and role_counts['WK'] >= composition['max_wk']:
            return False
        if player['role'] == 'BAT' and role_counts['BAT'] >= composition['max_bat']:
            return False
        if player['role'] == 'ALL' and role_counts['ALL'] >= composition['max_all']:
            return False
        if player['role'] == 'BOWL' and role_counts['BOWL'] >= composition['max_bowl']:
            return False
    elif sport == 'football':
        if player['role'] == 'GK' and role_counts['GK'] >= composition['max_gk']:
            return False
        if player['role'] == 'DEF' and role_counts['DEF'] >= composition['max_def']:
            return False
        if player['role'] == 'MID' and role_counts['MID'] >= composition['max_mid']:
            return False
        if player['role'] == 'ST' and role_counts['ST'] >= composition['max_st']:
            return False
    else:  # kabaddi
        if player['role'] == 'DEF' and role_counts['KDEF'] >= composition['max_kdef']:
            return False
        if player['role'] == 'ALL' and role_counts['KALL'] >= composition['max_kall']:
            return False
        if player['role'] == 'RAI' and role_counts['KRAI'] >= composition['max_krai']:
            return False
    
    return True

def validate_team_composition(counts, composition, sport):
    if sport == 'cricket':
        # Check both minimum and maximum constraints
        return (
            composition['min_wk'] <= counts['WK'] <= composition['max_wk'] and
            composition['min_bat'] <= counts['BAT'] <= composition['max_bat'] and
            composition['min_all'] <= counts['ALL'] <= composition['max_all'] and
            composition['min_bowl'] <= counts['BOWL'] <= composition['max_bowl']
        )
    elif sport == 'football':
        return (
            composition['min_gk'] <= counts['GK'] <= composition['max_gk'] and
            composition['min_def'] <= counts['DEF'] <= composition['max_def'] and
            composition['min_mid'] <= counts['MID'] <= composition['max_mid'] and
            composition['min_st'] <= counts['ST'] <= composition['max_st']
        )
    else:  # kabaddi
        return (
            composition['min_kdef'] <= counts['KDEF'] <= composition['max_kdef'] and
            composition['min_kall'] <= counts['KALL'] <= composition['max_kall'] and
            composition['min_krai'] <= counts['KRAI'] <= composition['max_krai']
        )

def is_unique_team(new_team, existing_teams):
    new_players = set(p['name'] for p in new_team['players'])
    new_captain = new_team['captain']
    new_vice_captain = new_team['vice_captain']
    
    for team in existing_teams:
        team_players = set(p['name'] for p in team['players'])
        if (team_players == new_players and
            team['captain'] == new_captain and
            team['vice_captain'] == new_vice_captain):
            return False
    return True

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Try finding user by username
        user = User.query.filter_by(username=username).first()
        if not user:
            # If username not found, try email
            user = User.query.filter_by(email=username).first()
        
        if user and user.check_password(password):
            # Check if user's trial is expired (skip check for admin)
            if not user.is_admin and user.is_trial_expired():
                flash('Your trial period has expired. Please contact the administrator.')
                return redirect(url_for('login'))
            
            # Check if user is active
            if not user.is_active:
                flash('Your account has been deactivated. Please contact the administrator.')
                return redirect(url_for('login'))
            
            login_user(user)
            if user.is_admin:
                return redirect(url_for('admin_dashboard'))
            return redirect(url_for('index'))
            
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Check if passwords match
        if password != confirm_password:
            flash('Passwords do not match')
            return redirect(url_for('register'))
        
        # Check if username exists
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('register'))
            
        # Check if email exists
        if User.query.filter_by(email=email).first():
            flash('Email already registered')
            return redirect(url_for('register'))
        
        try:
            # Create new user with trial period
            user = User(
                username=username,
                email=email,
                is_admin=False,
                is_active=True,
                trial_days=7  # Default 7-day trial
            )
            user.set_password(password)
            
            # Add and commit to database
            db.session.add(user)
            db.session.commit()
            
            # Log the user in
            login_user(user)
            flash('Registration successful! Your 7-day trial has started.')
            return redirect(url_for('index'))
            
        except Exception as e:
            db.session.rollback()
            flash('An error occurred during registration. Please try again.')
            print(f"Registration error: {str(e)}")
            return redirect(url_for('register'))
            
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

def get_user_teams_data():
    """Get all users' team generation data"""
    user_teams_data = []
    try:
        users = User.query.all()
        for user in users:
            if not user.is_admin:  # Skip admin users
                for sport in ['cricket', 'football', 'kabaddi']:
                    user_file = get_user_data_file(user.id, sport)
                    if os.path.exists(user_file):
                        try:
                            with open(user_file, 'r') as f:
                                data = json.load(f)
                                if 'generated_teams' in data:
                                    user_teams_data.append({
                                        'user_id': user.id,
                                        'username': user.username,
                                        'sport': sport,
                                        'team_count': len(data['generated_teams']),
                                        'last_generated': data.get('last_generated', 'Unknown')
                                    })
                        except Exception as e:
                            print(f"Error reading teams for user {user.id}, sport {sport}: {str(e)}")
    except Exception as e:
        print(f"Error getting user teams data: {str(e)}")
    return user_teams_data

@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    if not current_user.is_admin:
        flash('Access denied')
        return redirect(url_for('index'))
    
    users = User.query.filter(User.id != current_user.id).all()
    user_teams_data = get_user_teams_data()
    
    return render_template('admin_dashboard.html', 
                         users=users,
                         user_teams_data=user_teams_data)

@app.route('/admin/user_teams/<user_id>/<sport>')
@login_required
def get_user_teams(user_id, sport):
    if not current_user.is_admin:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        data_file = get_user_data_file(user_id, sport)
        if os.path.exists(data_file):
            with open(data_file, 'r') as f:
                data = json.load(f)
                if 'generated_teams' in data:
                    teams = []
                    for team in data['generated_teams']:
                        teams.append({
                            'captain': team['captain'],
                            'vice_captain': team['vice_captain'],
                            'players': [p['name'] for p in team['players']]
                        })
                    return jsonify({'teams': teams})
        return jsonify({'teams': []})
    except Exception as e:
        print(f"Error getting user teams: {str(e)}")
        return jsonify({'error': 'Failed to load teams'}), 500

@app.route('/admin/update_trial/<int:user_id>', methods=['POST'])
@login_required
def update_trial(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    user = User.query.get_or_404(user_id)
    days = request.form.get('trial_days', type=int)
    
    if days is not None:
        user.set_trial_period(days)
        db.session.commit()
        return jsonify({'message': 'Trial period updated successfully'})
    return jsonify({'error': 'Invalid trial days'}), 400

@app.route('/admin/toggle_user/<int:user_id>', methods=['POST'])
@login_required
def toggle_user(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({'message': 'User status updated successfully'})

if __name__ == '__main__':
    app.run(debug=True)
