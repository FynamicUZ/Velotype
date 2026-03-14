const ShopManager = (() => {
    let unboxingOverlay, boxContainer, itemReveal, revealedItemName, revealedItemRarity, unboxingCloseBtn;
    let initialized = false;

    const init = () => {
        if (initialized) return;
        unboxingOverlay = document.getElementById('unboxing-overlay');
        boxContainer = document.getElementById('box-animation-container');
        itemReveal = document.getElementById('item-reveal');
        revealedItemName = document.getElementById('revealed-item-name');
        revealedItemRarity = document.getElementById('revealed-item-rarity');
        unboxingCloseBtn = document.getElementById('unboxing-close-btn');

        // Bind Box Cards
        document.querySelectorAll('.box-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const boxName = card.dataset.box;
                const formattedName = boxName.charAt(0).toUpperCase() + boxName.slice(1) + " Box";
                console.log(`[Shop] Buying box: ${formattedName}`);
                if (window.SocketManager) window.SocketManager.buyBox(formattedName);
            });
        });

        if (unboxingCloseBtn) {
            unboxingCloseBtn.addEventListener('click', () => {
                unboxingOverlay.classList.add('hidden');
                itemReveal.classList.add('hidden');
                // Don't clear boxContainer entirely, keep the emoji for next time
                boxContainer.innerHTML = '📦';
                boxContainer.className = 'shaking';
            });
        }
        initialized = true;
    };

    const handleLootboxResult = (result) => {
        if (!result || !result.item) return;

        if (unboxingOverlay) unboxingOverlay.classList.remove('hidden');
        if (boxContainer) {
            boxContainer.innerHTML = '📦';
            boxContainer.className = 'shaking';
        }
        
        // Simple unboxing sequence
        setTimeout(() => {
            if (boxContainer) {
                boxContainer.innerHTML = '💥';
                boxContainer.className = '';
            }
            
            setTimeout(() => {
                if (boxContainer) boxContainer.innerHTML = '';
                showItemReveal(result.item);
            }, 800);
        }, 1500);
    };

    const showItemReveal = (item) => {
        if (itemReveal) itemReveal.classList.remove('hidden');
        if (revealedItemName) revealedItemName.innerText = item.name;
        if (revealedItemRarity) {
            revealedItemRarity.innerText = item.rarity.toUpperCase();
            revealedItemRarity.className = `rarity-badge ${item.rarity.toLowerCase()}`;
        }
    };

    const instance = {
        init,
        handleLootboxResult
    };
    window.ShopManager = instance;
    return instance;
})();
