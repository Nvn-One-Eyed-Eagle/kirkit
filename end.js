
// Sample data structure - replace this with your actual data
const team1 = JSON.parse(localStorage.getItem("team1"));
const team2 = JSON.parse(localStorage.getItem("team2"));

function calculateStrikeRate(runs, balls) {
    return balls > 0 ? ((runs / balls) * 100).toFixed(2) : 0;
}

function calculateDotBalls(balls, fours, sixes) {
    const boundaryBalls = (fours?.length || 0) + (sixes?.length || 0);
    return Math.max(0, balls - boundaryBalls);
}

function generateMatchInfo(team1Data, team2Data) {
    const winner = team2Data.totalruns > team1Data.totalruns ? 'Team 2' : 
                    team1Data.totalruns > team2Data.totalruns ? 'Team 1' : 'Tie';
    const margin = Math.abs(team2Data.totalruns - team1Data.totalruns);

    return `
        <div class="team-score">
            <div class="team-name">Team 1</div>
            <div class="score">${team1Data.totalruns}/${team1Data.wicket}</div>
            <div class="score-details">${team1Data.overs} overs (${team1Data.totalballs} balls)</div>
            ${winner === 'Team 1' ? '<div class="winner-badge">🏆 WINNER</div>' : ''}
        </div>
        <div class="vs">VS</div>
        <div class="team-score">
            <div class="team-name">Team 2</div>
            <div class="score">${team2Data.totalruns}/${team2Data.wicket}</div>
            <div class="score-details">${team2Data.overs} overs (${team2Data.totalballs} balls)</div>
            ${winner === 'Team 2' ? '<div class="winner-badge">🏆 WINNER</div>' : ''}
        </div>
    `;
}

function generatePlayerCard(playerName, playerData) {
    const strikeRate = calculateStrikeRate(playerData.runs, playerData.balls);
    const dotBalls = calculateDotBalls(playerData.balls, playerData.fours, playerData.sixes);
    const boundaryPercentage = playerData.balls > 0 ? 
        (((playerData.fours?.length || 0) + (playerData.sixes?.length || 0)) / playerData.balls * 100).toFixed(1) : 0;

    // Performance score (0-100)
    const performanceScore = Math.min(100, (parseFloat(strikeRate) / 2) + (playerData.runs * 2));

    let highlightsHTML = '';
    const allHighlights = [];

    // Collect all videos
    if (playerData.sixes && playerData.sixes.length > 0) {
        playerData.sixes.forEach((six, idx) => {
            allHighlights.push({video: six.video, label: 'SIX', type: 'six'});
        });
    }
    if (playerData.fours && playerData.fours.length > 0) {
        playerData.fours.forEach((four, idx) => {
            allHighlights.push({video: four.video, label: 'FOUR', type: 'four'});
        });
    }

    if (allHighlights.length > 0) {
        highlightsHTML = `
            <div class="highlights-section">
                <div class="highlights-title">⚡ Match Highlights</div>
                <div class="videos-grid">
                    ${allHighlights.map(highlight => `
                        <div class="video-item">
                            <video src="${highlight.video}" controls loop muted></video>
                            <div class="video-label">${highlight.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    return `
        <div class="player-card">
            <div class="player-header">
                <img src="${playerData.image}" alt="${playerName}" class="player-image">
                <div class="player-overlay">
                    <div class="player-name">${playerName.toUpperCase()}</div>
                    <div class="player-role">Batsman</div>
                </div>
            </div>
            <div class="player-stats">
                <div class="primary-stats">
                    <div class="primary-stat">
                        <div class="primary-stat-value">${playerData.runs}</div>
                        <div class="primary-stat-label">Runs</div>
                    </div>
                    <div class="primary-stat">
                        <div class="primary-stat-value">${playerData.balls}</div>
                        <div class="primary-stat-label">Balls</div>
                    </div>
                    <div class="primary-stat">
                        <div class="primary-stat-value">${strikeRate}</div>
                        <div class="primary-stat-label">Strike Rate</div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-box-value">${playerData.fours?.length || 0}</div>
                        <div class="stat-box-label">Fours</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-value">${playerData.sixes?.length || 0}</div>
                        <div class="stat-box-label">Sixes</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-value">${dotBalls}</div>
                        <div class="stat-box-label">Dot Balls</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-value">${boundaryPercentage}%</div>
                        <div class="stat-box-label">Boundary %</div>
                    </div>
                </div>

                <div class="performance-indicator">
                    <span style="font-size: 0.85em; color: #aaa;">Performance</span>
                    <div class="performance-bar">
                        <div class="performance-fill" style="width: ${performanceScore}%"></div>
                    </div>
                    <span style="font-size: 0.85em; font-weight: bold; color: #ffd700;">${performanceScore.toFixed(0)}</span>
                </div>

                ${playerData.bold ? '<div class="dismissal-badge">❌ DISMISSED</div>' : ''}

                ${highlightsHTML}
            </div>
        </div>
    `;
}

function generateTeamSection(teamName, teamData) {
    const players = Object.keys(teamData).filter(key => 
        typeof teamData[key] === 'object' && teamData[key].runs !== undefined
    );

    const playersHTML = players.map(playerName => 
        generatePlayerCard(playerName, teamData[playerName])
    ).join('');

    const runRate = teamData.totalballs > 0 ? 
        ((teamData.totalruns / teamData.totalballs) * 6).toFixed(2) : 0;

    return `
        <div class="team-container">
            <div class="team-header">
                <h2>${teamName}</h2>
                <div class="team-stats">
                    <div class="stat-item">
                        <div class="stat-value">${teamData.totalruns}</div>
                        <div class="stat-label">Total Runs</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${teamData.wicket}</div>
                        <div class="stat-label">Wickets</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${teamData.overs}</div>
                        <div class="stat-label">Overs</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${runRate}</div>
                        <div class="stat-label">Run Rate</div>
                    </div>
                </div>
            </div>
            <div class="players-grid">
                ${playersHTML}
            </div>
        </div>
    `;
}

// Initialize the page with your actual data
function initializePage(team1Data, team2Data) {
    document.getElementById('matchInfo').innerHTML = generateMatchInfo(team1Data, team2Data);
    document.getElementById('teamsWrapper').innerHTML = 
        generateTeamSection('TEAM 1', team1Data) +
        generateTeamSection('TEAM 2', team2Data);
    
    setupTeamSwitcher();
    setupSwipeGesture();
}

// Team Switcher Functionality
function setupTeamSwitcher() {
    const tabs = document.querySelectorAll('.team-tab');
    const wrapper = document.getElementById('teamsWrapper');

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            switchToTeam(index);
        });
    });
}

function switchToTeam(teamIndex) {
    const tabs = document.querySelectorAll('.team-tab');
    const wrapper = document.getElementById('teamsWrapper');
    
    // Update active tab
    tabs.forEach((tab, index) => {
        if (index === teamIndex) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Slide to the selected team
    wrapper.style.transform = `translateX(-${teamIndex * 100}%)`;
}

// Swipe Gesture Support
function setupSwipeGesture() {
    const wrapper = document.getElementById('teamsWrapper');
    let touchStartX = 0;
    let touchEndX = 0;
    let currentTeam = 0;

    wrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    wrapper.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentTeam === 0) {
                // Swipe left - go to team 2
                currentTeam = 1;
                switchToTeam(1);
            } else if (diff < 0 && currentTeam === 1) {
                // Swipe right - go to team 1
                currentTeam = 0;
                switchToTeam(0);
            }
        }
    }
}

// Call this function with your actual team data
// Replace team1 and team2 variables with your actual data
initializePage(team1, team2);
