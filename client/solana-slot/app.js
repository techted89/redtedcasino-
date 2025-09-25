require('dotenv').config();

var express = require('express');
const bs58 = require('bs58');
var cors = require('cors');
var solanaWeb3 = require('@solana/web3.js');
var fs = require('fs');
var csv = require('csv-parser');
var createCsvWriter = require('csv-writer').createObjectCsvWriter;
var app = express();
var port = 3000;

var Connection = solanaWeb3.Connection;
var clusterApiUrl = solanaWeb3.clusterApiUrl;
var PublicKey = solanaWeb3.PublicKey;
var LAMPORTS_PER_SOL = solanaWeb3.LAMPORTS_PER_SOL;
var Transaction = solanaWeb3.Transaction;
var SystemProgram = solanaWeb3.SystemProgram;
var Keypair = solanaWeb3.Keypair;
var sendAndConfirmTransaction = solanaWeb3.sendAndConfirmTransaction;

var moment = require('moment-timezone');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

var symbols = ['🍋', '🔔', '🍊', '🍒', '🍇', '💎'];
var stakes = [0, 1, 2, 5, 10, 50, 100];

// Slot machine wallet setup
var slotMachinePrivateKey = new Uint8Array(process.env.SLOT_MACHINE_PRIVATE_KEY.split(',').map(Number));
var slotMachineKeypair = Keypair.fromSecretKey(slotMachinePrivateKey);
var connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');

const { MongoClient } = require('mongodb');

// MongoDB connection string
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbName = process.env.MONGODB_DB_NAME;
const collectionName = process.env.MONGODB_COLLECTION_NAME;

// Function to connect to MongoDB
async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
}

// Function to read player data from MongoDB
async function readPlayerData() {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const players = await collection.find({}).toArray();
    return players.reduce((acc, player) => {
        acc[player.wallet_address] = {
            balance: player.coin_balance,
            currentStakeIndex: player.current_stake_index
        };
        return acc;
    }, {});
}

// Function to write player data to MongoDB
async function writePlayerData(players) {
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const operations = Object.entries(players).map(([address, data]) => ({
        updateOne: {
            filter: { wallet_address: address },
            update: {
                $set: {
                    coin_balance: data.balance,
                    current_stake_index: data.currentStakeIndex
                }
            },
            upsert: true
        }
    }));
    await collection.bulkWrite(operations);
}

app.get('/gameState', async function(req, res) {
    var wallet = req.query.wallet;
    if (!wallet || wallet === 'unknown') {
        return res.json({ balance: 0, currentStakeIndex: 0 });
    }

    try {
        const players = await readPlayerData();
        const playerData = players[wallet] || { balance: 0, currentStakeIndex: 0 };
        res.json(playerData);
    } catch (error) {
        console.error('Error in /gameState:', error);
        res.status(500).json({ error: 'Internal server error', balance: 0, currentStakeIndex: 0 });
    }
});

