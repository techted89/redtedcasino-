// This is a command-line script to create an initial admin user.
import pool from '../database/connection.js';
import { createAdminUser } from '../database/operations.js';

async function run() {
    console.log('Running admin creation script...');

    // Get username and password from command-line arguments
    const args = process.argv.slice(2); // First two args are node executable and script path
    const [username, password, firstName, lastName, age] = args;

    if (!username || !password || !firstName || !lastName || !age) {
        console.error('Usage: npm run create-admin -- <username> <password> <firstName> <lastName> <age>');
        console.error('Please provide all required arguments.');
        process.exit(1); // Exit with an error code
    }

    try {
        const admin = await createAdminUser(username, password, firstName, lastName, parseInt(age, 10));
        console.log('Admin user created successfully:');
        console.log(admin);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.error(`Error: Admin user with username "${username}" already exists.`);
        } else {
            console.error('Failed to create admin user:', error);
        }
        process.exit(1);
    } finally {
        // Ensure the connection pool is closed gracefully
        await pool.end();
        console.log('Database connection pool closed.');
    }
}

run();
