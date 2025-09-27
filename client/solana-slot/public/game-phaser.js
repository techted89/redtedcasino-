class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.user = null;
        this.gameId = 'solana-slot'; // Unique ID for this game
        this.gameState = {
            balance: 0,
            currentStakeIndex: 0
        };
        this.stakes = [1, 2, 5, 10, 50, 100]; // Bet amounts
        this.reels = [];
        this.spinning = false;
        // Mapping from server symbol keys to spritesheet frames
        this.symbolMap = {
            'DIAMOND': 5,
            'CHERRY': 3,
            'GRAPE': 4,
            'BELL': 1,
            'LEMON': 0,
            'ORANGE': 2
        };
    }

    preload() {
        this.load.image('background', 'images/bg.png');
        this.load.spritesheet('symbols', 'images/assets.png', { frameWidth: 100, frameHeight: 100 });
        this.load.audio('spinSound', 'audio/pull.mp3');
        this.load.audio('winSound', 'audio/win.mp3');
        this.load.audio('buttonSound', 'audio/button.mp3');
    }

    create() {
        // Initialize user data from sessionStorage to align with the main application
        try {
            const casinoUser = sessionStorage.getItem('casinoUser');
            this.token = sessionStorage.getItem('casinoUserToken');
            if (casinoUser && this.token) {
                this.user = JSON.parse(casinoUser);
                this.gameState.balance = this.user.balance;
            } else {
                this.user = null;
                this.token = null;
            }
        } catch (error) {
            console.error('Error parsing user data from sessionStorage:', error);
            this.user = null;
        }

        this.add.image(400, 300, 'background');
        this.createUI();
        this.createReels();
        this.updateDisplay();

        if (!this.user) {
            this.showMessage('Please log in to play.');
        }

        this.spinSound = this.sound.add('spinSound');
        this.winSound = this.sound.add('winSound');
        this.buttonSound = this.sound.add('buttonSound');
    }

    createUI() {
        this.balanceText = this.add.text(20, 20, 'Balance: 0', { fontSize: '24px', fill: '#fff' });
        this.stakeText = this.add.text(20, 50, 'Bet: 1', { fontSize: '24px', fill: '#fff' });
        this.userText = this.add.text(550, 20, 'Player: Guest', { fontSize: '20px', fill: '#fff' });
        this.messageText = this.add.text(250, 150, '', { fontSize: '32px', fill: '#ff0', backgroundColor: 'rgba(0,0,0,0.5)' }).setPadding(10);

        const spinButton = this.add.text(350, 500, 'Spin', { fontSize: '32px', fill: '#0f0' }).setInteractive();
        spinButton.on('pointerdown', () => this.spin());

        const stakeButton = this.add.text(200, 500, 'Change Bet', { fontSize: '32px', fill: '#ff0' }).setInteractive();
        stakeButton.on('pointerdown', () => this.updateStake());
    }

    createReels() {
        // A single line, 5-reel slot machine
        const reelContainer = this.add.container(150, 300);
        for (let i = 0; i < 5; i++) {
            const symbol = this.add.sprite(i * 110, 0, 'symbols', 0);
            this.reels.push(symbol);
            reelContainer.add(symbol);
        }
    }

    updateDisplay() {
        this.balanceText.setText(`Balance: ${this.gameState.balance}`);
        this.stakeText.setText(`Bet: ${this.stakes[this.gameState.currentStakeIndex]}`);
        if (this.user) {
            this.userText.setText(`Player: ${this.user.username}`);
        }
    }

    async spin() {
        if (this.spinning || !this.user) {
            if (!this.user) this.showMessage('Please log in to play.');
            return;
        }

        const betAmount = this.stakes[this.gameState.currentStakeIndex];
        if (this.gameState.balance < betAmount) {
            this.showMessage('Insufficient balance');
            return;
        }

        this.spinning = true;
        this.spinSound.play();
        this.showMessage('');

        try {
            const response = await fetch('/api/spin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    userId: this.user.id,
                    betAmount: betAmount,
                    gameId: this.gameId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Spin request failed');
            }

            const data = await response.json();
            this.animateReels(data.reels);

            // Update user object and save to sessionStorage
            this.user.balance = data.newBalance;
            sessionStorage.setItem('casinoUser', JSON.stringify(this.user));

            setTimeout(() => {
                this.spinning = false;
                this.gameState.balance = data.newBalance;
                this.updateDisplay();
                if (data.winnings > 0) {
                    this.winSound.play();
                    this.showMessage(`You won ${data.winnings}!`);
                }
            }, 1500);

        } catch (error) {
            console.error('Error spinning:', error);
            this.spinning = false;
            this.showMessage(error.message);
        }
    }

    animateReels(resultKeys) {
        // resultKeys is an array of symbol names from the server
        this.reels.forEach((reel, i) => {
            // Simple animation: flash the symbols
            this.tweens.add({
                targets: reel,
                alpha: 0,
                ease: 'Power2',
                duration: 500,
                yoyo: true,
                onComplete: () => {
                    const frame = this.symbolMap[resultKeys[i]] || 0;
                    reel.setFrame(frame);
                    reel.alpha = 1;
                }
            });
        });
    }

    updateStake() {
        if (this.spinning) return;
        this.buttonSound.play();
        this.gameState.currentStakeIndex = (this.gameState.currentStakeIndex + 1) % this.stakes.length;
        this.updateDisplay();
    }

    showMessage(text) {
        this.messageText.setText(text);
        if (text) {
            this.time.delayedCall(3000, () => {
                if (this.messageText.text === text) {
                    this.messageText.setText('');
                }
            });
        }
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