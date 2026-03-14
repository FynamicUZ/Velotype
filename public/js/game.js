// public/js/game.js

const GameEngine = (() => {
    let canvas, ctx;
    let isRunning = false;
    let lastTime = 0;
    let particles = [];

    // Game state data
    let p1State = { state: 'IDLE', frame: 0, class: 'assassin' };
    let p2State = { state: 'IDLE', frame: 0, class: 'juggernaut' };

    // Canvas dimensions are dynamic
    const init = () => {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    };

    const resize = () => {
        const container = document.getElementById('canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    };

    // --- State Machine Updaters ---
    const triggerLocalAttack = () => {
         p1State.state = 'ATTACK';
         p1State.frame = 0; 
         createExplosion(canvas.width * 0.3, canvas.height * 0.6, 'var(--neon-blue)');
    };

    const triggerOpponentAttack = () => {
         p2State.state = 'ATTACK';
         p2State.frame = 0; 
         createExplosion(canvas.width * 0.7, canvas.height * 0.6, 'var(--neon-red)');
    };

    const triggerOpponentHurt = () => {
         p2State.state = 'HURT';
         p2State.frame = 0;
         createExplosion(canvas.width * 0.8, canvas.height * 0.6, '#fff');
    };
    
    const triggerLocalHurt = () => {
         p1State.state = 'HURT';
         p1State.frame = 0;
         createExplosion(canvas.width * 0.2, canvas.height * 0.6, '#fff');
    };

    // --- Particle System ---
    const createExplosion = (x, y, color) => {
        for(let i=0; i<20; i++){
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color
            });
        }
    };

    const updateParticles = (dt) => {
        particles.forEach(p => {
            p.x += p.vx * (dt / 16);
            p.y += p.vy * (dt / 16);
            p.life -= 0.02 * (dt / 16);
        });
        particles = particles.filter(p => p.life > 0);
    };

    const drawParticles = () => {
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    };

    // --- Render Loop with Standardized DeltaTime ---
    const startLoop = () => {
        if(isRunning) return;
        isRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(renderLoop);
    };

    const stopLoop = () => {
        isRunning = false;
    };

    const renderLoop = (timestamp) => {
        if (!isRunning) return;

        // 1. DeltaTime Calculation (essential for physics across 60 vs 144hz monitors)
        // Ensure minimum 1ms to avoid division by zero
        let deltaTime = timestamp - lastTime || 1; 
        lastTime = timestamp;

        // 2. Clear Screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 3. Optional Background
        const bg = AssetsManager.get('bg');
        if (bg) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

        // 4. Update Game State visually using deltaTime where physics apply
        updateParticles(deltaTime);
        
        drawPlayer(p1State, true, deltaTime);
        drawPlayer(p2State, false, deltaTime);
        drawParticles();

        requestAnimationFrame(renderLoop);
    };

    // Refined skeletal silhouette drawing
    const drawPlayer = (playerRef, isP1, dt) => {
        ctx.save();
        
        const h = 250;
        const w = 80;
        const groundY = canvas.height - 100;
        
        let x = isP1 ? canvas.width * 0.25 : canvas.width * 0.75;
        
        // Handle Animations
        let offset = 0;
        let color = '#111';
        let glowColor = 'transparent';

        if (playerRef.state === 'ATTACK') {
            playerRef.frame += dt;
            offset = isP1 ? 100 : -100;
            color = isP1 ? 'var(--neon-blue)' : 'var(--neon-red)';
            glowColor = color;
            if (playerRef.frame > 200) playerRef.state = 'IDLE';
        } else if (playerRef.state === 'HURT') {
            playerRef.frame += dt;
            offset = isP1 ? -20 : 20;
            color = '#333';
            if (playerRef.frame > 300) playerRef.state = 'IDLE';
        }

        const currentX = x + (offset * Math.min(1, playerRef.frame / 100));

        // Neon Glow Aura
        if (glowColor !== 'transparent') {
            ctx.shadowBlur = 20;
            ctx.shadowColor = glowColor;
        }

        // Draw Silhouette Parts (Head, Body, Limbs)
        ctx.fillStyle = color;
        
        // Body
        ctx.fillRect(currentX - w/2, groundY - h*0.7, w, h*0.5);
        // Head
        ctx.beginPath();
        ctx.arc(currentX, groundY - h*0.85, 25, 0, Math.PI*2);
        ctx.fill();
        // Legs
        ctx.fillRect(currentX - w/2, groundY - h*0.2, 20, h*0.2);
        ctx.fillRect(currentX + w/2 - 20, groundY - h*0.2, 20, h*0.2);
        
        // Weapon Glow Strip
        if (playerRef.state === 'ATTACK') {
            ctx.fillStyle = '#fff';
            const weaponX = isP1 ? currentX + 40 : currentX - 60;
            ctx.fillRect(weaponX, groundY - h*0.6, 10, 100);
        }

        ctx.restore();
    };

    const setPlayerClasses = (p1Class, p2Class) => {
        p1State.class = p1Class;
        p2State.class = p2Class;
    };

    // Attach to window so InputEngine can trigger instant feedback
    return {
        init,
        startLoop,
        stopLoop,
        triggerLocalAttack,
        triggerOpponentAttack,
        triggerLocalHurt,
        triggerOpponentHurt,
        setPlayerClasses
    };
})();

// Attach globally
window.GameEngine = GameEngine;
