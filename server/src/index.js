import express from 'express';
import spinRouter from './api/spin.js';
import adminRouter from './api/admin.js';
import { getUserByUsername } from './database/operations.js';
import { config } from './config.js';
import { testConnection } from './database/connection.js'; // Updated import

const app = express();
const port = 3000;

app.use(express.json());

// --- User Authentication ---
app.post('/api/users/login', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        const user = await getUserByUsername(username);
        if (user) {
            const token = `user-token-${user.id}-${Date.now()}`; // Changed from _id to id
            res.json({ message: 'Login successful', token, user });
        } else {
            res.status(404).json({ message: 'User not found. Please contact an admin.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --- Game API ---
app.get('/api/games', (req, res) => {
    const gamesList = Object.values(config.games).map(game => ({
        id: game.id,
        name: game.name,
        backgroundImage: game.backgroundImage
    }));
    res.json(gamesList);
});

// API routes
app.use('/api', spinRouter);
app.use('/api/admin', adminRouter);

app.get('/', (req, res) => {
  res.send('Slot machine server is running!');
});

// Start the server only after the database connection is established
testConnection()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server listening at http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('Failed to connect to the database, server did not start.', error);
        process.exit(1);
    });
