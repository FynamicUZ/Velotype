// public/js/input.js

const InputEngine = (() => {
    let isActive = false;
    let currentWord = "";
    let wordIndex = 0;
    let matchWords = [];
    
    // Typing Stats
    let correctCount = 0;
    let totalTyposThisWord = 0;
    let wordStartTime = 0;
    
    let comboMultiplier = 0;
    let isStunned = false;
    let isScrambled = false;
    
    // Super Attack State
    let isSuperAttack = false;
    let superAttackText = "";
    let superAttackDuration = 0;
    let superAttackStartTS = 0;

    // The callback provided by socket.js that sends the payload
    let dispatchAttack = null; 

    // --- State Management ---
    const init = (attackCallback) => {
        dispatchAttack = attackCallback;
        
        // Bind global keydown event once
        document.addEventListener('keydown', handleKeydown);
    };

    const loadMatchData = (wordsList) => {
        console.log(`[InputEngine] Loading match data: ${wordsList?.length} words`);
        matchWords = wordsList;
        wordIndex = 0;
        comboMultiplier = 0;
        UI.updateCombo(0);
        UI.updateWPM(0);
        resetStateForNextWord();
    };

    const resetStateForNextWord = () => {
        console.log(`[InputEngine] Resetting word. Index: ${wordIndex}`);
        if (matchWords && wordIndex < matchWords.length) {
            currentWord = matchWords[wordIndex].word;
            console.log(`[InputEngine] New word: ${currentWord}`);
            correctCount = 0;
            totalTyposThisWord = 0;
            wordStartTime = 0; // Won't start until first keystroke
            
            UI.displayTargetWord(currentWord, 0);
        } else {
            console.warn('[InputEngine] No more words or empty list.');
            // Out of words (this shouldn't happen before match ends ideally)
            UI.displayTargetWord('OUT OF AMMO', 0);
            isActive = false; 
        }
    };

    const setIsActive = (activeBool) => {
        isActive = activeBool;
        isStunned = false;
        isScrambled = false;
        isSuperAttack = false;
    };

    const startSuperAttack = (text, duration) => {
        isSuperAttack = true;
        superAttackText = text;
        superAttackDuration = duration;
        superAttackStartTS = Date.now();
        correctCount = 0;
        
        UI.showSuperAttack(true);
        UI.displaySuperAttack(superAttackText, 0);

        // Update timer bar locally
        const timerInterval = setInterval(() => {
            if (!isSuperAttack) {
                clearInterval(timerInterval);
                return;
            }
            const elapsed = (Date.now() - superAttackStartTS) / 1000;
            const remaining = Math.max(0, 100 - (elapsed / superAttackDuration) * 100);
            UI.updateSuperAttackTimer(remaining);
            if (elapsed >= superAttackDuration) {
                clearInterval(timerInterval);
                isSuperAttack = false;
                UI.showSuperAttack(false);
            }
        }, 100);
    };

    const applyDebuff = (type, duration) => {
        if (type === 'SCRAMBLE') {
            isScrambled = true;
            // Scramble the visual display instantly
            const scrambled = scrambleWord(currentWord);
            UI.displayTargetWord(scrambled, correctCount);
            setTimeout(() => {
                isScrambled = false;
                UI.displayTargetWord(currentWord, correctCount);
            }, duration);
        } else if (type === 'INTERRUPT') {
            // Delete last 2 letters locally
            correctCount = Math.max(0, correctCount - 2);
            UI.displayTargetWord(currentWord, correctCount);
        }
    };

    const scrambleWord = (word) => {
        return word.split('').sort(() => Math.random() - 0.5).join('');
    };

    // --- The Core Typing Physics Engine ---
    const handleKeydown = (e) => {
        if (!isActive || isStunned) return;

        if (isSuperAttack) {
            handleSuperAttackKey(e);
            return;
        }

        if (!currentWord) return;

        // Ignore meta keys
        if (e.key.length > 1) return;

        const typedChar = e.key.toLowerCase();
        const expectedChar = currentWord[correctCount].toLowerCase();

        // Start timer on first keystroke of a new word
        if (correctCount === 0 && wordStartTime === 0) {
            wordStartTime = Date.now();
        }

        if (typedChar === expectedChar) {
            // Hit
            correctCount++;
            
            // Reached the end of the word
            if (correctCount === currentWord.length) {
                handleWordCompletion();
            } else {
                UI.displayTargetWord(isScrambled ? scrambleWord(currentWord) : currentWord, correctCount);
            }
        } else {
            // Miss
            handleTypo();
        }
    };

    const handleSuperAttackKey = (e) => {
        if (e.key.length > 1 && e.key !== 'Enter') return;
        
        const expectedChar = superAttackText[correctCount];
        const typedChar = e.key;

        if (typedChar === expectedChar) {
            correctCount++;
            UI.displaySuperAttack(superAttackText, correctCount);
            if (correctCount === superAttackText.length) {
                completeSuperAttack();
            }
        } else {
            // Typos in super attack just stall progress for 100ms
            isStunned = true;
            setTimeout(() => isStunned = false, 100);
        }
    };

    const completeSuperAttack = () => {
        isSuperAttack = false;
        UI.showSuperAttack(false);
        // Send a massive attack payload to the server
        const payload = {
            timestamp: Date.now(),
            wordIndex: 999, // Signal super attack complete
            typingSpeedWPM: 150, 
            typos: 0
        };
        dispatchAttack(payload);
    };

    const handleTypo = () => {
        totalTyposThisWord++;
        comboMultiplier = 0; // Combo broken
        UI.updateCombo(0);
        
        // --- Local Stun Prediction (0ms lag) ---
        isStunned = true;
        UI.displayTargetWord(currentWord, correctCount, correctCount); 
        
        // Lock keyboard for a short penalty duration
        setTimeout(() => {
            isStunned = false;
        }, 500);
    };

    const handleWordCompletion = () => {
        const timeTakenMs = Date.now() - wordStartTime;
        
        // Calculation: WPM = (Chars / 5) / (Time in Minutes)
        const timeInMins = timeTakenMs / 60000;
        const charsAsWords = currentWord.length / 5;
        let wpm = timeInMins > 0 ? charsAsWords / timeInMins : 0;
        
        // Cap WPM artificially
        if (wpm > 300) wpm = 300; 

        // Update Combo
        if (totalTyposThisWord === 0) {
            comboMultiplier++;
        }
        
        UI.updateCombo(comboMultiplier);
        UI.updateWPM(wpm);

        // 0ms Perceived Lag: Instantly trigger local attack animation
        if(window.GameEngine) window.GameEngine.triggerLocalAttack();

        // Dispatch Timestamped Payload to server
        if (dispatchAttack) {
            dispatchAttack({
                timestamp: Date.now(),
                wordIndex: wordIndex,
                typingSpeedWPM: wpm,
                typos: totalTyposThisWord
            });
        }

        // Move to next word
        wordIndex++;
        resetStateForNextWord();
    };

    const engineInstance = {
        init,
        loadMatchData,
        setIsActive,
        applyDebuff,
        startSuperAttack
    };
    window.InputEngine = engineInstance;
    return engineInstance;
})();
