// =========================================================
// MOCK BACKEND SERVER INTERCEPTOR (VOLT ESPORTS HUB)
// =========================================================
// This script intercepts all fetch calls to the deprecated
// eagleesport.com backend and returns gracefully mocked
// responses matching the expected data structures, preventing
// crashes and ensuring the frontend renders empty/safe states.

(function() {
    const originalFetch = window.fetch;
    const TARGET_URL = 'eagleesport.com/api/index.php';

    window.fetch = async function(resource, config) {
        let url = '';
        if (typeof resource === 'string') {
            url = resource;
        } else if (resource instanceof Request) {
            url = resource.url;
        }

        if (url.includes(TARGET_URL)) {
            // Intercepted! Let's mock based on action.
            let action = '';
            let bodyData = {};

            // 1. Check Query Params first
            if (url.includes('?')) {
                const urlParams = new URLSearchParams(url.split('?')[1]);
                if (urlParams.has('action')) {
                    action = urlParams.get('action');
                }
            }

            // 2. Check JSON Body if POST
            if (config && config.body && typeof config.body === 'string') {
                try {
                    bodyData = JSON.parse(config.body);
                    if (bodyData.action) {
                        action = bodyData.action;
                    }
                } catch(e) {}
            }

            console.log(`[MOCK BACKEND] Intercepted action: ${action}`);

            let mockResponse = { status: 'error', message: 'Action not mocked' };

            switch(action) {
                // --- Dashboard & Teams ---
                case 'getUserDashboard':
                    let existingPlayer = { id: 1, in_game_name: "Player" };
                    let existingHasTeam = false;
                    let existingTeamData = null;
                    try {
                        const sess = JSON.parse(localStorage.getItem('playerSession') || '{}');
                        if (sess && sess.player_data) {
                            existingPlayer = sess.player_data;
                        }
                        if (sess && sess.has_team) {
                            existingHasTeam = sess.has_team;
                        }
                        if (sess && sess.team_data) {
                            existingTeamData = sess.team_data;
                        }
                    } catch(e) {}
                    mockResponse = {
                        status: 'success',
                        has_team: existingHasTeam,
                        player_data: existingPlayer,
                        team_data: existingTeamData,
                        stats: {
                            all_time: { matches: 0, wins: 0, kills: 0, points: 0 },
                            monthly: { matches: 0, wins: 0, kills: 0, points: 0 },
                            weekly: { matches: 0, wins: 0, kills: 0, points: 0 }
                        },
                        history: []
                    };
                    break;
                
                case 'getLeaderboard':
                    mockResponse = {
                        status: 'success',
                        data: [] // Empty leaderboard
                    };
                    break;

                // --- Tournaments & Scheduling ---
                case 'getSchedule':
                    // e.g. type=free or type=paid
                    const type = url.includes('type=paid') ? 'paid' : 'free';
                    mockResponse = type === 'paid' ? {
                        "status": "success",
                        "slots": {},
                        "extended_times": {}
                    } : []; // free returns array
                    break;

                case 'getAllTournamentsMeta':
                    mockResponse = {
                        status: 'success',
                        data: {} // No tournaments active
                    };
                    break;
                
                case 'getLobbyOff':
                    mockResponse = {
                        status: 'success',
                        configs: []
                    };
                    break;
                
                case 'getPaidSlotsStatus':
                    mockResponse = {
                        status: 'success',
                        slots: {},
                        extended_times: {}
                    };
                    break;

                // --- Lobby & Rules ---
                case 'getLobbyRules':
                    mockResponse = {
                        status: 'success',
                        rules: "Tournament rules will be displayed here."
                    };
                    break;
                
                case 'getPublicTournamentConfig':
                    mockResponse = {
                        status: 'success',
                        totalSlots: 12,
                        reg_start_date: "2030-01-01",
                        reg_start_time: "00:00"
                    };
                    break;
                
                case 'getLobbyLimits':
                    mockResponse = { status: 'success' };
                    break;
                
                case 'getTeams':
                    mockResponse = [];
                    break;
                
                case 'getRegisteredTeamsList':
                    mockResponse = {
                        status: 'success',
                        teams: []
                    };
                    break;

                // --- Auth/Registration Mocks (Safety Net) ---
                case 'checkPhoneExists':
                    mockResponse = { status: 'success', exists: false };
                    break;
                
                default:
                    console.log(`[MOCK BACKEND] Unhandled action: ${action}`);
                    mockResponse = { status: 'success', data: null, message: "Mocked response fallback" };
            }

            return new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Pass through if not our target URL
        return originalFetch(resource, config);
    };

    console.log('[MOCK BACKEND] EagleEsport API fetch interceptor loaded.');
})();
