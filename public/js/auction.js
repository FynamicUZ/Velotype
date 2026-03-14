const AuctionHouseManager = (() => {
    let auctionList;
    let initialized = false;

    const init = () => {
        if (initialized) return;
        auctionList = document.getElementById('auction-list');
        
        // Initial fetch
        if(window.SocketManager) window.SocketManager.getAuctions();
        initialized = true;
    };

    const renderAuctions = (auctions) => {
        if (!auctionList) auctionList = document.getElementById('auction-list');
        if (!auctionList) return;
        
        auctionList.innerHTML = '';

        if (auctions.length === 0) {
            auctionList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No active auctions. Check back later!</p>';
            return;
        }

        auctions.forEach(auction => {
            const card = document.createElement('div');
            card.className = `item-card`;
            
            const timeRemaining = getTimeRemaining(auction.expires_at);
            
            card.innerHTML = `
                <div class="rarity-badge ${auction.rarity.toLowerCase()}">${auction.rarity}</div>
                <h3>${auction.item_name}</h3>
                <p style="font-size: 0.75rem;">Seller: ${auction.seller_name}</p>
                <div style="margin: 1.5rem 0;">
                    <p style="font-weight: 700; font-size: 1.125rem;">${auction.current_bid} Coins</p>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">Ends in: ${timeRemaining}</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="number" class="bid-input" style="flex: 1; padding: 0.5rem;" placeholder=">${auction.current_bid}" min="${auction.current_bid + 1}">
                    <button class="bid-btn" data-id="${auction.id}" style="width: auto;">Bid</button>
                </div>
            `;

            const bidBtn = card.querySelector('.bid-btn');
            const bidInput = card.querySelector('.bid-input');

            bidBtn.addEventListener('click', () => {
                const amount = parseInt(bidInput.value);
                if (amount > auction.current_bid) {
                    window.SocketManager.placeBid(auction.id, amount);
                } else {
                    alert('Bid must be higher than ' + auction.current_bid);
                }
            });

            auctionList.appendChild(card);
        });
    };

    const getTimeRemaining = (expiry) => {
        const ms = new Date(expiry) - new Date();
        if (ms <= 0) return 'Expired';
        
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${mins}m`;
    };

    const instance = {
        init,
        renderAuctions
    };
    window.AuctionHouseManager = instance;
    return instance;
})();
