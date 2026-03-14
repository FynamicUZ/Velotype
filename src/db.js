require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Query 1 (Auth): Fetch player data when socket connects
async function getPlayerData(playerId) {
  const query = `
    SELECT id, username, level, elo, max_hp, shadow_boss_index, coins, chosen_class
    FROM players
    WHERE id = $1;
  `;
  try {
    const res = await pool.query(query, [playerId]);
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching player data:', err);
    throw err;
  }
}

// Query 2 (Pre-Match): Fetch words for the match
async function fetchMatchWords(averageLevel) {
  // Determine complexity based on level logic (placeholder logic)
  let difficultyLevel = 1;
  if (averageLevel > 10) difficultyLevel = 2;
  if (averageLevel > 20) difficultyLevel = 3;

  const query = `
    SELECT id, word, difficulty_level
    FROM words_dictionary
    WHERE difficulty_level = $1
    ORDER BY RANDOM()
    LIMIT 50;
  `;
  try {
    const res = await pool.query(query, [difficultyLevel]);
    return res.rows;
  } catch (err) {
    console.error('Error fetching match words:', err);
    throw err;
  }
}

// Query 3 (Post-Match): Update economy and ELO
async function updatePlayerPostMatch(playerId, eloChange, coinsEarned) {
  const query = `
    UPDATE players
    SET elo = elo + $2, coins = coins + $3
    WHERE id = $1
    RETURNING id, elo, coins;
  `;
  try {
    const res = await pool.query(query, [playerId, eloChange, coinsEarned]);
    return res.rows[0];
  } catch (err) {
    console.error('Error updating player post-match:', err);
    throw err;
  }
}

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
  getPlayerData,
  fetchMatchWords,
  updatePlayerPostMatch,
};
