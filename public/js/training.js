// public/js/training.js

const TrainingMode = (() => {
    let isTraining = false;

    const start = () => {
        if (isTraining) return; // Prevent double start
        isTraining = true;
        console.log('[Training] Starting local sandbox...');

        // 1. Prepare offline Match Data
        const dummyWords = getShuffledTrainingWords(50);
        
        const myData = { username: "You (Training)", hp: 100, max_hp: 100 };
        const dummyOpponent = { username: "Practice Dummy", hp: Infinity, max_hp: Infinity };

        // 2. Initialize UI for Arena
        UI.setupArena(myData, dummyOpponent);

        // 3. Load input engine with local words
        InputEngine.loadMatchData(dummyWords);
        
        // 4. Start Local Visuals
        window.GameEngine.startLoop();

        // 5. Short countdown simulation
        let count = 3;
        const interval = setInterval(() => {
            console.log(`[Training] Countdown: ${count}`);
            UI.showCountdown(count);
            count--;
            if (count < 0) {
                clearInterval(interval);
                InputEngine.setIsActive(true);
                console.log('[Training] Fight!');
            }
        }, 1000);
    };

    const stop = () => {
        isTraining = false;
        InputEngine.setIsActive(false);
        window.GameEngine.stopLoop();
    };

    const instance = {
        start,
        stop
    };
    window.TrainingMode = instance;
    return instance;
})();
