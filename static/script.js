let groupCounter = 0;
let currentSport = 'cricket';

// Load saved data when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get the sport from URL parameter or default to cricket
    const urlParams = new URLSearchParams(window.location.search);
    const sport = urlParams.get('sport') || 'cricket';
    
    // Set the sport selector to the current sport
    document.getElementById('sport_selector').value = sport;
    currentSport = sport;
    
    // Show the correct sport section
    changeSport(false); // false means don't reload data
    
    // Load the data for the current sport
    loadSavedData();
});

function changeSport(reloadData = true) {
    currentSport = document.getElementById('sport_selector').value;
    
    // Update URL with current sport
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('sport', currentSport);
    window.history.pushState({}, '', newUrl);
    
    // Hide all sport sections
    document.querySelector('.cricket-section').style.display = 'none';
    document.querySelector('.football-section').style.display = 'none';
    document.querySelector('.kabaddi-section').style.display = 'none';
    
    // Show selected sport section
    document.querySelector('.' + currentSport + '-section').style.display = 'block';
    
    // Update player role options
    updatePlayerRoleOptions();
    
    // Update team size constraints
    updateTeamSizeConstraints();
    
    // Load data for the new sport
    if (reloadData) {
        loadSavedData();
    }
}

function updatePlayerRoleOptions() {
    const team1Players = document.querySelectorAll('#team1_players .player-input');
    const team2Players = document.querySelectorAll('#team2_players .player-input');
    
    const roleOptions = {
        cricket: [
            '<option value="WK">Wicket Keeper (WK)</option>',
            '<option value="BAT">Batsman (BAT)</option>',
            '<option value="ALL">All Rounder (ALL)</option>',
            '<option value="BOWL">Bowler (BOWL)</option>'
        ],
        football: [
            '<option value="GK">Goalkeeper (GK)</option>',
            '<option value="DEF">Defender (DEF)</option>',
            '<option value="MID">Midfielder (MID)</option>',
            '<option value="ST">Striker (ST)</option>'
        ],
        kabaddi: [
            '<option value="DEF">Defender (DEF)</option>',
            '<option value="ALL">All-Rounder (ALL)</option>',
            '<option value="RAI">Raider (RAI)</option>'
        ]
    };
    
    const options = roleOptions[currentSport].join('');
    
    team1Players.forEach(player => {
        player.querySelector('select').innerHTML = options;
    });
    
    team2Players.forEach(player => {
        player.querySelector('select').innerHTML = options;
    });
}

function updateTeamSizeConstraints() {
    if (currentSport === 'kabaddi') {
        const teamSize = document.getElementById('kabaddi_team_size').value;
        // Update min/max player counts based on team size
        document.getElementById('min_kdef').max = Math.floor(teamSize / 2);
        document.getElementById('max_kdef').max = Math.floor(teamSize / 2);
        document.getElementById('min_kall').max = Math.floor(teamSize / 3);
        document.getElementById('max_kall').max = Math.floor(teamSize / 3);
        document.getElementById('min_krai').max = Math.floor(teamSize / 2);
        document.getElementById('max_krai').max = Math.floor(teamSize / 2);
    }
}

