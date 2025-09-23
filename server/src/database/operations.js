import pool from './connection.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// --- User Operations ---

// All user queries will now select the new fields.
// The password field is excluded by default for security.
const USER_COLUMNS = 'id, username, balance, firstName, lastName, age, withdrawalTotal, isAdmin, createdAt';

export async function getAllUsers() {
    const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users`);
    return rows;
}

export async function getUser(userId) {
    const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [userId]);
    return rows[0] || null;
}

export async function getUserByUsername(username) {
    // This function is special: it includes the password hash for login verification.
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    return rows[0] || null;
}

export async function createUser(username, initialBalance, firstName, lastName, age) {
    // Note: This function does not set a password. A separate step is needed.
    // This is for creating regular users, not admins.
    const [result] = await pool.query(
        "INSERT INTO users (username, balance, firstName, lastName, age, isAdmin, withdrawalTotal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [username, initialBalance, firstName, lastName, age, false, 0, new Date()]
    );
    const newUser = { id: result.insertId, username, balance: initialBalance, firstName, lastName, age };
    return newUser;
}

export async function createAdminUser(username, password, firstName, lastName, age) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
        "INSERT INTO users (username, password, balance, firstName, lastName, age, isAdmin, withdrawalTotal, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [username, hashedPassword, 10000, firstName, lastName, age, true, 0, new Date()] // Admins start with 10k balance
    );
    const newUser = { id: result.insertId, username, balance: 10000, firstName, lastName, age, isAdmin: true };
    return newUser;
}

export async function updateUserPassword(userId, password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId]
    );
    return { message: 'Password updated successfully.' };
}

export async function updateUserBalance(userId, amount) {
    await pool.query(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        [amount, userId]
    );
    const updatedUser = await getUser(userId);
    return updatedUser;
}

export async function recordWithdrawal(userId, amount) {
    // This is a transaction to ensure atomicity
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
    const updatedUser = await getUser(userId);
    return updatedUser;
}


// --- Game Paytable Operations ---

export async function getPaytable(gameId) {
    // This assumes a `paytables` table exists with `gameId` (VARCHAR) and `paytable` (JSON) columns.
    const [rows] = await pool.query("SELECT paytable FROM paytables WHERE gameId = ?", [gameId]);
    if (rows.length === 0) {
        // Fallback to config if not in DB? For now, we'll require it in DB.
        throw new Error(`Paytable for game '${gameId}' not found in database.`);
    }
    return rows[0].paytable;
}

export async function updatePaytable(gameId, paytable) {
    // This uses INSERT ... ON DUPLICATE KEY UPDATE (upsert)
    // Assumes `gameId` is a unique key or primary key in the `paytables` table.
    const paytableJson = JSON.stringify(paytable);
    await pool.query(
        "INSERT INTO paytables (gameId, paytable) VALUES (?, ?) ON DUPLICATE KEY UPDATE paytable = ?",
        [gameId, paytableJson, paytableJson]
    );
    return { message: `Paytable for '${gameId}' updated successfully.` };
}
