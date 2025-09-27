// --- Helper for API Requests ---
// This would ideally be in a separate utility file
async function apiRequest(endpoint, method, body, tokenKey) {
    const token = sessionStorage.getItem(tokenKey);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(endpoint, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
    }
    return response.json();
}


// --- Game Selection Scene ---
class GameSelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameSelectionScene' });
    }

    create() {
        this.add.text(400, 50, 'Choose Your Game', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        // Check for login
        const user = JSON.parse(sessionStorage.getItem('casinoUser'));
        if (!user) {
            this.add.text(400, 300, 'Please log in first.', { fontSize: '24px', fill: '#ff0000' }).setOrigin(0.5);
            // In a real game, you'd redirect to the login page.
            // For now, we'll just show a message.
            return;
        }

        apiRequest('/api/games', 'GET', null, 'casinoUserToken')
            .then(games => {
                let y = 150;
                games.forEach(game => {
                    const gameText = this.add.text(400, y, game.name, { fontSize: '24px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 5 } })
                        .setOrigin(0.5)
                        .setInteractive();

                    gameText.on('pointerdown', () => {
                        this.registry.set('selectedGame', game);
                        this.scene.start('SlotMachineScene');
                    });
                     gameText.on('pointerover', () => gameText.setStyle({ fill: '#ff0' }));
                    gameText.on('pointerout', () => gameText.setStyle({ fill: '#fff' }));

                    y += 60;
                });
            })
            .catch(error => {
                console.error('Error fetching games:', error);
                this.add.text(400, 300, 'Error loading games', { fontSize: '24px', fill: '#ff0000' }).setOrigin(0.5);
            });
    }
}


// --- Slot Machine Scene ---
class SlotMachineScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SlotMachineScene' });
        this.reels = [];
        this.symbolTextures = new Map();
    }

    preload() {
        this.load.image('spinButton', 'assets/spin_button.png'); // Placeholder
        // Dynamically load symbol images based on game data in create()
    }

    create() {
        const selectedGame = this.registry.get('selectedGame');
        this.user = JSON.parse(sessionStorage.getItem('casinoUser'));
        this.gameId = selectedGame.id;

        // --- UI Elements ---
        this.add.text(400, 50, selectedGame.name, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        this.balanceText = this.add.text(10, 10, `Balance: ${this.user.balance.toFixed(2)}`, { fontSize: '18px', fill: '#fff' });
        this.winningsText = this.add.text(400, 450, '', { fontSize: '24px', fill: '#ffd700' }).setOrigin(0.5);

        // --- Reel Display ---
        const reelPositions = [150, 275, 400, 525, 650]; // X positions for 5 reels
        reelPositions.forEach(x => {
            // Create a container for each reel to manage symbols
            const reelContainer = this.add.container(x, 300);
            this.reels.push(reelContainer);
        });

        // --- Spin Button ---
        const spinButton = this.add.text(400, 550, 'SPIN', { fontSize: '32px', fill: '#0f0', backgroundColor: '#555', padding: {x: 20, y: 10}}).setOrigin(0.5).setInteractive();
        spinButton.on('pointerdown', () => this.spin());

        // Initial load of symbols
        this.loadSymbols(selectedGame.symbols);
    }

    loadSymbols(symbols) {
        // symbols is expected to be an array of { id, url }
        let loadedCount = 0;
        symbols.forEach(symbol => {
            this.load.image(symbol.id, symbol.url);
            this.symbolTextures.set(symbol.id, symbol.url);
        });
        this.load.once('complete', () => {
             // Now that textures are loaded, we can display initial reels
             this.displayReels([symbols[0].id, symbols[0].id, symbols[0].id, symbols[0].id, symbols[0].id]); // Default display
        });
        this.load.start();
    }

    displayReels(reelResults) {
        // reelResults is an array of symbol IDs
        reelResults.forEach((symbolId, i) => {
            const reelContainer = this.reels[i];
            reelContainer.removeAll(true); // Clear previous symbols
            const textureUrl = this.symbolTextures.get(symbolId);
            if (textureUrl) {
                 const symbolImage = this.add.image(0, 0, symbolId).setScale(0.5); // Adjust scale as needed
                 reelContainer.add(symbolImage);
            }
        });
    }

    async spin() {
        if (this.isSpinning) return;

        const betAmount = 10; // Hardcoded for now
        if (this.user.balance < betAmount) {
            this.winningsText.setText('Insufficient balance.');
            return;
        }

        this.isSpinning = true;
        this.winningsText.setText('');

        // Start visual spin animation
        const animationDuration = 2000; // 2 seconds of spinning
        const symbolIds = Array.from(this.symbolTextures.keys());

        const spinningReels = this.reels.map((reelContainer, index) => {
            return this.time.addEvent({
                delay: 100, // Change symbol every 100ms
                loop: true,
                callback: () => {
                    reelContainer.removeAll(true);
                    const randomSymbolId = Phaser.Math.RND.pick(symbolIds);
                    const symbolImage = this.add.image(0, 0, randomSymbolId).setScale(0.5);
                    reelContainer.add(symbolImage);
                }
            });
        });

        try {
            const data = await apiRequest('/api/spin', 'POST', {
                userId: this.user.id,
                betAmount,
                gameId: this.gameId
            }, 'casinoUserToken');

            // After animation duration, stop the visual spin and show results
            this.time.delayedCall(animationDuration, () => {
                spinningReels.forEach(timer => timer.remove());

                this.user.balance = data.newBalance;
                sessionStorage.setItem('casinoUser', JSON.stringify(this.user));
                this.balanceText.setText(`Balance: ${data.newBalance.toFixed(2)}`);
                this.displayReels(data.reels);
                if (data.winnings > 0) {
                    this.showWinAnimation(data.winnings, data.winningLine);
                } else {
                    this.winningsText.setText('Try Again!');
                }
                this.user.balance = data.newBalance;
                sessionStorage.setItem('casinoUser', JSON.stringify(this.user));
                this.balanceText.setText(`Balance: ${data.newBalance.toFixed(2)}`);
                this.isSpinning = false;
            });

        } catch (err) {
            spinningReels.forEach(timer => timer.remove());
            this.winningsText.setText(`Error: ${err.message}`);
            this.isSpinning = false;
        }
    }

    showWinAnimation(winningsAmount, winningLine) {
        // Flash the win text
        this.winningsText.setText(`YOU WON: ${winningsAmount}!`);
        this.tweens.add({
            targets: this.winningsText,
            alpha: { from: 0.5, to: 1 },
            ease: 'Linear',
            duration: 200,
            repeat: 5, // -1 for infinite loop
            yoyo: true,
        });

        // Highlight the winning symbols
        if (winningLine && winningLine.length > 0) {
            winningLine.forEach(reelIndex => {
                const reelContainer = this.reels[reelIndex];
                if (reelContainer.list[0]) {
                    this.tweens.add({
                        targets: reelContainer.list[0], // The symbol image
                        scale: { from: 0.5, to: 0.6 },
                        ease: 'Power1',
                        duration: 300,
                        repeat: 3,
                        yoyo: true,
                    });
                }
            });
        }
    }
}


// --- Phaser Game Config ---
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a1a1a',
    scene: [GameSelectionScene, SlotMachineScene]
};

const game = new Phaser.Game(config);