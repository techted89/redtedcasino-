let wallet = null;
let gameState = {
    balance: 0,
    currentStakeIndex: 0
};

const stakes = [0, 1, 2, 5, 10, 50, 100];
let activeLines = 1; // Default to 1 active line

const pullSound = new Audio('/audio/pull.mp3');
const winSound = new Audio('/audio/win.mp3');
const buttonSound = new Audio('/audio/button.mp3');  // Add this line

function updateDisplay() {
    console.log('Updating display with game state:', gameState);
    console.log('Wallet connected:', !!wallet);
    const balanceElement = document.getElementById('balance');
    const stakeElement = document.getElementById('stake');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');
    const gameInfo = document.getElementById('game-info');

    if (wallet) {
        console.log('Wallet connected, updating balance');
        if (balanceElement) {
            balanceElement.textContent = `Balance: ${gameState.balance} coins`;
            balanceElement.style.display = 'block';
            console.log('Balance element updated:', balanceElement.textContent);
        } else {
            console.log('Balance element not found');
        }
        if (stakeElement) stakeElement.textContent = `Stake: ${stakes[gameState.currentStakeIndex] * activeLines} coins (${stakes[gameState.currentStakeIndex]} x ${activeLines} lines)`;
        if (walletAddress) walletAddress.textContent = `Connected: ${wallet.publicKey.toString().slice(0, 4)}...${wallet.publicKey.toString().slice(-4)}`;
        if (walletInfo) walletInfo.style.display = 'block';
        if (gameInfo) gameInfo.style.display = 'block';
    } else {
        console.log('Wallet not connected, hiding balance');
        if (stakeElement) stakeElement.textContent = `Stake: ${stakes[gameState.currentStakeIndex] * activeLines} coins (${stakes[gameState.currentStakeIndex]} x ${activeLines} lines)`;
        if (walletInfo) walletInfo.style.display = 'none';
        if (gameInfo) gameInfo.style.display = 'block';
        if (balanceElement) balanceElement.style.display = 'none';
    }
}

async function fetchGameState() {
    const walletAddress = wallet ? wallet.publicKey.toString() : 'unknown';
    console.log('Fetching game state for wallet:', walletAddress);
    try {
        const response = await fetch(`/gameState?wallet=${walletAddress}`);
        const data = await response.json();
        console.log('Received game state:', data);
        if (data.error) {
            console.error('Error fetching game state:', data.error);
            showRollingText('Error fetching game state. Please try again.');
            gameState.balance = 0;
            gameState.currentStakeIndex = 0;
        } else {
            gameState.balance = data.balance || 0;
            gameState.currentStakeIndex = data.currentStakeIndex || 0;
        }
        console.log('Updated game state:', gameState);
    } catch (error) {
        console.error('Error fetching game state:', error);
        showRollingText('Error fetching game state. Please try again.');
        gameState.balance = 0;
        gameState.currentStakeIndex = 0;
    } finally {
        updateDisplay();
    }
}

function updateStake() {
    buttonSound.play();  // Add this line
    if (!wallet) {
        // Update local game state without sending request to server
        gameState.currentStakeIndex = (gameState.currentStakeIndex + 1) % stakes.length;
        updateDisplay();
        showRollingText('Stake: ' + stakes[gameState.currentStakeIndex] + ' coins');
        return;
    }

    var walletAddress = wallet.publicKey.toString();
    fetch('/updateStake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress, stakeIndex: (gameState.currentStakeIndex + 1) % stakes.length })
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        gameState.currentStakeIndex = data.currentStakeIndex;
        gameState.balance = data.balance;
        updateDisplay();
        showRollingText('Stake: ' + stakes[gameState.currentStakeIndex] + ' coins');
    })
    .catch(function(error) {
        console.error('Error updating stake:', error);
        showRollingText('Error updating stake');
    });
}

function createHighlightLines() {
    const container = document.getElementById('reels-container');
    if (!container) {
        console.error('Reels container not found. Cannot create highlight lines.');
        return;
    }

    const lines = [
        { top: '16.67%', height: '16.67%' },  // Top row
        { top: '50%', height: '16.67%' },     // Middle row
        { top: '83.33%', height: '16.67%' },  // Bottom row
        { top: '16.67%', height: '66.67%', transform: 'skew(45deg)' },  // V-shape
        { top: '16.67%', height: '66.67%', transform: 'skew(-45deg)' }  // Inverted V-shape
    ];

    lines.forEach((style, index) => {
        const line = document.createElement('div');
        line.className = 'highlight-line';
        Object.assign(line.style, style);
        line.dataset.lineIndex = index;
        container.appendChild(line);
    });
}

function showActiveLines(count) {
    const lines = document.querySelectorAll('.highlight-line');
    lines.forEach((line, index) => {
        if (index < count) {
            line.classList.add('active');
            setTimeout(() => {
                line.classList.remove('active');
            }, 1000); // 1000 milliseconds = 1 second
        } else {
            line.classList.remove('active');
        }
    });
}

