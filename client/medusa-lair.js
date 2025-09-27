class MedusaLairScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MedusaLairScene' });
        this.reels = [];
        this.isSpinning = false;
    }

    init(data) {
        this.gameId = data.gameId;
        this.user = JSON.parse(sessionStorage.getItem('casinoUser'));
        this.token = sessionStorage.getItem('casinoUserToken');
    }

    preload() {
        this.load.image('background', '/medusa-lair/img/background.jpg');
        this.load.image('S1', '/medusa-lair/img/symbol1.png');
        this.load.image('S2', '/medusa-lair/img/symbol2.png');
        this.load.image('S3', '/medusa-lair/img/symbol3.png');
        this.load.image('S4', '/medusa-lair/img/symbol4.png');
        this.load.image('S5', '/medusa-lair/img/symbol5.png');
        this.load.image('WILD', '/medusa-lair/img/symbol_wild.png');
        this.load.image('JACKPOT', '/medusa-lair/img/symbol_jackpot.png');
    }

    create() {
        this.add.image(400, 300, 'background');
        this.reelsContainer = this.add.container(400, 300);

        this.initReels();

        this.spinButton = this.add.text(400, 550, 'Spin', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.spin());

        this.balanceText = this.add.text(20, 20, `Balance: ${this.user.balance}`, { fontSize: '24px', fill: '#fff' });
        this.winningsText = this.add.text(400, 500, '', { fontSize: '32px', fill: '#ff0' }).setOrigin(0.5);
    }

    initReels() {
        const symbols = ['S1', 'S2', 'S3', 'S4', 'S5'];
        for (let i = 0; i < 5; i++) {
            const reel = [];
            for (let j = 0; j < 3; j++) {
                const symbol = this.add.image(i * 100 - 200, j * 100 - 100, symbols[Phaser.Math.Between(0, symbols.length - 1)]);
                this.reelsContainer.add(symbol);
                reel.push(symbol);
            }
            this.reels.push(reel);
        }
    }

    async spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;
        this.winningsText.setText('');

        // Simple spinning animation
        let spinDuration = 1000;
        this.tweens.add({
            targets: this.reelsContainer,
            y: 310,
            ease: 'Power2',
            duration: spinDuration / 2,
            yoyo: true,
        });

        try {
            const response = await fetch('/api/spin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    userId: this.user.id,
                    betAmount: 1, // Hardcoded bet amount for now
                    gameId: this.gameId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }

            const data = await response.json();
            this.displayResults(data.reels);
            this.updateBalance(data.newBalance);
            if (data.winnings > 0) {
                this.winningsText.setText(`You won: ${data.winnings}`);
            }

        } catch (error) {
            console.error('Spin failed:', error);
            this.winningsText.setText(`Error: ${error.message}`);
        } finally {
            this.isSpinning = false;
        }
    }

    displayResults(reelUrls) {
        const symbolKeys = reelUrls.map(url => {
            const parts = url.split('/');
            return parts[parts.length - 1].split('.')[0];
        });

        for (let i = 0; i < 5; i++) {
            // For simplicity, we just update the top symbol of each reel
            this.reels[i][0].setTexture(symbolKeys[i]);
        }
    }

    updateBalance(newBalance) {
        this.user.balance = newBalance;
        sessionStorage.setItem('casinoUser', JSON.stringify(this.user));
        this.balanceText.setText(`Balance: ${newBalance}`);
    }
}

// Get gameId from URL
const params = new URLSearchParams(window.location.search);
const gameId = params.get('game');

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: MedusaLairScene,
    parent: 'game-container',
    data: { gameId: gameId }
};

const game = new Phaser.Game(config);
game.scene.start('MedusaLairScene', { gameId: gameId });