app.post('/spin', async function(req, res) {
    var wallet = req.body.wallet;
    var stake = parseInt(req.body.stake);
    var lines = parseInt(req.body.lines);
    var totalStake = stake * lines;
    
    console.log('Received spin request:', { wallet, stake, lines, totalStake });

    var playerData = { balance: 0, currentStakeIndex: 0 };

    async function processSpin() {
        var result = [];
        for (var i = 0; i < 5; i++) {
            var reel = [];
            for (var j = 0; j < 3; j++) {
                reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
            }
            result.push(reel);
        }

        console.log('Spin result:', result);

        var consecutiveInfo = checkConsecutiveSymbols(result, lines);

        if (wallet !== 'unknown' && totalStake > 0) {
            var winnings = calculateWinnings(result, stake, lines);

            console.log('Winnings:', winnings);

            if (playerData.balance < totalStake) {
                return res.json({ error: 'Insufficient balance', needFunds: true });
            }

            playerData.balance = Math.max(0, playerData.balance - totalStake + winnings.totalWin);

            try {
                const allPlayers = await readPlayerData();
                allPlayers[wallet] = playerData;
                await writePlayerData(allPlayers);
                res.json({ 
                    result: result, 
                    balance: playerData.balance,
                    winnings: winnings,
                    consecutiveInfo: consecutiveInfo
                });
            } catch (error) {
                console.error('Error updating player data:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        } else {
            // For guests or zero stake, just return the result and consecutive info
            res.json({ 
                result: result, 
                consecutiveInfo: consecutiveInfo
            });
        }
    }

    if (wallet !== 'unknown') {
        try {
            const players = await readPlayerData();
            playerData = players[wallet] || { balance: 100, currentStakeIndex: 0 };
            await processSpin();
        } catch (error) {
            console.error('Error in /spin:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        processSpin();
    }
});

function calculateWinnings(result, stake, activeLines) {
    // Transpose the result matrix
    const transposedResult = result[0].map((_, colIndex) => result.map(row => row[colIndex]));
    
    console.log('Transposed result:', transposedResult);

    var winnings = {
        lines: [],
        totalWin: 0
    };

    // Define winning lines
    var lines = [
        [0, 0, 0, 0, 0], // Top row
        [1, 1, 1, 1, 1], // Middle row
        [2, 2, 2, 2, 2], // Bottom row
        [0, 1, 2, 1, 0], // V-shape
        [2, 1, 0, 1, 2]  // Inverted V-shape
    ];

    lines.slice(0, activeLines).forEach((line, index) => {
        var lineSymbols = line.map((row, col) => transposedResult[row][col]);
        console.log(`Checking line ${index + 1}:`, lineSymbols);
        var winAmount = getLineWin(lineSymbols, stake);
        console.log(`Line ${index + 1} win amount:`, winAmount);
        if (winAmount > 0) {
            winnings.lines.push({
                line: index + 1,
                symbols: lineSymbols,
                win: winAmount
            });
            winnings.totalWin += winAmount;
        }
    });

    console.log('Calculated winnings:', winnings);
    return winnings;
}

function getLineWin(symbols, stake) {
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    let winningSymbol = symbols[0];

    for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === symbols[i-1]) {
            currentConsecutive++;
            if (currentConsecutive > maxConsecutive) {
                maxConsecutive = currentConsecutive;
                winningSymbol = symbols[i];
            }
        } else {
            break; // Stop at first non-matching symbol
        }
    }

    console.log(`Max consecutive: ${maxConsecutive}, Winning symbol: ${winningSymbol}`);

    if (maxConsecutive >= 3) {
        let multiplier = 0;
        switch (winningSymbol) {
            case '💎': multiplier = maxConsecutive * 15; break;
            case '🍒': multiplier = maxConsecutive * 10; break;
            case '🍇': multiplier = maxConsecutive * 5; break;
            case '🔔': multiplier = maxConsecutive * 2; break;
            case '🍋': multiplier = maxConsecutive; break;
            case '🍊': multiplier = maxConsecutive * 1.5; break;
            default: multiplier = maxConsecutive;
        }
        let winAmount = stake * multiplier;
        console.log(`Win amount: ${winAmount} (${maxConsecutive} ${winningSymbol} at ${multiplier}x)`);
        return winAmount;
    }

    return 0;
}

function checkConsecutiveSymbols(transposedResult, activeLines) {
    const lines = [
        [0, 0, 0, 0, 0], // Top row
        [1, 1, 1, 1, 1], // Middle row
        [2, 2, 2, 2, 2], // Bottom row
        [0, 1, 2, 1, 0], // V-shape
        [2, 1, 0, 1, 2]  // Inverted V-shape
    ];

    let consecutiveInfo = [];

    for (let i = 0; i < activeLines; i++) {
        const lineIndices = lines[i];
        const symbols = lineIndices.map((rowIndex, colIndex) => transposedResult[colIndex][rowIndex]);
        let maxConsecutive = 1;
        let currentConsecutive = 1;
        let winningSymbol = symbols[0];

        for (let j = 1; j < symbols.length; j++) {
            if (symbols[j] === symbols[j-1]) {
                currentConsecutive++;
                if (currentConsecutive > maxConsecutive) {
                    maxConsecutive = currentConsecutive;
                    winningSymbol = symbols[j];
                }
            } else {
                break; // Stop at first non-matching symbol
            }
        }

        if (maxConsecutive >= 3) {
            consecutiveInfo.push({
                line: i + 1,
                symbols: symbols, // Include all symbols in the line
                count: maxConsecutive,
                symbol: winningSymbol
            });
        }
    }

    return consecutiveInfo;
}

app.post('/updateStake', async function(req, res) {
    var wallet = req.body.wallet;
    var stakeIndex = req.body.stakeIndex;
    if (!wallet || wallet === 'undefined') {
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    try {
        const players = await readPlayerData();
        if (!players[wallet]) {
            players[wallet] = { balance: 100, currentStakeIndex: 0 };
        }

        players[wallet].currentStakeIndex = stakeIndex;
        await writePlayerData(players);
        res.json({ 
            currentStakeIndex: players[wallet].currentStakeIndex, 
            stake: stakes[players[wallet].currentStakeIndex],
            balance: players[wallet].balance
        });
    } catch (error) {
        console.error('Error in /updateStake:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/requestTransfer', function(req, res) {
    var publicKey = req.body.publicKey;
    
    if (!publicKey) {
        return res.status(400).json({ success: false, message: 'Public key is required' });
    }

    var fromPubkey = new PublicKey(publicKey);
    var toPubkey = new PublicKey('DAko2kY1Do5PNdZciPwHCm3EGu1ZJYPvu9wabFVLoZC9');
    
    var transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromPubkey,
            toPubkey: toPubkey,
            lamports: LAMPORTS_PER_SOL / 100 // 0.01 SOL
        })
    );

    connection.getLatestBlockhash().then(function(response) {
        var blockhash = response.blockhash;
        var lastValidBlockHeight = response.lastValidBlockHeight;
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = fromPubkey;

        var serializedTransaction = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
        res.json({ success: true, transaction: serializedTransaction });
    }).catch(function(error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ success: false, message: 'Failed to create transaction' });
    });
});

app.post('/sendSignedTransaction', function(req, res) {
    var signedTransaction = req.body.signedTransaction;
    var publicKey = req.body.publicKey;
    
    var transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    
    connection.sendRawTransaction(transaction.serialize()).then(function(signature) {
        res.json({ success: true, signature: signature });
    }).catch(function(error) {
        console.error('Error sending transaction:', error);
        res.status(500).json({ success: false, message: 'Failed to send transaction' });
    });
});

app.get('/checkTransaction', async function(req, res) {
    var signature = req.query.signature;
    var publicKey = req.query.publicKey;
    
    if (!signature || !publicKey) {
        return res.status(400).json({ success: false, message: 'Signature and public key are required' });
    }

    try {
        const result = await connection.getSignatureStatus(signature);
        if (result.value && result.value.confirmationStatus === 'confirmed') {
            // Update player balance here
            const players = await readPlayerData();
            if (players[publicKey]) {
                players[publicKey].balance += 100; // Add 100 coins
                await writePlayerData(players);
                res.json({ confirmed: true, addedBalance: 100, balance: players[publicKey].balance });
            } else {
                res.json({ confirmed: true, addedBalance: 100, balance: 0 });
            }
        } else {
            res.json({ confirmed: false });
        }
    } catch (error) {
        console.error('Error checking transaction:', error);
        res.status(500).json({ success: false, message: 'Failed to check transaction' });
    }
});

app.get('/rigaTime', function(req, res) {
    var rigaTime = moment().tz('Europe/Riga').format('YYYY-MM-DD HH:mm:ss');
    res.json({ time: rigaTime });
});

app.get('/balance', async function(req, res) {
    var wallet = req.query.wallet;
    try {
        const players = await readPlayerData();
        var balance = players[wallet] ? players[wallet].balance : 0;
        res.json({ balance: balance });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/requestTopUp', async (req, res) => {
    const { publicKey, amount } = req.body;
    try {
        const fromPubkey = new PublicKey(publicKey);
        const toPubkey = new PublicKey('DAko2kY1Do5PNdZciPwHCm3EGu1ZJYPvu9wabFVLoZC9');

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports: Math.floor(amount * LAMPORTS_PER_SOL)
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
        res.json({ success: true, transaction: serializedTransaction.toString('base64') });
    } catch (error) {
        console.error('Error creating top-up transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
});

app.post('/sendSignedTopUpTransaction', async (req, res) => {
    const { signedTransaction, publicKey, amount } = req.body;
    try {
        const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));
        
        // Send the raw transaction without trying to sign it again
        const signature = await connection.sendRawTransaction(transaction.serialize());
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature);
        
        if (confirmation.value.err) {
            throw new Error('Transaction failed to confirm');
        }

        // Update player balance in your database here
        const players = await readPlayerData();
        if (!players[publicKey]) {
            players[publicKey] = { balance: 0, currentStakeIndex: 0 };
        }
        players[publicKey].balance += Math.floor(parseFloat(amount) * 10000); // 0.01 SOL = 100 coins
        await writePlayerData(players);

        res.json({ success: true, signature });
    } catch (error) {
        console.error('Error sending signed top-up transaction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/checkTopUpTransaction', async (req, res) => {
    const { signature, publicKey } = req.query;
    try {
        const result = await connection.confirmTransaction(signature);
        
        if (result.value.err) {
            res.json({ confirmed: false });
        } else {
            const players = await readPlayerData();
            const addedBalance = players[publicKey] ? players[publicKey].balance : 0;
            res.json({ confirmed: true, addedBalance });
        }
    } catch (error) {
        console.error('Error checking top-up transaction:', error);
        res.status(500).json({ confirmed: false, error: 'Failed to check transaction' });
    }
});

const { v4: uuidv4 } = require('uuid');

// Add these at the top of your file
const withdrawalCooldowns = new Map();
const pendingWithdrawals = new Set();
const processedWithdrawals = new Set();

app.post('/withdraw', async function(req, res) {
    console.log('Withdraw request received:', req.body);
    const wallet = req.body.wallet;
    const requestId = req.body.requestId || uuidv4();

    if (!wallet) {
        return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    // Check if this request has already been processed
    if (processedWithdrawals.has(requestId)) {
        return res.status(409).json({ success: false, error: 'This withdrawal has already been processed' });
    }

    // Check cooldown
    const lastWithdrawal = withdrawalCooldowns.get(wallet);
    if (lastWithdrawal && Date.now() - lastWithdrawal < 60000) { // 1 minute cooldown
        return res.status(429).json({ success: false, error: 'Please wait 1 minute before making another withdrawal' });
    }

    // Check if there's a pending withdrawal for this wallet
    if (pendingWithdrawals.has(wallet)) {
        return res.status(409).json({ success: false, error: 'A withdrawal is already in progress' });
    }

    try {
        // Add wallet to pending withdrawals
        pendingWithdrawals.add(wallet);

        const players = await readPlayerData();
        if (!players[wallet]) {
            pendingWithdrawals.delete(wallet);
            return res.status(404).json({ success: false, error: 'Player not found' });
        }

        const coins = players[wallet].balance;
        if (coins <= 0) {
            pendingWithdrawals.delete(wallet);
            return res.status(400).json({ success: false, error: 'No coins to withdraw' });
        }

        // Convert coins to SOL (1 coin = 0.0001 SOL)
        const solAmount = coins * 0.0001;

        // Create a transaction to send SOL to the user
        const fromPubkey = slotMachineKeypair.publicKey;
        const toPubkey = new PublicKey(wallet);
        
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromPubkey,
                toPubkey: toPubkey,
                lamports: Math.floor(solAmount * LAMPORTS_PER_SOL)
            })
        );

        // Sign and send the transaction
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [slotMachineKeypair]
        );

        console.log('Transfer completed. Signature:', signature);

        // Update player's balance to zero
        players[wallet].balance = 0;
        await writePlayerData(players);

        // Update cooldown and remove from pending
        withdrawalCooldowns.set(wallet, Date.now());
        pendingWithdrawals.delete(wallet);
        processedWithdrawals.add(requestId);

        res.json({ 
            success: true,
            amount: solAmount,
            signature: signature
        });

    } catch (error) {
        console.error('Error processing withdrawal:', error);
        pendingWithdrawals.delete(wallet);
        res.status(500).json({ success: false, error: 'Internal server error during withdrawal' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

process.on('SIGINT', async () => {
    console.log('Closing MongoDB connection');
    await client.close();
    process.exit(0);
});

app.listen(process.env.PORT || port, async function() {
    try {
        await connectToMongoDB();
        console.log('Server running at http://localhost:' + (process.env.PORT || port));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
});