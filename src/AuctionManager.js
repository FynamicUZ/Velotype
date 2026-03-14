const { query } = require('./db');
const { v4: uuidv4 } = require('uuid');

class AuctionManager {
    /**
     * Lists an item from a player's inventory on the auction house.
     */
    static async listItem(playerId, inventoryId, startingPrice, durationHours) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + durationHours);

        const client = await query('BEGIN');
        try {
            // 1. Verify ownership and that it's not already locked
            const itemRes = await query(
                'SELECT i.*, it.name FROM inventory i JOIN items it ON i.item_id = it.id WHERE i.id = $1 AND i.player_id = $2 FOR UPDATE',
                [inventoryId, playerId]
            );

            if (itemRes.rowCount === 0) throw new Error('Item not found in inventory.');
            if (itemRes.rows[0].is_locked) throw new Error('Item is already listed or locked.');

            // 2. Lock the item
            await query('UPDATE inventory SET is_locked = TRUE WHERE id = $1', [inventoryId]);

            // 3. Create Auction entry
            const auctionId = uuidv4();
            await query(
                `INSERT INTO auction_house (id, seller_id, inventory_id, starting_price, current_bid, expires_at, status)
                 VALUES ($1, $2, $3, $4, $4, $5, 'active')`,
                [auctionId, playerId, inventoryId, startingPrice, expiresAt]
            );

            // 4. Log transaction
            await query(
                `INSERT INTO transactions_log (player_id, transaction_type, amount, metadata)
                 VALUES ($1, 'auction_list', 0, $2)`,
                [playerId, JSON.stringify({ auction_id: auctionId, inventory_id: inventoryId, item_name: itemRes.rows[0].name })]
            );

            await query('COMMIT');
            return { success: true, auctionId, expiresAt };
        } catch (err) {
            await query('ROLLBACK');
            throw err;
        }
    }

    /**
     * Places a bid on an active auction. Handles escrow and outbid refunds.
     */
    static async placeBid(playerId, auctionId, bidAmount) {
        const client = await query('BEGIN');
        try {
            // 1. Get auction and lock it
            const auctionRes = await query(
                'SELECT * FROM auction_house WHERE id = $1 AND status = $2 FOR UPDATE',
                [auctionId, 'active']
            );
            if (auctionRes.rowCount === 0) throw new Error('Auction not found or inactive.');
            const auction = auctionRes.rows[0];

            if (new Date() > new Date(auction.expires_at)) {
                throw new Error('Auction has expired.');
            }

            if (bidAmount <= auction.current_bid) {
                throw new Error('Bid must be higher than the current bid.');
            }

            if (playerId === auction.seller_id) {
                throw new Error('You cannot bid on your own item.');
            }

            // 2. Check and deduct coins for the new bidder (Escrow)
            const bidderRes = await query('SELECT coins FROM players WHERE id = $1 FOR UPDATE', [playerId]);
            if (bidderRes.rows[0].coins < bidAmount) throw new Error('Insufficient coins for bid.');

            await query('UPDATE players SET coins = coins - $1 WHERE id = $2', [bidAmount, playerId]);

            // 3. Refund the previous bidder if exists
            if (auction.highest_bidder_id) {
                await query('UPDATE players SET coins = coins + $1 WHERE id = $2', [auction.current_bid, auction.highest_bidder_id]);
                
                // Log refund
                await query(
                    `INSERT INTO transactions_log (player_id, transaction_type, amount, metadata)
                     VALUES ($1, 'auction_outbid_refund', $2, $3)`,
                    [auction.highest_bidder_id, auction.current_bid, JSON.stringify({ auction_id: auctionId })]
                );
            }

            // 4. Update Auction record
            await query(
                'UPDATE auction_house SET current_bid = $1, highest_bidder_id = $2 WHERE id = $3',
                [bidAmount, playerId, auctionId]
            );

            // 5. Log the new bid
            await query(
                `INSERT INTO transactions_log (player_id, transaction_type, amount, metadata)
                 VALUES ($1, 'auction_bid', $2, $3)`,
                [playerId, bidAmount, JSON.stringify({ auction_id: auctionId })]
            );

            await query('COMMIT');
            return { success: true, newBid: bidAmount };
        } catch (err) {
            await query('ROLLBACK');
            throw err;
        }
    }

    /**
     * Resolves all expired auctions.
     */
    static async resolveExpiredAuctions() {
        const expiredRes = await query(
            "SELECT * FROM auction_house WHERE status = 'active' AND expires_at <= NOW() FOR UPDATE"
        );

        const results = [];
        for (const auction of expiredRes.rows) {
            const client = await query('BEGIN');
            try {
                if (auction.highest_bidder_id) {
                    // 1. Transfer item to winner
                    await query('UPDATE inventory SET player_id = $1, is_locked = FALSE WHERE id = $2', [auction.highest_bidder_id, auction.inventory_id]);
                    
                    // 2. Give coins to seller
                    await query('UPDATE players SET coins = coins + $1 WHERE id = $2', [auction.current_bid, auction.seller_id]);
                    
                    // 3. Mark auction as sold
                    await query("UPDATE auction_house SET status = 'sold' WHERE id = $1", [auction.id]);

                    results.push({ auctionId: auction.id, winner: auction.highest_bidder_id, seller: auction.seller_id, type: 'sold' });
                } else {
                    // No bids - return item to seller
                    await query('UPDATE inventory SET is_locked = FALSE WHERE id = $1', [auction.inventory_id]);
                    await query("UPDATE auction_house SET status = 'expired' WHERE id = $1", [auction.id]);
                    results.push({ auctionId: auction.id, seller: auction.seller_id, type: 'expired' });
                }
                await query('COMMIT');
            } catch (err) {
                await query('ROLLBACK');
                console.error(`Failed to resolve auction ${auction.id}:`, err);
            }
        }
        return results;
    }

    static async getActiveAuctions() {
        const res = await query(`
            SELECT ah.*, p.username as seller_name, it.name as item_name, it.rarity 
            FROM auction_house ah
            JOIN players p ON ah.seller_id = p.id
            JOIN inventory i ON ah.inventory_id = i.id
            JOIN items it ON i.item_id = it.id
            WHERE ah.status = 'active'
            ORDER BY ah.expires_at ASC
        `);
        return res.rows;
    }
}

module.exports = AuctionManager;
