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
        const reelWidth = 100;
        const symbolHeight = 100;
        const numSymbolsPerReel = 10; // How many symbols to create in each reel column
        const symbols = ['S1', 'S2', 'S3', 'S4', 'S5', 'WILD', 'JACKPOT'];

        for (let i = 0; i < 5; i++) {
            const reelContainer = this.add.container(i * reelWidth - (reelWidth * 2), 0);
            const reel = { container: reelContainer, symbols: [] };

            for (let j = 0; j < numSymbolsPerReel; j++) {
                const symbol = this.add.image(0, j * symbolHeight - (symbolHeight * Math.floor(numSymbolsPerReel / 2)), symbols[Phaser.Math.Between(0, symbols.length - 1)]);
                reelContainer.add(symbol);
                reel.symbols.push(symbol);
            }

            this.reels.push(reel);
            this.reelsContainer.add(reelContainer);
        }
    }

    async spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;
        this.winningsText.setText('');

        const spinDuration = 2000;
        const reelPromises = this.reels.map((reel, i) => {
            return this.animateReel(reel, i, spinDuration);
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

            await Promise.all(reelPromises);
            const data = await response.json();
            this.displayResults(data.reels);
            this.updateBalance(data.newBalance);
            if (data.winnings > 0) {
                this.winningsText.setText(`You won: ${data.winnings}`);
                this.playWinAnimation();
            }

        } catch (error) {
            console.error('Spin failed:', error);
            this.winningsText.setText(`Error: ${error.message}`);
        } finally {
            this.isSpinning = false;
        }
    }

    displayResults(reelUrls) {
        const finalSymbols = reelUrls.map(url => url.split('/').pop().split('.').shift());

        this.reels.forEach((reel, i) => {
            // Set the final symbol at the top (visible) position
            reel.symbols[0].setTexture(finalSymbols[i]);

            // Fill the rest of the reel with random symbols for the next spin
            for (let j = 1; j < reel.symbols.length; j++) {
                const randomSymbol = this.textures.get.keys[Phaser.Math.Between(1, 7)]; // Assuming 7 symbols + background
                reel.symbols[j].setTexture(randomSymbol);
            }
        });
    }

    updateBalance(newBalance) {
        this.user.balance = newBalance;
        sessionStorage.setItem('casinoUser', JSON.stringify(this.user));
        this.balanceText.setText(`Balance: ${newBalance}`);
    }

    animateReel(reel, index, duration) {
        return new Promise(resolve => {
            const symbolHeight = 100;
            const finalPosition = reel.container.y;
            const startPosition = finalPosition - (reel.symbols.length * symbolHeight);

            this.time.delayedCall(index * 200, () => {
                this.tweens.add({
                    targets: reel.container,
                    y: startPosition,
                    ease: 'Linear',
                    duration: duration,
                    repeat: -1,
                });

                setTimeout(() => {
                    this.tweens.killTweensOf(reel.container);
                    this.tweens.add({
                        targets: reel.container,
                        y: finalPosition,
                        ease: 'Cubic.easeOut',
                        duration: 750,
                        onComplete: () => resolve()
                    });
                }, duration + index * 500);
            });
        });
    }

    playWinAnimation() {
        const particles = this.add.particles('S1');
        const emitter = particles.createEmitter({
            speed: 100,
            scale: { start: 1, end: 0 },
            blendMode: 'ADD'
        });

        emitter.startFollow(this.winningsText);
        setTimeout(() => particles.destroy(), 1000);
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