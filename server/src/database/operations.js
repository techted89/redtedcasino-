import pool from './connection.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// --- User Operations ---

const USER_COLUMNS = 'id, username, balance, firstName, lastName, age, withdrawalTotal, isAdmin, createdAt, accountId, passwordChanged, profileCompleted';

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

export async function getUser(userId) {
    const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [userId]);
    return rows[0] || null;
}

export async function getUserByUsername(username) {
    // Includes the password hash for login verification.
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    return rows[0] || null;
}

export async function createUser(username, initialBalance, firstName, lastName, age) {
    // Generate a unique account ID. For this example, we'll use a timestamp and a random suffix.
    const accountId = `ACC${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [result] = await pool.query(
        "INSERT INTO users (username, balance, firstName, lastName, age, isAdmin, withdrawalTotal, createdAt, accountId, passwordChanged, profileCompleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [username, initialBalance, firstName, lastName, age, false, 0, new Date(), accountId, false, false]
    );
    // The user's password must be set in a separate step using updateUserPassword
    const newUser = { id: result.insertId, username, balance: initialBalance, firstName, lastName, age, accountId };
    return newUser;
}

// New function for admins to set a user's balance directly.
export async function setUserBalance(userId, newBalance) {
    await pool.query("UPDATE users SET balance = ? WHERE id = ?", [newBalance, userId]);
    return getUser(userId);
}

export async function createAdminUser(username, password, firstName, lastName, age) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const accountId = `ADM${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [result] = await pool.query(
        "INSERT INTO users (username, password, balance, firstName, lastName, age, isAdmin, withdrawalTotal, createdAt, accountId, passwordChanged, profileCompleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [username, hashedPassword, 10000, firstName, lastName, age, true, 0, new Date(), accountId, true, true] // Admins are created fully "complete"
    );
    const newUser = { id: result.insertId, username, balance: 10000, firstName, lastName, age, isAdmin: true };
    return newUser;
}

export async function updateUserPassword(userId, password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
    return { message: 'Password updated successfully.' };
}

// Used for the mandatory password change after first login.
export async function forcePasswordChange(userId, password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
        "UPDATE users SET password = ?, passwordChanged = ? WHERE id = ?",
        [hashedPassword, true, userId]
    );
    return { message: 'Password has been changed successfully.' };
}

// Used for the mandatory profile completion after first login.
export async function updateUserProfile(userId, { firstName, lastName, age }) {
     await pool.query(
        "UPDATE users SET firstName = ?, lastName = ?, age = ?, profileCompleted = ? WHERE id = ?",
        [firstName, lastName, age, true, userId]
    );
    return getUser(userId);
}

export async function getUserStatus(userId) {
    const [rows] = await pool.query("SELECT passwordChanged, profileCompleted FROM users WHERE id = ?", [userId]);
    return rows[0] || null;
}

export async function updateUserBalance(userId, amount) {
    await pool.query("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, userId]);
    return getUser(userId);
}

export async function recordWithdrawal(userId, amount) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query("UPDATE users SET balance = balance - ? WHERE id = ?", [amount, userId]);
        await connection.query("UPDATE users SET withdrawalTotal = withdrawalTotal + ? WHERE id = ?", [amount, userId]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    return getUser(userId);
}

// --- Game Paytable Operations ---

export async function getPaytable(gameId) {
    const [rows] = await pool.query("SELECT paytable FROM paytables WHERE gameId = ?", [gameId]);
    if (rows.length === 0) {
        throw new Error(`Paytable for game '${gameId}' not found in database.`);
    }
    return rows[0].paytable;
}

export async function getGameConfiguration(gameId) {
    // This function fetches the complete editable configuration for a game.
    // Assumes `paytables` table also has a `symbolWeights` JSON column.
    const [rows] = await pool.query("SELECT paytable, symbolWeights FROM paytables WHERE gameId = ?", [gameId]);
    if (rows.length === 0) {
        // Return a default structure if no config is found in the DB yet.
        return { paytable: {}, symbolWeights: {} };
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

// --- Withdrawal Request Operations ---

export async function createWithdrawalRequest(userId, amount) {
    // Assumes `withdrawal_requests` table exists.
    await pool.query(
        "INSERT INTO withdrawal_requests (userId, amount, status, requestedAt) VALUES (?, ?, ?, ?)",
        [userId, amount, 'pending', new Date()]
    );
    return { message: 'Withdrawal request submitted successfully.' };
}

export async function getWithdrawalRequests(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query("SELECT COUNT(*) as total FROM withdrawal_requests");

    const [rows] = await pool.query(`
        SELECT w.*, u.username
        FROM withdrawal_requests w
        JOIN users u ON w.userId = u.id
        ORDER BY w.requestedAt DESC
        LIMIT ? OFFSET ?
    `, [limit, offset]);

    return {
        data: rows,
        totalPages: Math.ceil(total / limit),
        currentPage: page
    };
}

export async function updateWithdrawalRequestStatus(requestId, adminId, status) {
    // This function should be a transaction.
    // If status is 'approved', we also deduct the balance from the user.
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // First, get the request details
        const [requests] = await connection.query("SELECT * FROM withdrawal_requests WHERE id = ?", [requestId]);
        const request = requests[0];

        if (!request) {
            throw new Error('Request not found.');
        }
        if (request.status !== 'pending') {
            throw new Error('This request has already been reviewed.');
        }

        if (status === 'approved') {
            // Check if user has sufficient balance
            const [users] = await connection.query("SELECT balance FROM users WHERE id = ?", [request.userId]);
            const user = users[0];
            if (!user || user.balance < request.amount) {
                throw new Error('User has insufficient balance for this withdrawal.');
            }
            // Deduct from balance and add to withdrawalTotal
            await connection.query("UPDATE users SET balance = balance - ?, withdrawalTotal = withdrawalTotal + ? WHERE id = ?", [request.amount, request.amount, request.userId]);
        }

        // Now, update the request status
        await connection.query(
            "UPDATE withdrawal_requests SET status = ?, reviewedAt = ?, reviewerId = ? WHERE id = ?",
            [status, new Date(), adminId, requestId]
        );

        await connection.commit();
        return { message: `Request ${requestId} has been ${status}.` };

    } catch (error) {
        await connection.rollback();
        throw error; // Re-throw the error to be handled by the API layer
    } finally {
        connection.release();
    }
}

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
