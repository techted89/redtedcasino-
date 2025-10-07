import pool from './connection.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// --- User Operations ---

const USER_COLUMNS = 'walletAddress, isAdmin, firstName, lastName, age, createdAt';

export async function getAllUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query("SELECT COUNT(*) as total FROM users");

    const [rows] = await pool.query(
        `SELECT ${USER_COLUMNS} FROM users ORDER BY id ASC LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    return {
        data: rows,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
}

export async function getUserByWalletAddress(walletAddress) {
    const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE walletAddress = ?`, [walletAddress]);
    return rows[0] || null;
}

export async function createUserWithWallet(walletAddress) {
    await pool.query(
        "INSERT INTO users (walletAddress, isAdmin, createdAt) VALUES (?, ?, ?)",
        [walletAddress, false, new Date()]
    );
    return getUserByWalletAddress(walletAddress);
}

// --- Game Configuration Operations ---

export async function getGameConfiguration(gameId) {
    // This function fetches the complete editable configuration for a game.
    // Assumes `paytables` table also has a `symbolWeights` JSON column.
    const [rows] = await pool.query("SELECT paytable, symbolWeights FROM paytables WHERE gameId = ?", [gameId]);
    if (rows.length === 0) {
        // Throw an error if no configuration is found in the database.
        // This is a critical error, as the game cannot function without a paytable.
        throw new Error(`Game configuration for '${gameId}' not found in database.`);
    }
    // The columns can be null if they were added after the row was created.
    return {
        paytable: rows[0].paytable || {},
        symbolWeights: rows[0].symbolWeights || {}
    };
}

export async function updatePaytable(gameId, paytable, symbolWeights) {
    // This uses INSERT ... ON DUPLICATE KEY UPDATE (upsert)
    // Assumes `gameId` is a unique key or primary key in the `paytables` table.
    const paytableJson = JSON.stringify(paytable);
    const weightsJson = JSON.stringify(symbolWeights);
    await pool.query(
        `INSERT INTO paytables (gameId, paytable, symbolWeights)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE paytable = ?, symbolWeights = ?`,
        [gameId, paytableJson, weightsJson, paytableJson, weightsJson]
    );
    return { message: `Configuration for '${gameId}' updated successfully.` };
}

// Obsolete withdrawal functions have been removed.

// --- Game Statistics Operations ---

export async function updateGameStatistics(gameId, betAmount, winnings) {
    // This query will insert a new row for the gameId if it doesn't exist,
    // or update the existing row by adding the new values.
    await pool.query(
        `INSERT INTO game_statistics (gameId, totalWagered, totalWon)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
         totalWagered = totalWagered + VALUES(totalWagered),
         totalWon = totalWon + VALUES(totalWon)`,
        [gameId, betAmount, winnings]
    );
}

export async function getGameStatistics() {
    // This assumes a `game_statistics` table exists.
    const [rows] = await pool.query("SELECT * FROM game_statistics ORDER BY gameId");
    return rows;
}

// --- Aetherian Vault Game Operations ---

export async function getPlayerAetherProgress(walletAddress) {
    const [rows] = await pool.query("SELECT * FROM player_aether_progress WHERE walletAddress = ?", [walletAddress]);
    if (rows.length === 0) {
        // If player has no record, create one and return default values
        await pool.query("INSERT INTO player_aether_progress (walletAddress, aetherLevel, aetherPoints) VALUES (?, 1, 0)", [walletAddress]);
        return { walletAddress, aetherLevel: 1, aetherPoints: 0 };
    }
    return rows[0];
}

export async function updatePlayerAetherProgress(walletAddress, pointsToAdd, newLevel = null) {
    let query;
    let params;

    if (newLevel !== null) {
        // This is for a level-up or reset action
        query = "UPDATE player_aether_progress SET aetherPoints = 0, aetherLevel = ? WHERE walletAddress = ?";
        params = [newLevel, walletAddress];
    } else {
        // Just add points
        query = "UPDATE player_aether_progress SET aetherPoints = aetherPoints + ? WHERE walletAddress = ?";
        params = [pointsToAdd, walletAddress];
    }
    await pool.query(query, params);
    return getPlayerAetherProgress(walletAddress);
}

export async function getJackpotPools() {
    const [rows] = await pool.query("SELECT * FROM progressive_jackpots");
    // Convert the array of objects to a simple { jackpotId: amount } object
    return rows.reduce((acc, row) => {
        acc[row.jackpotId] = row.poolAmount;
        return acc;
    }, {});
}

export async function updateJackpotPool(jackpotId, amountToAdd) {
    await pool.query(
        "UPDATE progressive_jackpots SET poolAmount = poolAmount + ? WHERE jackpotId = ?",
        [amountToAdd, jackpotId]
    );
}

export async function resetJackpot(jackpotId, baseAmount) {
    await pool.query(
        "UPDATE progressive_jackpots SET poolAmount = ? WHERE jackpotId = ?",
        [baseAmount, jackpotId]
    );
}
