const bcrypt = require('bcryptjs');
const { query } = require('./db');
const { v4: uuidv4 } = require('uuid');

class AuthManager {
    static async signup(email, password, username, chosenClass) {
        // Validate inputs
        if (!email || !password || !username || !chosenClass) {
            throw new Error('All fields are required');
        }

        // Check if user exists
        const existing = await query('SELECT id FROM players WHERE email = $1 OR username = $2', [email, username]);
        if (existing.rowCount > 0) {
            throw new Error('Email or Username already in use');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create player
        const playerId = uuidv4();
        await query(
            'INSERT INTO players (id, email, password_hash, username, chosen_class, level, elo, coins, max_hp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [playerId, email, hash, username, chosenClass, 1, 1000, 500, 100]
        );

        // Standard initialization (Inventory, etc if needed)
        // For now, assume fresh account
        
        return { id: playerId, username, email, chosen_class: chosenClass };
    }

    static async login(email, password) {
        const res = await query('SELECT * FROM players WHERE email = $1', [email]);
        if (res.rowCount === 0) {
            throw new Error('Invalid credentials');
        }

        const player = res.rows[0];
        const isMatch = await bcrypt.compare(password, player.password_hash);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        return player;
    }

    static async findOrCreateGoogleUser(profile) {
        const { id, emails, displayName } = profile;
        const email = emails[0].value;

        // Check if google_id exists
        const res = await query('SELECT * FROM players WHERE google_id = $1', [id]);
        if (res.rowCount > 0) {
            return res.rows[0];
        }

        // Check if email exists (link to google)
        const emailRes = await query('SELECT * FROM players WHERE email = $1', [email]);
        if (emailRes.rowCount > 0) {
            await query('UPDATE players SET google_id = $1 WHERE email = $2', [id, email]);
            return emailRes.rows[0];
        }

        // Create new player (missing chosen_class, will need to redirect to class selection if new)
        // For Google Auth, if it's a new user, we might need a two-step process to get chosen_class.
        // For now, create with null class and handle in frontend.
        const playerId = uuidv4();
        await query(
            'INSERT INTO players (id, email, google_id, username, level, elo, coins, max_hp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [playerId, email, id, displayName, 1, 1000, 500, 100]
        );

        const newRes = await query('SELECT * FROM players WHERE id = $1', [playerId]);
        return newRes.rows[0];
    }
}

module.exports = AuthManager;
