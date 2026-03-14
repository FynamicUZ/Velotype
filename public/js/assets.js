// public/js/assets.js

const AssetsManager = (() => {
    // 1. Define all assets needing preloading before matchmaking
    const IMAGE_SOURCES = {
        bg: 'assets/bg_dark.png',
        hero_idle: 'assets/hero_idle.png',
        hero_attack: 'assets/hero_attack.png',
        enemy_idle: 'assets/enemy_idle.png',
        enemy_attack: 'assets/enemy_attack.png',
        weapon_glow: 'assets/weapon_glow.png'
    };

    const images = {};
    let loadedCount = 0;
    const totalCount = Object.keys(IMAGE_SOURCES).length;

    // We don't have real art assets yet. We will mock the preloader 
    // to instantly return success by creating tiny 1x1 base64 transparent images
    // to prevent the Canvas API from crashing during MVP development.
    const createMockImage = (srcName) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                images[srcName] = img;
                loadedCount++;
                resolve(img);
            };
            // 1x1 transparent PNG
            img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; 
        });
    };

    const loadAll = async () => {
        console.log('[AssetsManager] Starting to preload core textures...');
        
        try {
            const promises = Object.keys(IMAGE_SOURCES).map(key => createMockImage(key));
            await Promise.all(promises);
            console.log(`[AssetsManager] Successfully cached ${loadedCount}/${totalCount} image primitives inside RAM.`);
        } catch (err) {
            console.error('[AssetsManager] Failed to preload assets.', err);
        }
    };

    const get = (key) => {
        if (!images[key]) console.warn(`Asset map MISS for key: ${key}`);
        return images[key] || null;
    };

    return {
        loadAll,
        get
    };
})();
