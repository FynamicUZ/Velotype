// src/PvEMatch.js
const { fetchMatchWords, updatePlayerPostMatch, query } = require('./db');

class PvEMatch {
    constructor(io, matchId, playerSocket, stageId) {
        this.io = io;
        this.matchId = matchId;
        this.player = playerSocket;
        this.stageId = stageId;

        // Boss Settings based on Stage
        this.bossInfo = this._getBossConfig(parseInt(stageId));
        
        console.log(`[PvE ${this.matchId}] Constructor: Stage ${stageId} (${this.bossInfo.name}), HP: ${this.bossInfo.hp}`);
        
        this.gameState = {
            [this.player.id]: { hp: playerSocket.player.max_hp || 100 },
            boss: { hp: this.bossInfo.hp }
        };

        this.words = [];
        this.isActive = false;
        this.superAttackThreshold = 0.5; // 50% HP
        this.hasTriggeredSuperAttack = false;
        this.isInvulnerable = false;
        this.matchEnded = false;

        this._setupListeners();
    }

    _getBossConfig(id) {
        const configs = {
            1: { name: "The Glitch", hp: 300, level: 3, mechanic: 'NORMAL' },
            2: { name: "The Mirror", hp: 400, level: 5, mechanic: 'MIRROR' },
            3: { name: "The Ghost", hp: 600, level: 7, mechanic: 'INVIS' },
            6: { name: "Act Boss", hp: 1500, level: 10, mechanic: 'ALL' }
        };
        return configs[id] || configs[1];
    }

    async startMatchSequence() {
        try {
            console.log(`[PvE ${this.matchId}] Initializing Stage ${this.stageId}...`);
            let rawWords = await fetchMatchWords(this.bossInfo.level);
            
            // Apply Boss Mechanics to words
            this.words = rawWords.map(w => {
                let displayWord = w.word;
                if (this.bossInfo.mechanic === 'MIRROR') {
                    displayWord = displayWord.split('').reverse().join('');
                }
                return { ...w, word: displayWord };
            });

            this.player.emit('pve_init', {
                words: this.words,
                player: { 
                    id: this.player.id, 
                    username: this.player.player.username, 
                    hp: this.gameState[this.player.id].hp,
                    max_hp: this.gameState[this.player.id].hp 
                },
                boss: { 
                    id: 'boss', 
                    username: this.bossInfo.name, 
                    hp: this.bossInfo.hp,
                    max_hp: this.bossInfo.hp, 
                    mechanic: this.bossInfo.mechanic 
                }
            });

            // 3s countdown handled by client for now or sync here
            setTimeout(() => {
                this.isActive = true;
                console.log(`[PvE ${this.matchId}] Started!`);
            }, 3000);

        } catch (err) {
            console.error(`[PvE] Init error:`, err);
        }
    }

