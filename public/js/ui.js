const UIManager = (() => {
    let currentScreen = 'login-screen';
    const screens = [
        'login-screen', 'signup-screen', 'path-selection-screen', 
        'hub-screen', 'arena-screen', 'shop-screen', 
        'auction-screen', 'training-screen'
    ];

    // Auth Elements
    const loginEmail = document.getElementById('login-email');
    const loginPass = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const signupBtn = document.getElementById('show-signup-btn');
    const signupSubmitBtn = document.getElementById('signup-submit-btn');
    const loginError = document.getElementById('login-error');

    // Hub Elements
    const hubUserName = document.getElementById('hub-username');
    const hubLevel = document.getElementById('hub-level');
    const hubElo = document.getElementById('hub-elo');
    const hubCoins = document.getElementById('hub-coins');
    const logoutBtn = document.getElementById('logout-btn');

    const init = async () => {
        setupEventListeners();
        await checkAuth();
    };

    const setupEventListeners = () => {
        // Auth Transitions
        if (signupBtn) signupBtn.addEventListener('click', () => showScreen('signup-screen'));
        const showLoginBtn = document.getElementById('show-login-btn');
        if (showLoginBtn) showLoginBtn.addEventListener('click', () => showScreen('login-screen'));

        // Login Logic
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const email = loginEmail.value;
                const password = loginPass.value;
                try {
                    const res = await fetch('/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();
                    if (data.success) {
                        window.location.reload(); // Simple reload to re-trigger checkAuth and socket connect
                    } else {
                        loginError.innerText = data.error;
                        loginError.classList.remove('hidden');
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        }

        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => {
                window.location.href = '/auth/google';
            });
        }

        // Signup Logic
        if (signupSubmitBtn) {
            signupSubmitBtn.addEventListener('click', async () => {
                const username = document.getElementById('signup-username').value;
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;
                
                // Temporary store for signup, we'll need class selection next
                window.signupData = { username, email, password };
                showScreen('path-selection-screen');
            });
        }

        // Path Selection Logic
        document.querySelectorAll('.path-card').forEach(card => {
            card.addEventListener('click', async () => {
                const chosenClass = card.dataset.class;
                if (window.signupData) {
                    // Completing Signup
                    try {
                        const res = await fetch('/auth/signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...window.signupData, chosenClass })
                        });
                        const data = await res.json();
                        if (data.success) {
                            window.location.reload();
                        } else {
                            document.getElementById('path-error').innerText = data.error;
                            document.getElementById('path-error').classList.remove('hidden');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });

        // Hub Navigation
        const bindHubBtn = (id, screen) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => showScreen(screen));
        };

        bindHubBtn('shop-btn', 'shop-screen');
        bindHubBtn('auctions-btn', 'auction-screen');
        
        const trainingBtn = document.getElementById('training-btn');
        if (trainingBtn) {
            trainingBtn.addEventListener('click', () => {
                showScreen('training-screen');
                if (window.TrainingMode) window.TrainingMode.start();
            });
        }
    
        const findMatchBtn = document.getElementById('find-match-btn');
        if (findMatchBtn) findMatchBtn.addEventListener('click', () => {
            if (window.SocketManager) window.SocketManager.findMatch();
            document.getElementById('matchmaking-overlay').classList.remove('hidden');
        });

        const campaignBtn = document.getElementById('campaign-btn');
        if (campaignBtn) campaignBtn.addEventListener('click', () => {
            if (window.SocketManager) window.SocketManager.startPvE();
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await fetch('/auth/logout', { method: 'POST' });
                window.location.reload();
            });
        }

        // Back buttons
        document.querySelectorAll('.back-to-hub').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.TrainingMode) window.TrainingMode.stop();
                showScreen('hub-screen');
            });
        });

        const quitTrainingBtn = document.getElementById('quit-training-btn');
        if (quitTrainingBtn) {
            quitTrainingBtn.addEventListener('click', () => {
                if (window.TrainingMode) window.TrainingMode.stop();
                showScreen('hub-screen');
            });
        }
    };

    const checkAuth = async () => {
        try {
            const res = await fetch('/auth/me');
            const data = await res.json();
            if (data.authenticated) {
                const player = data.user;
                if (!player.chosen_class && player.google_id) {
                    // New Google user needs to choose a class
                    window.signupData = { isGoogle: true }; // Just a flag
                    showScreen('path-selection-screen');
                } else {
                    updatePlayerUI(player);
                    showScreen('hub-screen');
                    // Socket.io will auto-connect using session cookie
                    if (window.SocketManager) window.SocketManager.connect();
                }
            } else {
                showScreen('login-screen');
            }
        } catch (err) {
            console.error('Auth verification failed', err);
        }
    };

    const showScreen = (screenId) => {
        screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
            if (el) el.classList.remove('active');
        });
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
        currentScreen = screenId;
    };

    const updatePlayerUI = (player) => {
        if (hubUserName) hubUserName.innerText = player.username;
        if (hubLevel) hubLevel.innerText = player.level;
        if (hubElo) hubElo.innerText = player.elo;
        if (hubCoins) hubCoins.innerText = player.coins;
    };

    const updateBalance = (coins) => {
        if (hubCoins) hubCoins.innerText = coins;
    };

    // --- Gameplay UI ---
    const displayTargetWord = (word, correctIdx, errorIdx = -1) => {
        const arenaDisplay = document.getElementById('word-display');
        const trainingDisplay = document.getElementById('training-word-display');
        
        const render = (display) => {
            if (!display) return;
            let html = '';
            for (let i = 0; i < word.length; i++) {
                if (i < correctIdx) html += `<span class="correct">${word[i]}</span>`;
                else if (i === correctIdx) html += `<span class="current">${word[i]}</span>`;
                else if (i === errorIdx) html += `<span class="error">${word[i]}</span>`;
                else html += `<span>${word[i]}</span>`;
            }
            display.innerHTML = html;
        };

        if (currentScreen === 'training-screen') render(trainingDisplay);
        else render(arenaDisplay);
    };

    const updateHP = (isPlayer, percent) => {
        const fillId = isPlayer ? 'player-hp-fill' : 'opponent-hp-fill';
        const fill = document.getElementById(fillId);
        if (fill) fill.style.width = `${percent}%`;

        // Also update Training dummy if visible
        const dummyFill = document.getElementById('dummy-hp-fill');
        if (dummyFill && !isPlayer && currentScreen === 'training-screen') {
            dummyFill.style.width = '100%'; 
            // Dummy handles its own "Infinity" text
        }
    };

    const setupArena = (player, opponent) => {
        const oppName = document.getElementById('arena-opponent-name');
        if (oppName) oppName.innerText = opponent.username;
        updateHP(true, 100);
        updateHP(false, 100);

        // Dummy Special
        const dummyFill = document.getElementById('dummy-hp-fill');
        if (dummyFill && opponent.hp === Infinity) {
            const bar = dummyFill.parentElement;
            if (!bar.querySelector('.hp-text')) {
                const text = document.createElement('div');
                text.className = 'hp-text';
                text.innerText = '∞ / ∞';
                bar.appendChild(text);
            }
        }
    };

    const showCountdown = (count) => {
        const display = document.getElementById('word-display');
        const trainingDisplay = document.getElementById('training-word-display');
        const text = count === 0 ? 'GO!' : count;
        if (display) display.innerText = text;
        if (trainingDisplay) trainingDisplay.innerText = text;
    };

    const updateTimer = (seconds) => {
        const timer = document.getElementById('timer-display');
        if (timer) timer.innerText = `${seconds}s`;
    };

    const updateWPM = (wpm) => {
        // Simple console for now or add a small tag in arena
    };

    const updateCombo = (combo) => {
        // Simple console for now
    };

    const showSuperAttack = (show) => {
        const el = document.getElementById('super-attack-ui');
        if (el) el.className = show ? 'active' : 'hidden';
    };

    const instance = {
        init,
        showScreen,
        updatePlayerUI,
        updateBalance,
        displayTargetWord,
        setupArena,
        showCountdown,
        updateHP,
        updateTimer,
        updateWPM,
        updateCombo,
        showSuperAttack
    };
    window.UI = instance;
    return instance;
})();

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    UIManager.init();
});
