const { fetchMatchWords, updatePlayerPostMatch } = require('./db');

class Match {
  constructor(io, matchId, p1Socket, p2Socket, playerInfo) {
    this.io = io;
    this.matchId = matchId;
    this.p1 = p1Socket;
    this.p2 = p2Socket;
    this.playerInfo = playerInfo; // Holds username, elo, and playerClass per socketId
    
    // Game State
    this.gameState = {
      [this.p1.id]: { 
        hp: playerInfo[this.p1.id].max_hp || 100, 
        combo: 0,
        playerClass: playerInfo[this.p1.id].playerClass,
        lastAttackTimestamp: 0 
      },
      [this.p2.id]: { 
        hp: playerInfo[this.p2.id].max_hp || 100, 
        combo: 0,
        playerClass: playerInfo[this.p2.id].playerClass,
        lastAttackTimestamp: 0 
      },
    };
    
    this.words = [];
    this.isActive = false;
    
    this._setupListeners();
  }

  // Phase 1: Pre-Match Fetching & Countdown
  async startMatchSequence() {
    try {
      const avgLevel = Math.round((this.p1.playerData.level + this.p2.playerData.level) / 2);
      
      console.log(`[Match ${this.matchId}] Fetching words for average level ${avgLevel}...`);
      this.words = await fetchMatchWords(avgLevel);
      
      // Emit the words and opponent data
      this.io.to(this.matchId).emit('match_init', {
        words: this.words,
        players: this.playerInfo
      });

      // 3-second countdown
      let countdown = 3;
      const interval = setInterval(() => {
        this.io.to(this.matchId).emit('countdown', { count: countdown });
        countdown--;
        if (countdown < 0) {
          clearInterval(interval);
          this.isActive = true;
          this.io.to(this.matchId).emit('match_start');
          console.log(`[Match ${this.matchId}] Started!`);
        }
      }, 1000);

    } catch (err) {
      console.error(`[Match ${this.matchId}] Initialization error:`, err);
      this.io.to(this.matchId).emit('match_error', { message: 'Failed to initialize match' });
      this.teardownMatch(null); // Abort
    }
  }

  _setupListeners() {
    const handleAttack = (socket, opponentId) => (payload) => {
      if (!this.isActive) return;

      const { timestamp, wordIndex, typingSpeedWPM, typos } = payload;
      const myId = socket.id;
      const myState = this.gameState[myId];
      
      // Anti-Cheat: Timestamp validation (Latency Compensation)
      const serverTime = Date.now();
      const pingEstimate = 100;
      if (serverTime - timestamp > pingEstimate + 1000) {
          console.log(`[Match ${this.matchId}] Rejected stale/invalid attack payload from ${socket.playerData.username}`);
          return;
      }

      // Combo Tracking
      if (typos === 0) {
          myState.combo++;
      } else {
          myState.combo = 0;
      }

      // Base Damage Calculation (GDD formula)
      const v = typingSpeedWPM / 10;
      const word = this.words[wordIndex]?.word || "a";
      const rareCharsCount = (word.match(/[xzqj]/gi) || []).length;
      const m = 1.0 + (word.length * 0.1) + (rareCharsCount * 0.3);
      const accuracyMultiplier = Math.max(0, 1.0 - (typos * 0.1)); 
      let damage = Math.round(((m * Math.pow(v, 2)) / 2) * accuracyMultiplier);

      // --- Class Specific Buffs ---
      
      // Assassin: 2x damage if combo >= 10
      if (myState.playerClass === 'assassin' && myState.combo >= 10) {
          damage *= 2;
          console.log(`[Match ${this.matchId}] ASSASSIN CRITICAL STRIKE! 2x DMG.`);
      }

      // Word-Mage: Spell Logic (Placeholder IDs)
      if (myState.playerClass === 'word-mage') {
          // If word is complex enough, trigger a random debuff on opponent
          if (word.length >= 8) {
              const spellType = Math.random() > 0.5 ? 'SCRAMBLE' : 'INTERRUPT';
              this.io.to(opponentId).emit('apply_debuff', { type: spellType, duration: 1500 });
              console.log(`[Match ${this.matchId}] WORD-MAGE cast ${spellType} on ${this.playerInfo[opponentId].username}`);
          }
      }

      // Apply damage
      this.gameState[opponentId].hp -= damage;
      if (this.gameState[opponentId].hp < 0) this.gameState[opponentId].hp = 0;

      // Broadcast authoritative state
      this.io.to(this.matchId).emit('game_state_update', {
         state: this.gameState,
         last_attack: { attacker: socket.id, target: opponentId, damage }
      });

      // Check win condition
      if (this.gameState[opponentId].hp <= 0) {
          this.teardownMatch(socket.id);
      }
    };

    this.p1.on('player_attack', handleAttack(this.p1, this.p2.id));
    this.p2.on('player_attack', handleAttack(this.p2, this.p1.id));
    
    // Disconnect handling
    this.p1.on('disconnect', () => { if(this.isActive) this.teardownMatch(this.p2.id) }); // p2 wins by default
    this.p2.on('disconnect', () => { if(this.isActive) this.teardownMatch(this.p1.id) });
  }

  // Phase 3: Post-Match Cleanup & Economy
  async teardownMatch(winnerId) {
    if (!this.isActive) return;
    this.isActive = false;

    console.log(`[Match ${this.matchId}] Ending match. Winner: ${winnerId}`);
    
    this.io.to(this.matchId).emit('match_end', { winner_id: winnerId });

    if (winnerId) {
       const loserId = winnerId === this.p1.id ? this.p2.id : this.p1.id;
       const winnerSocket = winnerId === this.p1.id ? this.p1 : this.p2;
       const loserSocket = loserId === this.p1.id ? this.p1 : this.p2;

       // Basic Arpad Elo & Economy calculation
       const K = 32;
       const expectedWin = 1 / (1 + Math.pow(10, (loserSocket.playerData.elo - winnerSocket.playerData.elo) / 400));
       const eloGain = Math.round(K * (1 - expectedWin));
       const eloLoss = -Math.round(K * (0 - (1 - expectedWin)));

       try {
           // Async Postgres Updates
           await updatePlayerPostMatch(winnerSocket.playerData.id, eloGain, 50); // Winner gets 50 coins
           await updatePlayerPostMatch(loserSocket.playerData.id, eloLoss, 10);  // Loser gets 10 coins
           console.log(`[Match ${this.matchId}] Database records updated successfully.`);
       } catch (err) {
           console.error(`[Match ${this.matchId}] Failed to update post-match economy:`, err);
       }
    }

    // Explicitly unbind listeners to prevent memory leaking
    this.p1.removeAllListeners('player_attack');
    this.p2.removeAllListeners('player_attack');
    
    // Remove sockets from the room
    this.p1.leave(this.matchId);
    this.p2.leave(this.matchId);

    // Dereference to allow Garbage Collection
    this.p1 = null;
    this.p2 = null;
    this.gameState = null;
    this.words = [];
    
    console.log(`[Match ${this.matchId}] Destroyed. RAM freed.`);
  }
}

module.exports = { Match };
