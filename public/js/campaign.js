// public/js/campaign.js

const CampaignManager = (() => {
    let isActive = false;
    let currentStage = 0;

    const init = () => {
        console.log('[Campaign] Initializing...');
    };

    const startStage = (stageId) => {
        console.log(`[Campaign] Requesting Stage ${stageId}...`);
        // This will emit to the server via SocketManager
        SocketManager.startPvE(stageId);
    };

    const handleStageInit = (data) => {
        console.log('[Campaign] Stage data received:', data);
        // data contains boss info, words, and maybe specific mechanics
        UI.setupArena(data.player, data.boss);
        InputEngine.loadMatchData(data.words);
        window.GameEngine.startLoop();
        
        // Handle specific Boss mechanics visuals
        if (data.boss.mechanic === 'MIRROR') {
            console.log('[Campaign] THE MIRROR active. Reverse typing enabled.');
        }

        // 3-second countdown
        let count = 3;
        const interval = setInterval(() => {
            UI.showCountdown(count);
            count--;
            if (count < 0) {
                clearInterval(interval);
                InputEngine.setIsActive(true);
                console.log('[Campaign] FIGHT!');
            }
        }, 1000);
    };

    return {
        init,
        startStage,
        handleStageInit
    };
})();
