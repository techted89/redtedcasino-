// --- Game Selection Scene ---
class GameSelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameSelectionScene' });
    }

    create() {
        this.add.text(400, 50, 'Choose Your Game', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        const user = JSON.parse(sessionStorage.getItem('casinoUser'));
        if (!user) {
            this.add.text(400, 300, 'Please log in first.', { fontSize: '24px', fill: '#ff0000' }).setOrigin(0.5);
            this.time.delayedCall(2000, () => window.location.href = 'index.html');
            return;
        }

        apiRequest('/api/games', 'GET', null, 'casinoUserToken')
            .then(games => {
                let y = 150;
                games.forEach(gameData => {
                    const gameText = this.add.text(400, y, gameData.name, { fontSize: '24px', fill: '#fff', backgroundColor: '#333', padding: { x: 10, y: 5 } })
                        .setOrigin(0.5)
                        .setInteractive();

                    gameText.on('pointerdown', () => {
                        this.scene.start('SlotMachineScene', { gameData });
                    });
                    gameText.on('pointerover', () => gameText.setStyle({ fill: '#ff0' }));
                    gameText.on('pointerout', () => gameText.setStyle({ fill: '#fff' }));
                    y += 60;
                });
            })
            .catch(error => {
                console.error('Error fetching games:', error);
                this.add.text(400, 300, 'Error loading games. Please try again.', { fontSize: '24px', fill: '#ff0000' }).setOrigin(0.5);
            });
    }
}

// --- Unified Slot Machine Scene ---
class SlotMachineScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SlotMachineScene' });
    }

    init(data) {
        this.gameData = data.gameData;
        this.user = JSON.parse(sessionStorage.getItem('casinoUser'));
        this.token = sessionStorage.getItem('casinoUserToken');
        this.reels = [];
        this.isSpinning = false;
    }

    preload() {
        // Dynamically load assets based on the selected game
        this.load.image(`background_${this.gameData.id}`, this.gameData.backgroundImage);
        for (const key in this.gameData.symbols) {
            this.load.image(key, this.gameData.symbols[key]);
        }
    }

    create() {
        this.add.image(400, 300, `background_${this.gameData.id}`);
        this.reelsContainer = this.add.container(400, 300);

        this.createUI();
        this.initReels();
    }

    createUI() {
        this.add.text(400, 30, this.gameData.name, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        this.balanceText = this.add.text(20, 20, `Balance: ${this.user.balance.toFixed(2)}`, { fontSize: '20px', fill: '#fff' });
        this.winningsText = this.add.text(400, 500, '', { fontSize: '28px', fill: '#ffd700' }).setOrigin(0.5);
        this.add.text(20, 50, 'Update Password', { fontSize: '16px', fill: '#ccc' }).setInteractive().on('pointerdown', () => document.getElementById('password-modal').classList.remove('hidden'));
        this.add.text(20, 75, 'Request Withdrawal', { fontSize: '16px', fill: '#ccc' }).setInteractive().on('pointerdown', () => document.getElementById('withdrawal-modal').classList.remove('hidden'));
        this.add.text(780, 20, 'Back to Games', { fontSize: '16px', fill: '#ccc' }).setOrigin(1, 0).setInteractive().on('pointerdown', () => this.scene.start('GameSelectionScene'));

        this.betAmount = 10;
        this.betText = this.add.text(20, 550, `Bet: ${this.betAmount}`, { fontSize: '24px', fill: '#fff' });
        this.add.text(120, 540, '+', { fontSize: '32px', fill: '#0f0' }).setInteractive().on('pointerdown', () => this.changeBet(10));
        this.add.text(120, 560, '-', { fontSize: '32px', fill: '#f00' }).setInteractive().on('pointerdown', () => this.changeBet(-10));

        this.add.text(400, 550, 'SPIN', { fontSize: '32px', fill: '#0f0', backgroundColor: '#555', padding: {x: 20, y: 10}}).setOrigin(0.5).setInteractive().on('pointerdown', () => this.spin());
    }

    initReels() {
        const symbolKeys = Object.keys(this.gameData.symbols);
        const reelPositions = this.gameData.gameType === '5x1' ? [150, 275, 400, 525, 650] : [-240, -120, 0, 120, 240];

        reelPositions.forEach(x => {
            const reelContainer = this.add.container(x, 0);
            const randomSymbolKey = Phaser.Math.RND.pick(symbolKeys);
            const symbolImage = this.add.image(0, 0, randomSymbolKey).setScale(0.8);
            reelContainer.add(symbolImage);
            this.reels.push(reelContainer);
            this.reelsContainer.add(reelContainer);
        });
    }

    changeBet(amount) {
        const newBet = this.betAmount + amount;
        if (newBet >= 10) {
            this.betAmount = newBet;
            this.betText.setText(`Bet: ${this.betAmount}`);
        }
    }

    async spin() {
        if (this.isSpinning) return;
        if (this.user.balance < this.betAmount) {
            this.winningsText.setText('Insufficient Balance!');
            return;
        }
        this.isSpinning = true;
        this.winningsText.setText('');

        const symbolKeys = Object.keys(this.gameData.symbols);
        this.reels.forEach(reelContainer => {
            this.tweens.add({
                targets: reelContainer,
                y: reelContainer.y + 10,
                ease: 'Power2',
                duration: 100,
                yoyo: true,
                repeat: 5
            });
        });

        try {
            const data = await apiRequest('/api/spin', 'POST', {
                userId: this.user.id,
                betAmount: this.betAmount,
                gameId: this.gameData.id
            }, 'casinoUserToken');

            this.user.balance = data.newBalance;
            sessionStorage.setItem('casinoUser', JSON.stringify(this.user));
            this.balanceText.setText(`Balance: ${this.user.balance.toFixed(2)}`);
            this.displayResults(data.reels);

            if (data.winnings > 0) {
                this.winningsText.setText(`YOU WON: ${data.winnings}`);
            }

        } catch (err) {
            this.winningsText.setText(`Error: ${err.message}`);
        } finally {
            this.isSpinning = false;
        }
    }

    displayResults(resultReels) {
        resultReels.forEach((symbolUrl, i) => {
            const reelContainer = this.reels[i];
            reelContainer.removeAll(true);
            const symbolKey = Object.keys(this.gameData.symbols).find(key => this.gameData.symbols[key] === symbolUrl || key === symbolUrl);
            if(symbolKey) {
                const symbolImage = this.add.image(0, 0, symbolKey).setScale(0.8);
                reelContainer.add(symbolImage);
            }
        });
    }
}

// --- Phaser Game Config ---
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-container',
    backgroundColor: '#1a1a1a',
    scene: [GameSelectionScene, SlotMachineScene]
};

const game = new Phaser.Game(config);