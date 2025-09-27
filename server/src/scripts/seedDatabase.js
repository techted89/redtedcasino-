import fs from 'fs/promises';
import path from 'path';
import pool from '../database/connection.js';

const seedDatabase = async () => {
    try {
        const directoryPath = path.join(process.cwd(), 'database');
        console.log(`Looking for SQL files in: ${directoryPath}`);

        const files = await fs.readdir(directoryPath);
        const sqlFiles = files.filter(file => file.endsWith('.sql'));

        // Sort files to ensure schema is loaded first
        sqlFiles.sort((a, b) => {
            if (a === 'schema.sql') return -1;
            if (b === 'schema.sql') return 1;
            return 0;
        });

        console.log('Found SQL files to execute:', sqlFiles);

        for (const file of sqlFiles) {
            const filePath = path.join(directoryPath, file);
            console.log(`Executing: ${file}`);
            const sql = await fs.readFile(filePath, 'utf8');
            // Split the file content into individual statements
            const statements = sql.split(/;\s*$/m).filter(statement => statement.length > 0);
            for (const statement of statements) {
                await pool.query(statement);
            }
            console.log(`Successfully executed ${file}`);
        }

        console.log('Database seeding completed successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await pool.end();
    }
};

seedDatabase();