function toggleLines() {
    buttonSound.play();  // Add this line
    activeLines = activeLines % 5 + 1;
    showActiveLines(activeLines);
    updateDisplay();
    showRollingText(`Active Lines: ${activeLines}`);
}


function stopFlashingSymbols() {
    const flashingSymbols = document.querySelectorAll('.symbol-flash');
    flashingSymbols.forEach(symbol => {
        symbol.classList.remove('symbol-flash');
    });
}

let messageQueue = [];
let isDisplayingMessage = false;

async function spin() {
    stopFlashingSymbols();

    pullSound.play();

    const walletAddress = wallet ? wallet.publicKey.toString() : 'unknown';
    const currentStake = stakes[gameState.currentStakeIndex];
    const totalStake = currentStake * activeLines;

    // Check if guest is trying to play with a stake
    if (!wallet && totalStake > 0) {
        const connectWalletConfirm = confirm('You need to connect a wallet to play with a stake. Would you like to connect your wallet and add funds?');
        if (connectWalletConfirm) {
            try {
                await connectWallet();
                if (wallet) {
                    await addFunds();
                }
            } catch (error) {
                console.error('Error connecting wallet or adding funds:', error);
                queueMessage('Failed to connect wallet or add funds. Please try again.');
                return;
            }
        } else {
            return;
        }
    }

    try {
        const response = await fetch('/spin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                wallet: walletAddress, 
                stake: currentStake,
                lines: activeLines
            })
        });
        const result = await response.json();
        if (result.error) {
            queueMessage(result.error);
            if (result.needFunds && wallet) {
                const addFundsConfirm = confirm('Insufficient balance. Would you like to add funds?');
                if (addFundsConfirm) {
                    try {
                        await addFunds();
                    } catch (error) {
                        console.error('Error adding funds:', error);
                        queueMessage('Failed to add funds. Please try again.');
                    }
                }
            }
        } else {
            await animateReels(result.result);
            
            if (wallet) {
                gameState.balance = result.balance;
                updateDisplay();
            }
            
            if (result.consecutiveInfo && result.consecutiveInfo.length > 0) {
                

                result.consecutiveInfo.forEach((winInfo) => {
                    const highlightedSymbols = winInfo.symbols.map((symbol, idx) => 
                        idx < winInfo.count ? `[${symbol}]` : symbol
                    );
                    const winMessage = `WIN ${highlightedSymbols.join(' ')}`;
                    queueMessage(winMessage);
                    winSound.play();
                });
                
                flashWinningSymbols(result.result, result.consecutiveInfo);
                
                if (wallet && result.winnings && result.winnings.totalWin > 0) {
                    queueMessage(`Total win: ${result.winnings.totalWin} `);
                }
            } else {
                //queueMessage('No win this time. Try again!');
            }
        }
    } catch (error) {
        console.error('Error spinning:', error);
        queueMessage('Error spinning. Please try again.');
    }

    // Start processing the message queue immediately
    processMessageQueue();
}

function queueMessage(message) {
    messageQueue.push({ message });
}

async function processMessageQueue() {
    if (isDisplayingMessage || messageQueue.length === 0) return;

    isDisplayingMessage = true;
    while (messageQueue.length > 0) {
        const { message } = messageQueue.shift();
        showRollingText(message);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for message display duration
    }
    isDisplayingMessage = false;
}

function showRollingText(text) {
    const rollingTextElement = document.getElementById('rolling-text');
    if (!rollingTextElement) {
        console.error('Rolling text element not found');
        return;
    }
    const textElement = document.createElement('div');
    textElement.textContent = text;
    textElement.style.animation = 'rollText 3s ease-in-out';
    rollingTextElement.innerHTML = '';
    rollingTextElement.appendChild(textElement);

    textElement.addEventListener('animationend', () => {
        rollingTextElement.innerHTML = '';
    });
}

async function animateReels(result) {
    const reels = document.querySelectorAll('.reel');
    const buttonOverlay = document.getElementById('button-overlay');
    if (!buttonOverlay) {
        console.error('Button overlay element not found');
        return;
    }
    buttonOverlay.style.pointerEvents = 'none';
    
    try {
        await Promise.all(Array.from(reels).map((reel, index) => new Promise(resolve => {
            reel.style.transition = 'none';
            reel.style.transform = 'translateY(-60px)';
                
            setTimeout(() => {
                reel.style.transition = `transform ${1 + index * 0.5}s cubic-bezier(.45,.05,.55,.95)`;
                reel.style.transform = 'translateY(-240px)';
            }, 50);

            setTimeout(() => {
                reel.style.transition = 'none';
                reel.style.transform = 'translateY(0)';
                updateSymbols(reel, result[index]);
                resolve();
            }, 1000 + index * 500);
        })));
    } catch (error) {
        console.error('Error animating reels:', error);
    } finally {
        buttonOverlay.style.pointerEvents = 'auto';
    }
}