    _setupListeners() {
        this.player.on('player_attack', (payload) => {
            if (!this.isActive || this.matchEnded) return;
            if (this.isInvulnerable && payload.wordIndex !== 999) {
                console.log(`[PvE ${this.matchId}] Attack ignored: Boss is INVULNERABLE.`);
                return;
            }

            const { wordIndex, typingSpeedWPM, typos, timestamp } = payload;
            
            // Super Attack Completion
            if (wordIndex === 999 && this.hasTriggeredSuperAttack) {
                clearTimeout(this.superAttackTimer);
                this.hasTriggeredSuperAttack = false; 
                this.isInvulnerable = false; // Phase complete
                console.log(`[PvE ${this.matchId}] Super Attack DEFLECTED! Boss is vulnerable again.`);
                
                this.gameState.boss.hp -= 200; // Recoil damage
                this.player.emit('game_state_update', {
                    state: this.gameState,
                    last_attack: { attacker: this.player.id, target: 'boss', damage: 200, special: 'SUPER_ATTACK_DEFLECT' }
                });
                if (this.gameState.boss.hp <= 0) this.endMatch(true);
                return;
            }

            // Normal Attack damage math
            const v = typingSpeedWPM / 10;
            const word = this.words[wordIndex]?.word || "a";
            const m = 1.0 + (word.length * 0.1);
            const accuracyMultiplier = Math.max(0, 1.0 - (typos * 0.1)); 
            const damage = Math.round(((m * Math.pow(v, 2)) / 2) * accuracyMultiplier);

            console.log(`[PvE ${this.matchId}] Attack: WPM ${typingSpeedWPM}, Damage: ${damage}, Boss HP: ${this.gameState.boss.hp} -> ${this.gameState.boss.hp - damage}`);

            // Apply to Boss
            const previousHp = this.gameState.boss.hp;
            this.gameState.boss.hp -= damage;
            
            // Checks for Super Attack Trigger
            const hpRatio = this.gameState.boss.hp / this.bossInfo.hp;
            if (!this.hasTriggeredSuperAttack && hpRatio < this.superAttackThreshold) {
                console.log(`[PvE ${this.matchId}] Phase Transition! HP Ratio ${hpRatio.toFixed(2)} < ${this.superAttackThreshold}.`);
                
                // Force HP to threshold cap for this phase
                if (previousHp / this.bossInfo.hp >= this.superAttackThreshold) {
                    this.gameState.boss.hp = Math.floor(this.bossInfo.hp * this.superAttackThreshold);
                    console.log(`[PvE ${this.matchId}] Boss HP capped at 50% (${this.gameState.boss.hp}) for phase transition.`);
                }
                
                this.isInvulnerable = true;
                this.triggerSuperAttack();
            }

            // Boss "Counter Attack" Simulation (Simple)
            this.gameState[this.player.id].hp -= 5; 

            this.player.emit('game_state_update', {
                state: this.gameState,
                last_attack: { attacker: this.player.id, target: 'boss', damage }
            });

            if (this.gameState.boss.hp <= 0 && !this.isInvulnerable) {
                this.endMatch(true);
            } else if (this.gameState[this.player.id].hp <= 0) {
                this.endMatch(false);
            }
        });
    }

    async triggerSuperAttack() {
        this.hasTriggeredSuperAttack = true;
        // isInvulnerable is already set above
        console.log(`[PvE ${this.matchId}] Boss is triggering SUPER ATTACK!`);
        
        try {
            // Fetch lore paragraph from DB
            const res = await query('SELECT text, time_limit FROM boss_scripts WHERE boss_id = $1 LIMIT 1', [this.stageId]);
            const script = res.rows[0] || { text: "PREPARE TO PERISH!", time_limit: 15 };

            this.player.emit('super_attack_start', {
                text: script.text,
                duration: script.time_limit
            });

            // Start an authoritative timer on the server
            this.superAttackTimer = setTimeout(() => {
                if (this.isActive && this.hasTriggeredSuperAttack) {
                    console.log(`[PvE ${this.matchId}] Super Attack FAILED! Player takes massive DMG.`);
                    this.hasTriggeredSuperAttack = false;
                    this.isInvulnerable = false;
                    this.gameState[this.player.id].hp -= 50;
                    this.player.emit('game_state_update', {
                        state: this.gameState,
                        last_attack: { attacker: 'boss', target: this.player.id, damage: 50, special: 'SUPER_ATTACK_FAIL' }
                    });
                    if (this.gameState[this.player.id].hp <= 0) this.endMatch(false);
                }
            }, script.time_limit * 1000);

        } catch (err) {
            console.error('Super Attack Trigger error:', err);
        }
    }

    async endMatch(playerWon) {
        if (this.matchEnded) return;
        this.matchEnded = true;
        this.isActive = false;
        if (this.superAttackTimer) clearTimeout(this.superAttackTimer);

        console.log(`[PvE] Match Ended. Player Won: ${playerWon}`);
        this.player.emit('match_end', { winner_id: playerWon ? this.player.id : 'boss' });

        if (playerWon) {
            // Update DB progress
            try {
                await query('UPDATE players SET shadow_boss_index = GREATEST(shadow_boss_index, $1) WHERE id = $2', 
                    [this.stageId, this.player.player.id]);
                console.log(`[PvE] Progression saved for player ${this.player.player.username}`);
            } catch (err) {
                console.error('[PvE] Failed to save progression:', err);
            }
        }

        this.player.removeAllListeners('player_attack');
        this.player.leave(this.matchId);
    }
}

module.exports = { PvEMatch };
