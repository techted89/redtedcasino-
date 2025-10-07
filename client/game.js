// --- Unified Aetherian Vault Slot Machine Scene ---
class SlotMachineScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SlotMachineScene' });
    }

    init() {
        // Hardcode the game ID since this is now a single-game application
        this.gameId = 'aetherian-vault';
        this.user = JSON.parse(sessionStorage.getItem('casinoUser'));
        this.token = sessionStorage.getItem('casinoUserToken');
        this.reels = [];
        this.isSpinning = false;
        this.gameData = null; // Will be fetched from the server
    }

    preload() {
        // No assets are preloaded here; they will be loaded dynamically in create()
    }

    create() {
        // Fetch all initial data in parallel
        Promise.all([
            apiRequest('/api/games', 'GET', null, 'casinoUserToken'),
            apiRequest('/api/aether-progress', 'GET', null, 'casinoUserToken'), // Assuming this endpoint exists
            apiRequest('/api/jackpots', 'GET', null, 'casinoUserToken') // Assuming this endpoint exists
        ])
        .then(([games, aetherProgress, jackpots]) => {
            this.gameData = games.find(g => g.id === this.gameId);
            this.aetherProgress = aetherProgress;
            this.jackpots = jackpots;

            if (this.gameData) {
                this.loadAssetsAndInitialize();
            } else {
                this.add.text(400, 300, 'Error: Game data could not be loaded.', { color: '#ff0000', fontSize: '20px' }).setOrigin(0.5);
            }
        })
        .catch(error => {
            console.error('Failed to fetch initial game state:', error);
            this.add.text(400, 300, `Error: ${error.message}`, { color: '#ff0000', fontSize: '20px' }).setOrigin(0.5);
        });
    }

    loadAssetsAndInitialize() {
        // Now that we have gameData, load the assets
        this.load.image(`background_${this.gameData.id}`, this.gameData.backgroundImage);
        for (const key in this.gameData.symbols) {
            this.load.image(key, this.gameData.symbols[key]);
        }

        // Once loading is complete, build the scene
        this.load.once('complete', () => {
            this.add.image(400, 300, `background_${this.gameData.id}`);
            this.reelsContainer = this.add.container(400, 300);
            this.createUI();
            this.initReels();
        });

        this.load.start();
    }

    createUI() {
        // Game Title
        this.add.text(400, 30, this.gameData.name, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        // Jackpot Displays
        this.jackpotTextMinor = this.add.text(20, 20, `Minor: $${this.jackpots.minor.toFixed(2)}`, { fontSize: '18px', fill: '#cd7f32' });
        this.jackpotTextMajor = this.add.text(20, 45, `Major: $${this.jackpots.major.toFixed(2)}`, { fontSize: '18px', fill: '#c0c0c0' });
        this.jackpotTextGrand = this.add.text(20, 70, `Grand: $${this.jackpots.grand.toFixed(2)}`, { fontSize: '18px', fill: '#ffd700' });

        // Ascension Meter
        this.add.text(780, 20, 'Aether Level', { fontSize: '16px', fill: '#ccc' }).setOrigin(1, 0);
        this.aetherLevelText = this.add.text(780, 40, this.aetherProgress.aetherLevel, { fontSize: '24px', fill: '#00ffff' }).setOrigin(1, 0);
        this.ascensionMeter = this.add.graphics();
        this.updateAscensionMeter();

        // Player Info & Actions
        this.balanceText = this.add.text(20, 120, `Balance: Fetching...`, { fontSize: '20px', fill: '#fff' });
        this.updateOnChainBalance(); // Fetch initial balance
        this.winningsText = this.add.text(400, 500, '', { fontSize: '28px', fill: '#ffd700' }).setOrigin(0.5);

        // Controls
        this.betAmount = 10;
        this.betText = this.add.text(20, 550, `Bet: ${this.betAmount}`, { fontSize: '24px', fill: '#fff' });
        this.add.text(120, 540, '+', { fontSize: '32px', fill: '#0f0' }).setInteractive().on('pointerdown', () => this.changeBet(10));
        this.add.text(120, 560, '-', { fontSize: '32px', fill: '#f00' }).setInteractive().on('pointerdown', () => this.changeBet(-10));
        this.add.text(400, 550, 'SPIN', { fontSize: '32px', fill: '#0f0', backgroundColor: '#555', padding: {x: 20, y: 10}}).setOrigin(0.5).setInteractive().on('pointerdown', () => this.spin());
    }

    updateAscensionMeter() {
        const nextLevelPoints = 1000; // This would be dynamic in a real implementation
        const progress = this.aetherProgress.aetherPoints / nextLevelPoints;

        this.ascensionMeter.clear();
        this.ascensionMeter.fillStyle(0x003366, 1);
        this.ascensionMeter.fillRect(680, 70, 100, 20);
        this.ascensionMeter.fillStyle(0x00ffff, 1);
        this.ascensionMeter.fillRect(680, 70, 100 * progress, 20);

        this.aetherLevelText.setText(`Level ${this.aetherProgress.aetherLevel}`);
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

    // New function to query and update balance from the blockchain
    async updateOnChainBalance() {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const userAddress = await signer.getAddress();
            // Note: In a real app, this config would be fetched from the server securely
            const web3Config = {
                contractAddress: '0xYourContractAddressHere',
                abi: ["function balanceOf(address account) view returns (uint256)"]
            };
            const erc20Contract = new ethers.Contract(web3Config.contractAddress, web3Config.abi, provider);

            const balanceWei = await erc20Contract.balanceOf(userAddress);
            const balanceFormatted = ethers.utils.formatUnits(balanceWei, 18); // Assuming 18 decimals

            this.balanceText.setText(`Balance: ${parseFloat(balanceFormatted).toFixed(4)}`);
        } catch (error) {
            console.error('Could not fetch balance:', error);
            this.balanceText.setText('Balance: Error');
        }
    }

    async spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;
        this.winningsText.setText('Awaiting wallet approval...');

        try {
            // --- Web3 Transaction Flow ---
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const web3Config = {
                contractAddress: '0xYourContractAddressHere',
                treasuryAddress: '0xYourTreasuryAddressHere',
                abi: ["function approve(address spender, uint256 amount) returns (bool)"]
            };
            const erc20Contract = new ethers.Contract(web3Config.contractAddress, web3Config.abi, signer);

            const betAmountInWei = ethers.utils.parseUnits(this.betAmount.toString(), 18);
            const approveTx = await erc20Contract.approve(web3Config.treasuryAddress, betAmountInWei);

            this.winningsText.setText('Approving on-chain...');
            await approveTx.wait();

            this.winningsText.setText('Spinning...');
            const data = await apiRequest('/api/spin-onchain', 'POST', {
                betAmount: this.betAmount
            }, 'casinoUserToken');

            this.aetherProgress = data.aetherProgress;
            this.updateAscensionMeter();
            this.displayResults(data.reels);

            if (data.winnings > 0) {
                this.winningsText.setText(`YOU WON: ${data.winnings}`);
            } else {
                this.winningsText.setText('Try Again!');
            }

            // Refresh balance from the blockchain after the spin is settled
            this.updateOnChainBalance();

        } catch (err) {
            console.error('Spin failed:', err);
            this.winningsText.setText(err.message || 'An error occurred.');
            this.updateOnChainBalance(); // Also update balance on error
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
    scene: [SlotMachineScene] // Only load the main slot machine scene
};

const game = new Phaser.Game(config);