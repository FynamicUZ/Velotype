const SocketManager = (() => {
    let socket;
    let initialized = false;

    const init = () => {
        if (initialized) return;
        // Don't auto-connect here, UI will call connect() after auth check
        initialized = true;
    };

    const connect = () => {
        if (socket && socket.connected) return;
        
        socket = io();

        socket.on('connect', () => {
            console.log('[Socket] Connected to server');
        });

        socket.on('auth_success', (data) => {
            console.log('[Socket] Authenticated as:', data.player.username);
            if (window.UI) window.UI.updatePlayerUI(data.player);
        });

        socket.on('balance_update', (data) => {
            if (window.UI) window.UI.updateBalance(data.coins);
        });

        // Matchmaking
        socket.on('match_found', (data) => {
            console.log('[Socket] Match found!', data);
            if (window.UI) window.UI.showScreen('arena-screen');
            if (window.InputManager) window.InputManager.startMatch(data);
        });

        socket.on('opponent_update', (data) => {
            if (window.InputManager) window.InputManager.updateOpponent(data);
        });

        // Economy & Auctions
        socket.on('lootbox_result', (data) => {
            if (window.ShopManager) window.ShopManager.handleLootboxResult(data);
        });

        socket.on('auction_list', (data) => {
            if (window.AuctionHouseManager) window.AuctionHouseManager.renderAuctions(data);
        });

        socket.on('error', (data) => {
            console.error('[Socket Error]', data.message);
        });
    };

    const findMatch = () => {
        if (socket) socket.emit('find_match', { class: 'Assassin' }); // Class is now server-side fixed, but keeping for compatibility
    };

    const startPvE = () => {
        if (socket) socket.emit('start_pve');
    };

    const buyBox = (boxName) => {
        if (socket) socket.emit('buy_box', { boxName });
    };

    const getAuctions = () => {
        if (socket) socket.emit('get_auctions');
    };

    const placeBid = (auctionId, amount) => {
        if (socket) socket.emit('place_bid', { auctionId, amount });
    };

    const emit = (event, data) => {
        if (socket) socket.emit(event, data);
    };

    const instance = {
        init,
        connect,
        findMatch,
        startPvE,
        buyBox,
        getAuctions,
        placeBid,
        emit,
        getSocket: () => socket
    };
    window.SocketManager = instance;
    return instance;
})();

SocketManager.init();
