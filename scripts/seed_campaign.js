// scripts/seed_campaign.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loreParagraphs = [
  {
    boss_id: 1,
    text: "The shadows lengthen as the Glitch emerges from the static. Your keyboard feels heavy, the keys unyielding. In the void between bytes, there is only the rhythm of the void. Pulse... Echo... Decay.",
    time_limit: 20
  },
  {
    boss_id: 2,
    text: "Mirror, mirror, on the wall, who is the swiftest of them all? Reflection is perfection, but perfection is a trap. Turn your thoughts around, let the backward flow consume the forward path.",
    time_limit: 25
  },
  {
    boss_id: 6, // Act Boss
    text: "The convergence is complete. All your words, all your keystrokes, they were but fuel for the final entropy. The cursor blinks at the edge of existence. Delete the silence. Type the end.",
    time_limit: 30
  }
];

async function seed() {
  try {
    console.log('Seeding boss scripts...');
    for (const p of loreParagraphs) {
      await pool.query(
        'INSERT INTO boss_scripts (boss_id, text, time_limit) VALUES ($1, $2, $3)',
        [p.boss_id, p.text, p.time_limit]
      );
    }
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    await pool.end();
  }
}

seed();
