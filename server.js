require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const AuthManager = require('./src/AuthManager');
const { getPlayerData, query } = require('./src/db');
const EconomyManager = require('./src/EconomyManager');
const AuctionManager = require('./src/AuctionManager');
const PvEMatch = require('./src/PvEMatch');
const { Matchmaker } = require('./src/Matchmaker');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'velotype-secret-keyboard-cat',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
});
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

// Passport Config
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await AuthManager.login(email, password);
        return done(null, user);
    } catch (err) {
        return done(null, false, { message: err.message });
    }
}));

if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await AuthManager.findOrCreateGoogleUser(profile);
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await getPlayerData(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Serve the frontend client
app.use(express.static('public'));

// --- Auth Routes ---
app.post('/auth/signup', async (req, res) => {
    try {
        const user = await AuthManager.signup(req.body.email, req.body.password, req.body.username, req.body.chosenClass);
        req.login(user, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, user });
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/auth/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: info.message });
        req.login(user, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, user });
        });
    })(req, res, next);
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/#login' }), (req, res) => {
    res.redirect('/#hub');
});

app.get('/auth/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});

app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

const io = new Server(server, {
  cors: { origin: '*' } // Adjust in production
});

// Share session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});
io.use((socket, next) => {
    passport.initialize()(socket.request, {}, next);
});
io.use((socket, next) => {
    passport.session()(socket.request, {}, next);
});

// Initialize the global Matchmaker instance
const matchmaker = new Matchmaker(io);

io.on('connection', async (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Auto-auth via session
  const user = socket.request.user;
  if (user) {
      socket.player = user;
      socket.isAuthenticated = true;
      console.log(`[Socket Auth] Auto-connected ${user.username}`);
      socket.emit('auth_success', { player: user });
  }

  // Handle manual login/legacy auth
  socket.on('auth', async (payload) => {
    try {
      if (payload.player_id) {
          const playerData = await getPlayerData(payload.player_id);
          if (playerData) {
              socket.player = playerData;
              socket.isAuthenticated = true;
              socket.emit('auth_success', { player: playerData });
          }
      }
    } catch (err) {
        console.error(err);
    }
  });

  // --- Economy Actions ---
  socket.on('buy_box', async (data) => {
    if (!socket.isAuthenticated) return socket.emit('economy_error', { message: 'Not authenticated' });
    try {
        const result = await EconomyManager.purchaseLootbox(socket.player.id, data.boxName);
        socket.emit('lootbox_result', result);
        socket.emit('balance_update', { coins: result.newBalance });
    } catch (err) {
        socket.emit('economy_error', { message: err.message });
    }
  });

  // --- Auction Actions ---
  socket.on('get_auctions', async () => {
    if (!socket.isAuthenticated) return socket.emit('auction_error', { message: 'Not authenticated' });
    try {
        const auctions = await AuctionManager.getActiveAuctions();
        socket.emit('auction_list', auctions);
    } catch (err) {
        socket.emit('auction_error', { message: err.message });
    }
  });

  socket.on('list_item', async (data) => {
    if (!socket.isAuthenticated) return socket.emit('auction_error', { message: 'Not authenticated' });
    try {
        const result = await AuctionManager.listItem(socket.player.id, data.inventoryId, data.price, data.hours);
        socket.emit('item_listed', result);
        const auctions = await AuctionManager.getActiveAuctions();
        io.emit('auction_list', auctions);
    } catch (err) {
        socket.emit('auction_error', { message: err.message });
    }
  });

  socket.on('place_bid', async (data) => {
    if (!socket.isAuthenticated) return socket.emit('auction_error', { message: 'Not authenticated' });
    try {
        const result = await AuctionManager.placeBid(socket.player.id, data.auctionId, data.amount);
        socket.emit('bid_success', result);
        const auctions = await AuctionManager.getActiveAuctions();
        io.emit('auction_list', auctions);
    } catch (err) {
        socket.emit('auction_error', { message: err.message });
    }
  });

  socket.on('find_match', (data) => {
    if (socket.isAuthenticated) matchmaker.handleFindMatch(socket, data);
  });

  socket.on('start_pve', (data) => {
    if (socket.isAuthenticated) matchmaker.handleStartPvE(socket, data);
  });

  socket.on('cancel_matchmaking', () => {
    matchmaker.removePlayerFromQueue(socket.id);
  });

  socket.on('disconnect', () => {
    if (socket.isAuthenticated) matchmaker.removePlayerFromQueue(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`[Velotype Server] Listening on port ${PORT}`);
  // Start the periodic matchmaking evaluation loop
  matchmaker.startEvaluationLoop();
});

// Periodically resolve auctions
setInterval(async () => {
    try {
        const resolved = await AuctionManager.resolveExpiredAuctions();
        if (resolved.length > 0) {
            console.log(`[Auction] Resolved ${resolved.length} auctions.`);
            // Refresh list for everyone if something changed
            const auctions = await AuctionManager.getActiveAuctions();
            io.emit('auction_list', auctions);
        }
    } catch (err) {
        console.error('[Auction] Resolution loop error:', err);
    }
}, 60000); // Every minute