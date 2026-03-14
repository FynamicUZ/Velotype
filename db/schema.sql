-- Velotype PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cleanup (For clean reset on new providers)
DROP TABLE IF EXISTS transactions_log CASCADE;
DROP TABLE IF EXISTS auction_house CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS lootboxes CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS campaign_bosses CASCADE;
DROP TABLE IF EXISTS words_dictionary CASCADE;

-- Table: players
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    chosen_class VARCHAR(50),
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    max_hp INT DEFAULT 100,
    elo INT DEFAULT 1000,
    coins INT DEFAULT 0,
    shadow_boss_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: items
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- weapon, aura, skin
    rarity VARCHAR(20) NOT NULL, -- Common, Rare, Legendary
    animation_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: inventory
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    acquired_at TIMESTAMP DEFAULT NOW()
);

-- Table: lootboxes
CREATE TABLE lootboxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    cost_in_coins INT NOT NULL,
    drop_rates JSONB NOT NULL
);

-- Table: auction_house
CREATE TABLE auction_house (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES players(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    starting_price INT NOT NULL,
    current_bid INT DEFAULT 0,
    highest_bidder_id UUID REFERENCES players(id),
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: transactions_log
CREATE TABLE transactions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount INT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table: campaign_bosses
CREATE TABLE campaign_bosses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    hp INT NOT NULL,
    wpm_requirement INT NOT NULL,
    coins_reward INT NOT NULL,
    xp_reward INT NOT NULL,
    difficulty_rank INT NOT NULL -- 0, 1, 2...
);

-- Table: boss_scripts
CREATE TABLE boss_scripts (
    id SERIAL PRIMARY KEY,
    boss_id INT NOT NULL, -- references campaign_bosses(id) or stageId
    text TEXT NOT NULL,
    time_limit INT DEFAULT 20
);

-- Table: words_dictionary
CREATE TABLE words_dictionary (
    id SERIAL PRIMARY KEY,
    word VARCHAR(100) UNIQUE NOT NULL,
    difficulty_level INT NOT NULL
);

-- Index for fetching random words
CREATE INDEX idx_words_difficulty ON words_dictionary(difficulty_level);