function updateSymbols(reel, symbols) {
    const symbolElements = reel.querySelectorAll('.symbol');
    symbolElements.forEach((element, index) => {
        element.textContent = symbols[index];
    });
}

async function connectWallet() {
    if (wallet) return; // Already connected

    let provider;
    if (window.solana && window.solana.isPhantom) {
        provider = window.solana;
    } else if (window.solflare && window.solflare.isSolflare) {
        provider = window.solflare;
    } else if (window.solana) {
        provider = window.solana;
    } else {
        showRollingText('No Solana wallet found');
        return null;
    }

    try {
        await provider.connect();
        wallet = provider;
        console.log('Wallet connected:', wallet.publicKey.toString());
        
        // Fetch updated game state after wallet connection
        await fetchGameState();
        
        showRollingText(`Wallet connected`);
    } catch (err) {
        console.error('Wallet connection error:', err);
        showRollingText('Failed to connect');
    }
}

async function addFunds() {
    if (!wallet) {
        showRollingText('Connect wallet first');
        await connectWallet();
        if (!wallet) {
            showRollingText('Failed to connect wallet');
            return;
        }
    }

    try {
        showRollingText('Requesting transaction');
        const response = await fetch('/requestTransfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: wallet.publicKey.toString() })
        });
        const data = await response.json();

        if (data.success) {
            showRollingText('Transaction created');
            const binaryString = atob(data.transaction);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const transaction = solanaWeb3.Transaction.from(bytes);
            try {
                const signedTransaction = await wallet.signTransaction(transaction);
                const serializedTransaction = signedTransaction.serialize();

                showRollingText('Transaction signed');
                const confirmResponse = await fetch('/sendSignedTransaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        signedTransaction: btoa(String.fromCharCode.apply(null, serializedTransaction)),
                        publicKey: wallet.publicKey.toString()
                    })
                });
                const confirmResult = await confirmResponse.json();

                if (confirmResult.success) {
                    showRollingText('Transaction sent');
                    await checkTransactionStatus(confirmResult.signature);
                } else {
                    showRollingText('Failed to send transaction');
                }
            } catch (error) {
                console.error('Transaction rejected:', error);
                showRollingText('Transaction rejected');
            }
        } else {
            showRollingText('Failed transaction');
        }
    } catch (error) {
        console.error('Error adding funds:', error);
        showRollingText('An error occurred.');
    } finally {
        await fetchGameState(); // Always fetch game state after any transaction attempt
        updateDisplay();
    }
}

async function checkTransactionStatus(signature) {
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 3000; // 3 seconds

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`/checkTransaction?signature=${signature}&publicKey=${wallet.publicKey.toString()}`);
            const result = await response.json();

            if (result.confirmed) {
                showRollingText(`Added ${result.addedBalance} coins to your balance!`);
                gameState.balance = result.balance;
                updateDisplay();
                return;
            }

            showRollingText(`Confirmation... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempts++;
        } catch (error) {
            console.error('Error checking transaction status:', error);
        }
    }

    showRollingText('Transaction confirmation timed out. Please check your wallet for the status.');
}

function flashWinningSymbols(result, winningLines) {
    stopFlashingSymbols(); // Clear any existing flashing

    const reels = document.querySelectorAll('.reel');
    const flashClass = 'symbol-flash';
    const flashDuration = 500; // milliseconds
    const flashCount = 3;

    winningLines.forEach(winLine => {
        const lineIndex = winLine.line - 1;
        const lineConfig = [
            [0, 0, 0, 0, 0], // Top row
            [1, 1, 1, 1, 1], // Middle row
            [2, 2, 2, 2, 2], // Bottom row
            [0, 1, 2, 1, 0], // V-shape
            [2, 1, 0, 1, 2]  // Inverted V-shape
        ][lineIndex];

        lineConfig.forEach((rowIndex, colIndex) => {
            const symbol = reels[colIndex].children[rowIndex];
            symbol.classList.add(flashClass);
        });
    });

    // Stop flashing after a set duration
    setTimeout(() => {
        stopFlashingSymbols();
    }, flashDuration * flashCount * 2);
}

document.addEventListener('DOMContentLoaded', () => {
    const reelsContainer = document.getElementById('reels-container');
    for (let i = 0; i < 5; i++) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        reelsContainer.appendChild(reel);
        
        for (let j = 0; j < 3; j++) {
            const symbolElement = document.createElement('div');
            symbolElement.className = 'symbol';
            reel.appendChild(symbolElement);
        }
    }

    createHighlightLines();

    const buttons = document.querySelectorAll('[data-button]');
    buttons.forEach(button => {
        const buttonNumber = button.getAttribute('data-button');
        switch (buttonNumber) {
            case '1':
                button.addEventListener('click', () => {
                    buttonSound.play();  // Add this line
                    updateStake();
                });
                break;
            case '2':
                button.addEventListener('click', () => {
                    buttonSound.play();  // Add this line
                    toggleLines();
                });
                break;
            case '3':
                button.addEventListener('click', spin);
                break;
        }
    });

    fetchGameState();
});

