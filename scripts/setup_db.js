require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const https = require('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Complexity (m) = 1.0 + (Length * 0.1) + (RareChars * 0.3)
function calculateDifficulty(word) {
  const length = word.length;
  const rareCharsCount = (word.match(/[xzqj]/gi) || []).length;
  const m = 1.0 + (length * 0.1) + (rareCharsCount * 0.3);
  
  if (m <= 1.5) return 1; // Level 1: Simple and short words
  if (m <= 2.2) return 2; // Level 2: Medium complexity
  return 3;               // Level 3: Long or complex words
}

async function downloadWords() {
    console.log('Downloading words dictionary from dwyl/english-words...');
    return new Promise((resolve, reject) => {
        https.get('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const words = data.split('\n').map(w => w.trim()).filter(w => w.length >= 3);
                resolve(words);
            });
        }).on('error', reject);
    });
}

async function setupDatabase() {
  try {
    console.log('Connecting to PostgreSQL using DATABASE_URL...');
    
    // 1. Run schema.sql
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing db/schema.sql...');
    await pool.query(schemaSql);
    console.log('Schema tables created successfully (or already exist).');

    // 2. Fetch dictionary
    const words = await downloadWords();
    console.log(`Downloaded dataset containing ${words.length} valid words.`);

    // 3. Prevent duplicate huge inserts by checking current count
    const countRes = await pool.query('SELECT COUNT(*) FROM words_dictionary;');
    if (parseInt(countRes.rows[0].count) > 0) {
        console.log(`The 'words_dictionary' table already contains ${countRes.rows[0].count} words. Skipping seeding.`);
        console.log('If you wish to re-seed, truncate the table manually first.');
        return;
    }

    // 4. Batch insert words to prevent running out of memory
    console.log(`Categorizing complexities and seeding database...`);
    let queryText = 'INSERT INTO words_dictionary (word, difficulty_level) VALUES ';
    let values = [];
    let paramCount = 1;
    let batchCount = 0;
    const batchSizeLimit = 10000;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const difficulty = calculateDifficulty(word);
        
        queryText += `($${paramCount++}, $${paramCount++}),`;
        values.push(word, difficulty);

        if (values.length >= batchSizeLimit || i === words.length - 1) {
            queryText = queryText.slice(0, -1); // Remove trailing comma
            queryText += ' ON CONFLICT (word) DO NOTHING;';
            
            await pool.query(queryText, values);
            batchCount += values.length / 2;
            process.stdout.write(`\rInserted ${batchCount} words...`);
            
            // Reset for next batch
            queryText = 'INSERT INTO words_dictionary (word, difficulty_level) VALUES ';
            values = [];
            paramCount = 1;
        }
    }
    
    console.log('\nDatabase setup and dictionary seeding complete!');
    
    // Create an initial dummy player for testing
    console.log('Inserting dummy player for testing...');
    await pool.query(`
        INSERT INTO players (username, level, xp, max_hp, elo, coins)
        VALUES ('TestHero', 5, 1200, 150, 1050, 500)
        ON CONFLICT (username) DO NOTHING;
    `);
    console.log('Test player inserted.');

  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
       console.error('\n[Database Error] Connection refused. Is your PostgreSQL server running locally, and are the credentials in .env correct?');
    } else {
       console.error('\nError setting up database:', err);
    }
  } finally {
    pool.end();
  }
}

setupDatabase();
