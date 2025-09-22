import mysql from 'mysql2/promise';
import { config } from '../config.js';

// Create a connection pool. This is more efficient than creating individual
// connections for each query. The pool manages the connections for you.
const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// We can also add a simple function to test the connection on startup.
export async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to MariaDB.');
        connection.release();
    } catch (error) {
        console.error('Could not connect to MariaDB:', error);
        throw error; // Re-throw the error to be caught by the startup script
    }
}

// Export the pool to be used by the operations module.
export default pool;
