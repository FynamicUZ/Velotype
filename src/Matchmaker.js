const { v4: uuidv4 } = require('uuid');
const { Match } = require('./Match');
const { PvEMatch } = require('./PvEMatch');

class Matchmaker {
  constructor(io) {
    this.io = io;
    this.queue = [];
    this.evaluationInterval = null;
  }

  // 1. Add authenticated socket to the queue array
  handleFindMatch(socket, data) {
    const playerClass = socket.player.chosen_class || 'Juggernaut'; // Permanent choice
    this.queue.push({
        socket,
        playerData: socket.player, 
        playerClass: playerClass.toLowerCase(), // Store lowercase for match logic
        joinedAt: Date.now(),
        maxEloRange: 50 // Initial ELO range
    });
    
    console.log(`[Queue] Added ${socket.player.username} (${playerClass}). Queue length: ${this.queue.length}`);
    socket.emit('matchmaking_started');
  }

  handleStartPvE(socket, data) {
    const stageId = data?.stageId || 1;
    const matchId = `pve_${uuidv4()}`;
    
    console.log(`[PvE] Player ${socket.player.username} starting Stage ${stageId}. ID: ${matchId}`);
    
    // Join a unique room
    socket.join(matchId);
    
    const pveInstance = new PvEMatch(this.io, matchId, socket, stageId);
    pveInstance.startMatchSequence();
  }

  // 2. Remove socket from the queue array 
  removePlayerFromQueue(socketId) {
    this.queue = this.queue.filter((p) => p.socket.id !== socketId);
    console.log(`[Queue] Player removed. Queue length: ${this.queue.length}`);
    // Emit event back to client if needed
  }

  // 3. Start periodic interval (e.g. 1s) to evaluate queued players 
  startEvaluationLoop() {
    if (this.evaluationInterval) return;
    this.evaluationInterval = setInterval(() => {
      this.evaluateQueue();
    }, 1000);
    console.log('[Matchmaker] Evaluation loop started.');
  }

  stopEvaluationLoop() {
      if (this.evaluationInterval) {
          clearInterval(this.evaluationInterval);
          this.evaluationInterval = null;
      }
  }

  // 4. Pair players based on expanding ELO margins
  evaluateQueue() {
      if (this.queue.length < 2) return;

      const now = Date.now();
      
      // We iterate over the queue to find pairs
      for (let i = 0; i < this.queue.length; i++) {
         const player1 = this.queue[i];
         const waitingTimeSecs1 = (now - player1.joinedAt) / 1000;
         
         // Expand ELO margin based on wait time (e.g., base 50 ELO + 10 ELO per second)
         // Use player1's initial maxEloRange and expand from there
         const eloMargin = player1.maxEloRange + (waitingTimeSecs1 * 10);
         
         for (let j = i + 1; j < this.queue.length; j++) {
            const player2 = this.queue[j];
            const eloDiff = Math.abs(player1.playerData.elo - player2.playerData.elo);
            
            if (eloDiff <= eloMargin) {
                // We found a match!
                const players = {};
                players[player1.socket.id] = { ...player1.playerData, playerClass: player1.playerClass };
                players[player2.socket.id] = { ...player2.playerData, playerClass: player2.playerClass };

                this.createMatch(player1.socket, player2.socket, players);
                
                // Remove both from the iterative arrays
                this.queue.splice(j, 1);
                this.queue.splice(i, 1);
                
                // We restart outer loop evaluation because indices shifted
                i--;
                break;
            }
         }
      }
  }

  // 5. Generate unique match ID and initialize a new Match instance
  createMatch(p1Socket, p2Socket) {
      const matchId = uuidv4();
      console.log(`[Matchmaker] Found match! UUID: ${matchId}. p1: ${p1Socket.player.username}, p2: ${p2Socket.player.username}`);
      
      // Remove from matchmaking queues explicitly
      p1Socket.emit('match_found', { match_id: matchId });
      p2Socket.emit('match_found', { match_id: matchId });

      // Join the sockets into a dedicated Socket.io room
      p1Socket.join(matchId);
      p2Socket.join(matchId);

      // Initialize the authoritative Match State
      const match = new Match(this.io, matchId, p1Socket, p2Socket);
      match.startMatchSequence();
  }
}

module.exports = { Matchmaker };
