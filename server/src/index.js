import express from 'express';
import spinRouter from './api/spin.js';
import adminRouter from './api/admin.js';
import { getUserByUsername } from './database.js';
import { config } from './config.js'; // Import config

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// --- User Authentication ---
app.post('/api/users/login', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    const user = getUserByUsername(username);
    if (user) {
        // In a real app, you'd use JWTs. Here, we use a simple mock token.
        const token = `user-token-${user.id}-${Date.now()}`;
        res.json({ message: 'Login successful', token, user });
    } else {
        res.status(404).json({ message: 'User not found. Please contact an admin to create an account.' });
    }
});

// --- Game API ---
app.get('/api/games', (req, res) => {
    // In a real app, you might not want to send the full config.
    // But for this prototype, sending the list of games is fine.
    const gamesList = Object.values(config.games).map(game => ({
        id: game.id,
        name: game.name,
        backgroundImage: game.backgroundImage // The image to display in the list
    }));
    res.json(gamesList);
});


// API routes
app.use('/api', spinRouter);
app.use('/api/admin', adminRouter);

app.get('/', (req, res) => {
  res.send('Slot machine server is running!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
