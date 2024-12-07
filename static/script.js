let groupCounter = 0;

// Load saved data when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
});

// Function to load saved data
function loadSavedData() {
    fetch('/load_saved_data')
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

            // Load team composition
            if (data.team_composition) {
                document.getElementById('min_wk').value = data.team_composition.min_wk || 1;
                document.getElementById('max_wk').value = data.team_composition.max_wk || 4;
                document.getElementById('min_bat').value = data.team_composition.min_bat || 1;
                document.getElementById('max_bat').value = data.team_composition.max_bat || 6;
                document.getElementById('min_all').value = data.team_composition.min_all || 1;
                document.getElementById('max_all').value = data.team_composition.max_all || 6;
                document.getElementById('min_bowl').value = data.team_composition.min_bowl || 1;
                document.getElementById('max_bowl').value = data.team_composition.max_bowl || 6;
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
                <option value="WK" ${playerData.role === 'WK' ? 'selected' : ''}>Wicket Keeper (WK)</option>
                <option value="BAT" ${playerData.role === 'BAT' ? 'selected' : ''}>Batsman (BAT)</option>
                <option value="ALL" ${playerData.role === 'ALL' ? 'selected' : ''}>All Rounder (ALL)</option>
                <option value="BOWL" ${playerData.role === 'BOWL' ? 'selected' : ''}>Bowler (BOWL)</option>
            </select>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control" placeholder="Selection %" min="0" max="100" value="${playerData.selection_percentage || ''}" required>
        </div>
        <div class="col-md-3">
            <button class="btn btn-danger" onclick="this.parentElement.parentElement.remove(); saveCurrentData()">Remove</button>
        </div>
    `;
    
    container.appendChild(playerDiv);
}

// Function to add group with existing data
function addGroupWithData(groupData) {
    if (groupCounter >= 5) {
        alert('Maximum 5 groups allowed');
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

// Modified addPlayer function to save data after adding
function addPlayer(containerId) {
    const container = document.getElementById(containerId);
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-input row mb-2';
    
    playerDiv.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="Player Name" required>
        </div>
        <div class="col-md-3">
            <select class="form-control" required>
                <option value="WK">Wicket Keeper (WK)</option>
                <option value="BAT">Batsman (BAT)</option>
                <option value="ALL">All Rounder (ALL)</option>
                <option value="BOWL">Bowler (BOWL)</option>
            </select>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control" placeholder="Selection %" min="0" max="100" required>
        </div>
        <div class="col-md-3">
            <button class="btn btn-danger" onclick="this.parentElement.parentElement.remove(); saveCurrentData()">Remove</button>
        </div>
    `;
    
    container.appendChild(playerDiv);
    updateFixPlayersAndCapVC();
    saveCurrentData();
}

// Function to save current data
function saveCurrentData() {
    const data = {
        team1_name: document.getElementById('team1_name').value,
        team2_name: document.getElementById('team2_name').value,
        team1_players: Array.from(document.querySelectorAll('#team1_players .player-input')).map(div => ({
            name: div.querySelector('input[type="text"]').value,
            role: div.querySelector('select').value,
            selection_percentage: div.querySelector('input[type="number"]').value
        })),
        team2_players: Array.from(document.querySelectorAll('#team2_players .player-input')).map(div => ({
            name: div.querySelector('input[type="text"]').value,
            role: div.querySelector('select').value,
            selection_percentage: div.querySelector('input[type="number"]').value
        })),
        team_composition: {
            min_wk: parseInt(document.getElementById('min_wk').value),
            max_wk: parseInt(document.getElementById('max_wk').value),
            min_bat: parseInt(document.getElementById('min_bat').value),
            max_bat: parseInt(document.getElementById('max_bat').value),
            min_all: parseInt(document.getElementById('min_all').value),
            max_all: parseInt(document.getElementById('max_all').value),
            min_bowl: parseInt(document.getElementById('min_bowl').value),
            max_bowl: parseInt(document.getElementById('max_bowl').value)
        },
        fix_players: Array.from(document.querySelectorAll('#fix_players input:checked')).map(cb => cb.value),
        cap_vc_choices: Array.from(document.querySelectorAll('#cap_vc_choices input:checked')).map(cb => cb.value),
        groups: Array.from(document.querySelectorAll('.group-input')).map(groupDiv => ({
            players: Array.from(groupDiv.querySelectorAll('.selected-player')).map(span => span.textContent.trim()),
            min: parseInt(groupDiv.querySelector('.group-min').value),
            max: parseInt(groupDiv.querySelector('.group-max').value)
        })),
        contest_size: parseInt(document.getElementById('contest_size').value)
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
    if (groupCounter >= 5) {
        alert('Maximum 5 groups allowed');
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
    
    // Collect all data
    const team1_name = document.getElementById('team1_name').value;
    const team2_name = document.getElementById('team2_name').value;
    
    const team1_players = Array.from(document.querySelectorAll('#team1_players .player-input')).map(div => ({
        name: div.querySelector('input[type="text"]').value,
        role: div.querySelector('select').value,
        selection_percentage: div.querySelector('input[type="number"]').value,
        team: 'team1'
    }));
    
    const team2_players = Array.from(document.querySelectorAll('#team2_players .player-input')).map(div => ({
        name: div.querySelector('input[type="text"]').value,
        role: div.querySelector('select').value,
        selection_percentage: div.querySelector('input[type="number"]').value,
        team: 'team2'
    }));
    
    const team_composition = {
        min_wk: parseInt(document.getElementById('min_wk').value),
        max_wk: parseInt(document.getElementById('max_wk').value),
        min_bat: parseInt(document.getElementById('min_bat').value),
        max_bat: parseInt(document.getElementById('max_bat').value),
        min_all: parseInt(document.getElementById('min_all').value),
        max_all: parseInt(document.getElementById('max_all').value),
        min_bowl: parseInt(document.getElementById('min_bowl').value),
        max_bowl: parseInt(document.getElementById('max_bowl').value)
    };
    
    const fix_players = Array.from(document.querySelectorAll('#fix_players input:checked')).map(cb => cb.value);
    const cap_vc_choices = Array.from(document.querySelectorAll('#cap_vc_choices input:checked')).map(cb => cb.value);
    
    const groups = Array.from(document.querySelectorAll('.group-input')).map(groupDiv => ({
        players: Array.from(groupDiv.querySelectorAll('.selected-player')).map(span => span.textContent.trim()),
        min: parseInt(groupDiv.querySelector('.group-min').value),
        max: parseInt(groupDiv.querySelector('.group-max').value)
    }));
    
    const contest_size = parseInt(document.getElementById('contest_size').value);
    
    // Validate data
    if (!validateData(team1_players, team2_players, team_composition, fix_players, contest_size)) {
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
            contest_size
        })
    })
    .then(response => response.json())
    .then(data => {
        displayGeneratedTeams(data.teams);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error generating teams. Please check the console for details.');
    });
}

function validateData(team1_players, team2_players, composition, fix_players, contest_size) {
    if (team1_players.length !== 11 || team2_players.length !== 11) {
        alert('Each team must have exactly 11 players');
        return false;
    }
    
    if (fix_players.length > 7) {
        alert('Maximum 7 fixed players allowed');
        return false;
    }
    
    if (!contest_size || contest_size < 1) {
        alert('Please enter a valid contest size');
        return false;
    }
    
    // Validate composition
    const total_min = composition.min_wk + composition.min_bat + composition.min_all + composition.min_bowl;
    if (total_min > 11) {
        alert('Sum of minimum players across roles cannot exceed 11');
        return false;
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
            BOWL: team.players.filter(p => p.role === 'BOWL').length
        };

        return `
            <div class="team-card">
                <h5>Team ${index + 1}</h5>
                <div class="mb-3">
                    <span class="badge bg-info me-2">WK: ${roleCount.WK}</span>
                    <span class="badge bg-success me-2">BAT: ${roleCount.BAT}</span>
                    <span class="badge bg-warning me-2">ALL: ${roleCount.ALL}</span>
                    <span class="badge bg-danger">BOWL: ${roleCount.BOWL}</span>
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