// Function to load saved data
function loadSavedData() {
    const sport = document.getElementById('sport_selector').value;
    fetch(`/load_saved_data?sport=${sport}`)
        .then(response => response.json())
        .then(data => {
            if (Object.keys(data).length === 0) return;

            // Load team names
            document.getElementById('team1_name').value = data.team1_name || '';
            document.getElementById('team2_name').value = data.team2_name || '';

            // Load team 1 players
            const team1Container = document.getElementById('team1_players');
            team1Container.innerHTML = '';
            if (data.team1_players) {
                data.team1_players.forEach(player => {
                    addPlayerWithData('team1_players', player);
                });
            }

            // Load team 2 players
            const team2Container = document.getElementById('team2_players');
            team2Container.innerHTML = '';
            if (data.team2_players) {
                data.team2_players.forEach(player => {
                    addPlayerWithData('team2_players', player);
                });
            }

            // Load team composition based on sport
            if (data.team_composition) {
                if (sport === 'cricket') {
                    document.getElementById('min_wk').value = data.team_composition.min_wk || 1;
                    document.getElementById('max_wk').value = data.team_composition.max_wk || 4;
                    document.getElementById('min_bat').value = data.team_composition.min_bat || 1;
                    document.getElementById('max_bat').value = data.team_composition.max_bat || 6;
                    document.getElementById('min_all').value = data.team_composition.min_all || 1;
                    document.getElementById('max_all').value = data.team_composition.max_all || 6;
                    document.getElementById('min_bowl').value = data.team_composition.min_bowl || 1;
                    document.getElementById('max_bowl').value = data.team_composition.max_bowl || 6;
                } else if (sport === 'football') {
                    document.getElementById('min_gk').value = data.team_composition.min_gk || 1;
                    document.getElementById('max_gk').value = data.team_composition.max_gk || 1;
                    document.getElementById('min_def').value = data.team_composition.min_def || 3;
                    document.getElementById('max_def').value = data.team_composition.max_def || 5;
                    document.getElementById('min_mid').value = data.team_composition.min_mid || 3;
                    document.getElementById('max_mid').value = data.team_composition.max_mid || 5;
                    document.getElementById('min_st').value = data.team_composition.min_st || 1;
                    document.getElementById('max_st').value = data.team_composition.max_st || 3;
                } else if (sport === 'kabaddi') {
                    document.getElementById('min_kdef').value = data.team_composition.min_kdef || 2;
                    document.getElementById('max_kdef').value = data.team_composition.max_kdef || 4;
                    document.getElementById('min_kall').value = data.team_composition.min_kall || 2;
                    document.getElementById('max_kall').value = data.team_composition.max_kall || 3;
                    document.getElementById('min_krai').value = data.team_composition.min_krai || 2;
                    document.getElementById('max_krai').value = data.team_composition.max_krai || 3;
                    document.getElementById('kabaddi_team_size').value = data.kabaddi_team_size || 7;
                }
            }

            // Load groups
            const groupsContainer = document.getElementById('groups');
            groupsContainer.innerHTML = '';
            if (data.groups) {
                data.groups.forEach(group => {
                    addGroupWithData(group);
                });
            }

            // Update fix players and cap/vc choices
            updateFixPlayersAndCapVC();

            // Check previously selected fix players and cap/vc choices
            if (data.fix_players) {
                data.fix_players.forEach(player => {
                    const checkbox = document.querySelector(`#fix_players input[value="${player}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            if (data.cap_vc_choices) {
                data.cap_vc_choices.forEach(player => {
                    const checkbox = document.querySelector(`#cap_vc_choices input[value="${player}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            // Load contest size
            if (data.contest_size) {
                document.getElementById('contest_size').value = data.contest_size;
            }
        });
}

// Function to add player with existing data
function addPlayerWithData(containerId, playerData) {
    const container = document.getElementById(containerId);
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-input row mb-2';
    
    playerDiv.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="Player Name" value="${playerData.name || ''}" required>
        </div>
        <div class="col-md-3">
            <select class="form-control" required>
                ${currentSport === 'cricket' ? `
                    <option value="WK" ${playerData.role === 'WK' ? 'selected' : ''}>Wicket Keeper (WK)</option>
                    <option value="BAT" ${playerData.role === 'BAT' ? 'selected' : ''}>Batsman (BAT)</option>
                    <option value="ALL" ${playerData.role === 'ALL' ? 'selected' : ''}>All Rounder (ALL)</option>
                    <option value="BOWL" ${playerData.role === 'BOWL' ? 'selected' : ''}>Bowler (BOWL)</option>
                ` : currentSport === 'football' ? `
                    <option value="GK" ${playerData.role === 'GK' ? 'selected' : ''}>Goalkeeper (GK)</option>
                    <option value="DEF" ${playerData.role === 'DEF' ? 'selected' : ''}>Defender (DEF)</option>
                    <option value="MID" ${playerData.role === 'MID' ? 'selected' : ''}>Midfielder (MID)</option>
                    <option value="ST" ${playerData.role === 'ST' ? 'selected' : ''}>Striker (ST)</option>
                ` : `
                    <option value="DEF" ${playerData.role === 'DEF' ? 'selected' : ''}>Defender (DEF)</option>
                    <option value="ALL" ${playerData.role === 'ALL' ? 'selected' : ''}>All-Rounder (ALL)</option>
                    <option value="RAI" ${playerData.role === 'RAI' ? 'selected' : ''}>Raider (RAI)</option>
                `}
            </select>
        </div>
        <div class="col-md-3">
            <button class="btn btn-danger" onclick="this.parentElement.parentElement.remove(); saveCurrentData()">
                Remove
            </button>
        </div>
    `;
    
    container.appendChild(playerDiv);
}

// Function to add group with existing data
function addGroupWithData(groupData) {
    if (groupCounter >= 10) {
        alert('Maximum 10 groups allowed');
        return;
    }

    const container = document.getElementById('groups');
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-input mb-3 p-3 border rounded';
    
    groupDiv.innerHTML = `
        <h5><i class="fas fa-layer-group"></i> Group ${groupCounter + 1}</h5>
        <div class="row mb-2">
            <div class="col-md-6">
                <label><i class="fas fa-minus-circle"></i> Min Players</label>
                <input type="number" class="form-control group-min" min="0" max="11" value="${groupData.min || 0}" required>
            </div>
            <div class="col-md-6">
                <label><i class="fas fa-plus-circle"></i> Max Players</label>
                <input type="number" class="form-control group-max" min="0" max="11" value="${groupData.max || 0}" required>
            </div>
        </div>
        <div class="selected-players mb-2">
            ${groupData.players ? groupData.players.map(player => 
                `<span class="selected-player">
                    <i class="fas fa-user"></i> ${player}
                </span>`
            ).join('') : ''}
        </div>
        <button class="btn btn-primary btn-sm me-2" onclick="togglePlayerSelection(this)">
            <i class="fas fa-user-plus"></i> Select Players
        </button>
        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); updateGroupCounter(); saveCurrentData()">
            <i class="fas fa-trash"></i> Remove Group
        </button>
    `;
    
    container.appendChild(groupDiv);
    groupCounter++;
}

// Function to add player to a team
function addPlayer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const playerInput = document.createElement('div');
    playerInput.className = 'player-input mb-2';
    playerInput.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Player Name">
            </div>
            <div class="col-md-4">
                <select class="form-control">
                    <option value="">Select Role</option>
                </select>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-danger btn-sm" onclick="removePlayer(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    container.appendChild(playerInput);
    updatePlayerRoleOptions();
    saveCurrentData();
}

// Function to remove a player
function removePlayer(button) {
    const playerDiv = button.closest('.player-input');
    if (playerDiv) {
        playerDiv.remove();
        updateFixPlayersAndCapVC();
        saveCurrentData();
    }
}

// Function to save current data
function saveCurrentData() {
    const data = {
        sport: currentSport,
        team1_name: document.getElementById('team1_name').value,
        team2_name: document.getElementById('team2_name').value,
        team1_players: Array.from(document.querySelectorAll('#team1_players .player-input')).map(div => ({
            name: div.querySelector('input[type="text"]').value,
            role: div.querySelector('select').value,
            team: 'team1'
        })).filter(p => p.name.trim() !== ''),
        team2_players: Array.from(document.querySelectorAll('#team2_players .player-input')).map(div => ({
            name: div.querySelector('input[type="text"]').value,
            role: div.querySelector('select').value,
            team: 'team2'
        })).filter(p => p.name.trim() !== '')
    };

    fetch('/save_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
}

// Add event listeners for input changes
document.addEventListener('change', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        saveCurrentData();
    }
});

function addGroup() {
    if (groupCounter >= 10) {
        alert('Maximum 10 groups allowed');
        return;
    }

    const container = document.getElementById('groups');
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group-input mb-3 p-3 border rounded';
    
    groupDiv.innerHTML = `
        <h5><i class="fas fa-layer-group"></i> Group ${groupCounter + 1}</h5>
        <div class="row mb-2">
            <div class="col-md-6">
                <label><i class="fas fa-minus-circle"></i> Min Players</label>
                <input type="number" class="form-control group-min" min="0" max="11" required>
            </div>
            <div class="col-md-6">
                <label><i class="fas fa-plus-circle"></i> Max Players</label>
                <input type="number" class="form-control group-max" min="0" max="11" required>
            </div>
        </div>
        <div class="selected-players mb-2"></div>
        <button class="btn btn-primary btn-sm me-2" onclick="togglePlayerSelection(this)">
            <i class="fas fa-user-plus"></i> Select Players
        </button>
        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove(); updateGroupCounter(); saveCurrentData()">
            <i class="fas fa-trash"></i> Remove Group
        </button>
    `;
    
    container.appendChild(groupDiv);
    groupCounter++;
}

function updateGroupCounter() {
    groupCounter--;
}

function togglePlayerSelection(button) {
    const existingModal = document.getElementById('playerSelectionModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'playerSelectionModal';
    modal.className = 'modal fade show';
    modal.style.display = 'block';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';

    const players = getAllPlayers();
    const selectedPlayersDiv = button.parentElement.querySelector('.selected-players');
    const currentlySelected = Array.from(selectedPlayersDiv.querySelectorAll('.selected-player'))
        .map(p => p.textContent.trim());

    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-users"></i> Select Players</h5>
                    <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        ${players.map(player => `
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${player}"
                                        ${currentlySelected.includes(player) ? 'checked' : ''}>
                                    <label class="form-check-label">${player}</label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="saveSelectedPlayers(this)">
                        <i class="fas fa-save"></i> Save Selection
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function saveSelectedPlayers(button) {
    const modal = button.closest('.modal');
    const selectedPlayers = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    const groupDiv = document.querySelector('.group-input:last-child');
    const selectedPlayersDiv = groupDiv.querySelector('.selected-players');
    
    selectedPlayersDiv.innerHTML = selectedPlayers.map(player => `
        <span class="selected-player">
            <i class="fas fa-user"></i> ${player}
        </span>
    `).join('');
    
    modal.remove();
    saveCurrentData();
}

function getAllPlayers() {
    const players = [];
    document.querySelectorAll('#team1_players .player-input, #team2_players .player-input').forEach(div => {
        const name = div.querySelector('input[type="text"]').value;
        if (name) players.push(name);
    });
    return players;
}

function updateFixPlayersAndCapVC() {
    const players = getAllPlayers();
    
    // Update Fix Players section
    const fixPlayersDiv = document.getElementById('fix_players');
    fixPlayersDiv.innerHTML = players.map(player => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${player}">
            <label class="form-check-label">${player}</label>
        </div>
    `).join('');
    
    // Update Cap/VC section
    const capVcDiv = document.getElementById('cap_vc_choices');
    capVcDiv.innerHTML = players.map(player => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${player}">
            <label class="form-check-label">${player}</label>
        </div>
    `).join('');
}

function generateTeams() {
    // Show loading spinner
    document.getElementById('loading').style.display = 'flex';
    
    // Get current sport
    const sport = document.getElementById('sport_selector').value;
    
    // Get kabaddi team size if sport is kabaddi
    let kabaddi_team_size = 7;
    if (sport === 'kabaddi') {
        kabaddi_team_size = parseInt(document.getElementById('kabaddi_team_size').value) || 7;
    }
    
    // Collect all data
    const team1_name = document.getElementById('team1_name').value;
    const team2_name = document.getElementById('team2_name').value;
    
    const team1_players = Array.from(document.querySelectorAll('#team1_players .player-input')).map(div => ({
        name: div.querySelector('input[type="text"]').value,
        role: div.querySelector('select').value,
        team: 'team1'
    })).filter(p => p.name.trim() !== '');
    
    const team2_players = Array.from(document.querySelectorAll('#team2_players .player-input')).map(div => ({
        name: div.querySelector('input[type="text"]').value,
        role: div.querySelector('select').value,
        team: 'team2'
    })).filter(p => p.name.trim() !== '');
    
    // Get sport-specific composition
    let team_composition = {};
    if (sport === 'cricket') {
        team_composition = {
            min_wk: parseInt(document.getElementById('min_wk').value),
            max_wk: parseInt(document.getElementById('max_wk').value),
            min_bat: parseInt(document.getElementById('min_bat').value),
            max_bat: parseInt(document.getElementById('max_bat').value),
            min_all: parseInt(document.getElementById('min_all').value),
            max_all: parseInt(document.getElementById('max_all').value),
            min_bowl: parseInt(document.getElementById('min_bowl').value),
            max_bowl: parseInt(document.getElementById('max_bowl').value)
        };
    } else if (sport === 'football') {
        team_composition = {
            min_gk: parseInt(document.getElementById('min_gk').value),
            max_gk: parseInt(document.getElementById('max_gk').value),
            min_def: parseInt(document.getElementById('min_def').value),
            max_def: parseInt(document.getElementById('max_def').value),
            min_mid: parseInt(document.getElementById('min_mid').value),
            max_mid: parseInt(document.getElementById('max_mid').value),
            min_st: parseInt(document.getElementById('min_st').value),
            max_st: parseInt(document.getElementById('max_st').value)
        };
    } else {  // kabaddi
        team_composition = {
            min_kdef: parseInt(document.getElementById('min_kdef').value) || 2,
            max_kdef: parseInt(document.getElementById('max_kdef').value) || 4,
            min_kall: parseInt(document.getElementById('min_kall').value) || 2,
            max_kall: parseInt(document.getElementById('max_kall').value) || 3,
            min_krai: parseInt(document.getElementById('min_krai').value) || 2,
            max_krai: parseInt(document.getElementById('max_krai').value) || 3
        };
    }
    
    const fix_players = Array.from(document.querySelectorAll('#fix_players input:checked')).map(cb => cb.value);
    const cap_vc_choices = Array.from(document.querySelectorAll('#cap_vc_choices input:checked')).map(cb => cb.value);
    
    const groups = Array.from(document.querySelectorAll('.group-input')).map(groupDiv => ({
        players: Array.from(groupDiv.querySelectorAll('.selected-player')).map(span => span.textContent.trim()),
        min: parseInt(groupDiv.querySelector('.group-min').value),
        max: parseInt(groupDiv.querySelector('.group-max').value)
    })).filter(group => group.players.length > 0 && group.max > 0);
    
    const contest_size = parseInt(document.getElementById('contest_size').value) || 1;
    
    // Validate data
    if (!validateData(team1_players, team2_players, team_composition, fix_players, contest_size)) {
        document.getElementById('loading').style.display = 'none';
        return;
    }
    
    // Send data to server
    fetch('/generate_teams', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            team1_name,
            team2_name,
            team1_players,
            team2_players,
            team_composition,
            fix_players,
            cap_vc_choices,
            groups,
            contest_size,
            sport,
            required_team_size: sport === 'kabaddi' ? kabaddi_team_size : 11
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            displayGeneratedTeams(data.teams);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error generating teams. Please check the console for details.');
    })
    .finally(() => {
        // Hide loading spinner
        document.getElementById('loading').style.display = 'none';
    });
}

function validateData(team1_players, team2_players, composition, fix_players, contest_size) {
    const requiredPlayers = currentSport === 'kabaddi' ? 
        parseInt(document.getElementById('kabaddi_team_size').value) : 11;
    
    if (team1_players.length < requiredPlayers) {
        alert(`Team 1 must have ${requiredPlayers} players`);
        return false;
    }
    
    if (team2_players.length < requiredPlayers) {
        alert(`Team 2 must have ${requiredPlayers} players`);
        return false;
    }
    
    if (fix_players.length > Math.floor(requiredPlayers * 0.7)) {
        alert(`Maximum ${Math.floor(requiredPlayers * 0.7)} fixed players allowed`);
        return false;
    }
    
    if (!contest_size || contest_size < 1) {
        alert('Please enter a valid contest size');
        return false;
    }
    
    // Validate team composition based on sport
    if (currentSport === 'cricket') {
        if (!composition.min_wk || !composition.max_wk || 
            !composition.min_bat || !composition.max_bat ||
            !composition.min_all || !composition.max_all ||
            !composition.min_bowl || !composition.max_bowl) {
            alert('Please fill in all cricket team composition fields');
            return false;
        }
    } else if (currentSport === 'football') {
        if (!composition.min_gk || !composition.max_gk ||
            !composition.min_def || !composition.max_def ||
            !composition.min_mid || !composition.max_mid ||
            !composition.min_st || !composition.max_st) {
            alert('Please fill in all football team composition fields');
            return false;
        }
    } else if (currentSport === 'kabaddi') {
        if (!composition.min_kdef || !composition.max_kdef ||
            !composition.min_kall || !composition.max_kall ||
            !composition.min_krai || !composition.max_krai) {
            alert('Please fill in all kabaddi team composition fields');
            return false;
        }
    }
    
    return true;
}

function displayGeneratedTeams(teams) {
    const container = document.getElementById('teams_output');
    container.innerHTML = teams.map((team, index) => {
        const playersList = team.players.map(p => `
            <div class="col-md-6 mb-2">
                <span class="player-role role-${p.role.toLowerCase()}">${p.role}</span>
                ${p.name}
                ${p.name === team.captain ? '<span class="captain-badge">C</span>' : ''}
                ${p.name === team.vice_captain ? '<span class="vice-captain-badge">VC</span>' : ''}
            </div>
        `).join('');

        const roleCount = {
            WK: team.players.filter(p => p.role === 'WK').length,
            BAT: team.players.filter(p => p.role === 'BAT').length,
            ALL: team.players.filter(p => p.role === 'ALL').length,
            BOWL: team.players.filter(p => p.role === 'BOWL').length,
            GK: team.players.filter(p => p.role === 'GK').length,
            DEF: team.players.filter(p => p.role === 'DEF').length,
            MID: team.players.filter(p => p.role === 'MID').length,
            ST: team.players.filter(p => p.role === 'ST').length,
            KDEF: team.players.filter(p => p.role === 'KDEF').length,
            KALL: team.players.filter(p => p.role === 'KALL').length,
            KRAI: team.players.filter(p => p.role === 'KRAI').length
        };

        return `
            <div class="team-card">
                <h5>Team ${index + 1}</h5>
                <div class="mb-3">
                    ${currentSport === 'cricket' ? `
                        <span class="badge bg-info me-2">WK: ${roleCount.WK}</span>
                        <span class="badge bg-success me-2">BAT: ${roleCount.BAT}</span>
                        <span class="badge bg-warning me-2">ALL: ${roleCount.ALL}</span>
                        <span class="badge bg-danger">BOWL: ${roleCount.BOWL}</span>
                    ` : currentSport === 'football' ? `
                        <span class="badge bg-info me-2">GK: ${roleCount.GK}</span>
                        <span class="badge bg-success me-2">DEF: ${roleCount.DEF}</span>
                        <span class="badge bg-warning me-2">MID: ${roleCount.MID}</span>
                        <span class="badge bg-danger">ST: ${roleCount.ST}</span>
                    ` : `
                        <span class="badge bg-info me-2">KDEF: ${roleCount.KDEF}</span>
                        <span class="badge bg-success me-2">KALL: ${roleCount.KALL}</span>
                        <span class="badge bg-danger">KRAI: ${roleCount.KRAI}</span>
                    `}
                </div>
                <div class="row">
                    ${playersList}
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('generated_teams').style.display = 'block';
    document.getElementById('loading').style.display = 'none';
}
