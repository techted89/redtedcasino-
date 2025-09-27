class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('background', 'http://redtedcasino.com/BearSlot/img/background.jpg');
        this.load.image('symbol1', 'https://www.kenney.nl/assets/generic-items/item_10.png');
        this.load.image('symbol2', 'https://www.kenney.nl/assets/generic-items/item_11.png');
        this.load.image('symbol3', 'https://www.kenney.nl/assets/generic-items/item_12.png');
        this.load.image('symbol4', 'https://www.kenney.nl/assets/generic-items/item_13.png');
        this.load.image('symbol5', 'https://www.kenney.nl/assets/generic-items/item_14.png');
    }

    create() {
        // --- Auth & API Helper ---
        const params = new URLSearchParams(window.location.search);
        this.gameId = params.get('game');
        this.user = JSON.parse(sessionStorage.getItem('casinoUser'));
        this.token = sessionStorage.getItem('casinoUserToken');

        if (!this.user || !this.token || !this.gameId) {
            window.location.href = '/index.html';
            return;
        }

        // Add the background image
        this.add.image(400, 300, 'background');

        // Create a container for the reels
        this.reelsContainer = this.add.container(400, 300);
        this.reels = [];

        // Add placeholders for the 5 reels
        for (let i = 0; i < 5; i++) {
            const reelX = -240 + (i * 120);
            const reel = this.add.group();
            reel.x = reelX;
            this.reelsContainer.add(reel);
            this.reels.push(reel);
        }

        // Add a placeholder for the spin button
        this.spinButton = this.add.text(350, 550, 'Spin', { fontSize: '32px', fill: '#fff' })
            .setInteractive()
            .on('pointerdown', () => this.spin());

        // Add a placeholder for the winnings display
        this.winningsText = this.add.text(300, 50, '', { fontSize: '32px', fill: '#ff0' });

        // Add bet selection UI
        this.betAmount = 10;
        this.betText = this.add.text(50, 550, `Bet: ${this.betAmount}`, { fontSize: '24px', fill: '#fff' });
        const betUp = this.add.text(150, 540, '+', { fontSize: '32px', fill: '#fff' }).setInteractive();
        const betDown = this.add.text(150, 560, '-', { fontSize: '32px', fill: '#fff' }).setInteractive();

        betUp.on('pointerdown', () => {
            this.betAmount += 10;
            this.betText.setText(`Bet: ${this.betAmount}`);
        });

        betDown.on('pointerdown', () => {
            if (this.betAmount > 10) {
                this.betAmount -= 10;
                this.betText.setText(`Bet: ${this.betAmount}`);
            }
        });

        // Add balance display
        this.balanceText = this.add.text(550, 550, `Balance: ${this.user.balance}`, { fontSize: '24px', fill: '#fff' });

        // Add modal buttons
        const updatePasswordButton = this.add.text(50, 50, 'Update Password', { fontSize: '18px', fill: '#fff' }).setInteractive();
        const requestWithdrawalButton = this.add.text(50, 80, 'Request Withdrawal', { fontSize: '18px', fill: '#fff' }).setInteractive();

        updatePasswordButton.on('pointerdown', () => {
            document.getElementById('password-modal').classList.remove('hidden');
        });

        requestWithdrawalButton.on('pointerdown', () => {
            document.getElementById('withdrawal-modal').classList.remove('hidden');
        });
    }

    async spin() {
        if (this.isSpinning) return;

        if (this.user.balance < this.betAmount) {
            this.winningsText.setText('Insufficient balance.');
            return;
        }

        this.isSpinning = true;
        this.spinButton.disableInteractive();
        this.winningsText.setText('');

        // Deduct bet amount from balance immediately
        this.user.balance -= this.betAmount;
        this.balanceText.setText(`Balance: ${this.user.balance}`);

        // Start the spinning animation
        const spinningTweens = this.reels.map((reel, i) => {
            const symbols = ['symbol1', 'symbol2', 'symbol3', 'symbol4', 'symbol5'];
            const reelHeight = 100;
            const startY = -reelHeight * (symbols.length - 1);
            const endY = 0;

            reel.clear(true, true);
            for (let j = 0; j < symbols.length; j++) {
                const symbol = this.add.image(0, j * reelHeight, symbols[j]);
                reel.add(symbol);
            }

            return this.tweens.add({
                targets: reel,
                y: reel.y + 300,
                ease: 'Cubic.easeIn',
                duration: 500,
                yoyo: true,
                repeat: -1,
            });
        });

        try {
            const data = await apiRequest('/api/spin', 'POST', { userId: this.user.id, betAmount: this.betAmount, gameId: this.gameId }, 'casinoUserToken');

            this.user.balance = data.newBalance;
            sessionStorage.setItem('casinoUser', JSON.stringify(this.user));

            // Dynamically load the result symbols
            data.reels.forEach((url, i) => {
                const key = `result_symbol_${i}`;
                this.load.image(key, url);
            });

            this.load.once('complete', () => {
                spinningTweens.forEach(tween => {
                    tween.stop();
                    const reel = tween.targets[0];
                    reel.y = 0;
                });

                this.reels.forEach((reel, i) => {
                    reel.clear(true, true);
                    const key = `result_symbol_${i}`;
                    const symbol = this.add.image(0, 0, key);
                    reel.add(symbol);

                    if (data.winnings > 0) {
                        this.tweens.add({
                            targets: symbol,
                            scaleX: 1.2,
                            scaleY: 1.2,
                            duration: 250,
                            ease: 'Sine.easeInOut',
                            yoyo: true,
                            repeat: 3
                        });
                    }
                });

                if (data.winnings > 0) {
                    this.winningsText.setText(`YOU WON: ${data.winnings}!`);
                }

                this.balanceText.setText(`Balance: ${this.user.balance}`);
                this.isSpinning = false;
                this.spinButton.setInteractive();
            });

            this.load.start();

        } catch (err) {
            this.winningsText.setText(`Error: ${err.message}`);
            this.isSpinning = false;
            this.spinButton.setInteractive();
            // Refund bet if spin failed
            this.user.balance += this.betAmount;
            this.balanceText.setText(`Balance: ${this.user.balance}`);
        }
    }

    update() {
        // This is the game loop, where we can update game logic
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'phaser-game',
    scene: [GameScene]
};

const game = new Phaser.Game(config);