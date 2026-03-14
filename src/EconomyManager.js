const { pool, query } = require('./db');

/**
 * EconomyManager handles transaction-safe economy operations:
 * purchasing lootboxes, RNG drops, and logging.
 */
class EconomyManager {
    static async purchaseLootbox(playerId, boxName) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Fetch Box Info
            const boxRes = await client.query('SELECT * FROM lootboxes WHERE name = $1', [boxName]);
            if (boxRes.rows.length === 0) throw new Error('Box not found');
            const box = boxRes.rows[0];

            // 2. Check & Deduct Coins
            const playerRes = await client.query('SELECT coins FROM players WHERE id = $1 FOR UPDATE', [playerId]);
            if (playerRes.rows.length === 0) throw new Error('Player not found');
            const currentCoins = playerRes.rows[0].coins;

            if (currentCoins < box.cost_in_coins) {
                throw new Error('Insufficient coins');
            }

            await client.query('UPDATE players SET coins = coins - $1 WHERE id = $2', [box.cost_in_coins, playerId]);

            // 3. RNG Roll Rarity
            const rarity = this._rollRarity(box.drop_rates);

            // 4. Fetch Random Item of that Rarity
            const itemRes = await client.query(
                'SELECT * FROM items WHERE rarity = $1 ORDER BY RANDOM() LIMIT 1',
                [rarity]
            );
            if (itemRes.rows.length === 0) throw new Error(`No items found for rarity: ${rarity}`);
            const item = itemRes.rows[0];

            // 5. Add to Inventory
            const invRes = await client.query(
                'INSERT INTO inventory (player_id, item_id) VALUES ($1, $2) RETURNING id',
                [playerId, item.id]
            );
            const inventoryId = invRes.rows[0].id;

            // 6. Log Transaction
            await client.query(
                'INSERT INTO transactions_log (player_id, type, amount, metadata) VALUES ($1, $2, $3, $4)',
                [playerId, 'buy_box', box.cost_in_coins, JSON.stringify({ box_name: boxName, item_id: item.id, rarity })]
            );

            await client.query('COMMIT');

            console.log(`[Economy] ${playerId} bought ${boxName} -> Received ${item.name} (${rarity})`);

            return {
                success: true,
                item: {
                    id: item.id,
                    inventory_id: inventoryId,
                    name: item.name,
                    rarity: item.rarity,
                    type: item.type,
                    animation_id: item.animation_id
                },
                newBalance: currentCoins - box.cost_in_coins
            };

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[Economy Error]', err.message);
            return { success: false, error: err.message };
        } finally {
            client.release();
        }
    }

    /**
     * _rollRarity: Selects a rarity based on JSON weights (e.g., {"Common": 80, "Rare": 15})
     */
    static _rollRarity(rates) {
        const roll = Math.random() * 100;
        let cumulative = 0;
        
        // Sort rarities to ensure deterministic roll Order
        const sortedRarities = Object.keys(rates).sort((a, b) => rates[a] - rates[b]); // Low to high probability
        
        // Re-sorting to high to low for easier cumulative subtraction or low to high for cumulative addition
        // Let's use simple cumulative addition
        for (const rarity of Object.keys(rates)) {
            cumulative += rates[rarity];
            if (roll <= cumulative) return rarity;
        }
        
        return 'Common'; // Fallback
    }
}

module.exports = EconomyManager;
