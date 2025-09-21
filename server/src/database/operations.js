import pool from './connection.js';

// --- User Operations ---

export async function getAllUsers() {
    const [rows] = await pool.query("SELECT * FROM users");
    return rows;
}

export async function getUser(userId) {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
    return rows[0] || null; // Return the first row or null if not found
}

export async function getUserByUsername(username) {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    return rows[0] || null;
}

export async function createUser(username, initialBalance) {
    const [result] = await pool.query(
        "INSERT INTO users (username, balance, createdAt) VALUES (?, ?, ?)",
        [username, initialBalance, new Date()]
    );
    const newUser = { id: result.insertId, username, balance: initialBalance };
    return newUser;
}

export async function updateUserBalance(userId, amount) {
    // We need to ensure the user exists and get the updated balance in one transaction
    // for production, but for this scaffolding, a simple update is fine.
    await pool.query(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        [amount, userId]
    );
    // After updating, fetch the user to return the updated document
    const updatedUser = await getUser(userId);
    return updatedUser;
}
