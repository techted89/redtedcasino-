import { Router } from 'express';
import { createUser, updateUserBalance, getUser, getAllUsers } from '../database.js';
import { config } from '../config.js';

const router = Router();

// In a real app, this token would be a signed JWT and have an expiration.
const MOCK_ADMIN_TOKEN = 'secret-admin-token';

// Admin login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === config.adminPassword) {
    res.json({
      message: 'Admin login successful',
      token: MOCK_ADMIN_TOKEN
    });
  } else {
    res.status(401).json({ message: 'Authentication failed: Invalid password' });
  }
});

// Middleware to check for admin token
const checkAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token === MOCK_ADMIN_TOKEN) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin token is missing or invalid' });
  }
};

// All routes below this point are protected
router.use(checkAuth);

// --- Settings Management ---

// Get current game settings
router.get('/settings', (req, res) => {
  res.json({
    paytable: config.paytable
  });
});

// This endpoint is special due to the environment limitations.
// It will dynamically create the content for config.js and then
// another tool will be used to overwrite the file.
// This is NOT how you would do this in production.
router.put('/settings', (req, res) => {
    const { paytable } = req.body;
    if (!paytable) {
        return res.status(400).json({ message: 'Paytable data is required' });
    }

    // In a real app, you'd update a database or a secure config store.
    // Here, we have to signal that the config file needs to be overwritten.
    // The actual file overwrite will be done by another tool call in the agent's workflow.
    // This endpoint just returns the new file content as a convenience.

    const newConfigFileContent = `
export let config = {
  adminPassword: '${config.adminPassword}',
  paytable: ${JSON.stringify(paytable, null, 2)}
};

export function __UNSAFE_updateConfig(newPaytable) {
  config.paytable = newPaytable;
}
`;

    // A real API would just return success. Here we return the content
    // to make it easier for the agent to overwrite the file.
    res.json({
        message: 'Settings updated successfully. The config file needs to be overwritten.',
        newConfigFileContent: newConfigFileContent
    });
});


// --- User Management ---

// Get all users
router.get('/users', (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

// Create a new user
router.post('/users/create', (req, res) => {
  const { username, initialBalance } = req.body;
  if (!username || initialBalance === undefined) {
    return res.status(400).json({ message: 'Username and initial balance are required' });
  }
  const newUser = createUser(username, initialBalance);
  res.status(201).json(newUser);
});

// Update a user's balance
router.put('/users/:userId/balance', (req, res) => {
  const { userId } = req.params;
  const { newBalance } = req.body;

  if (newBalance === undefined) {
    return res.status(400).json({ message: 'New balance is required' });
  }

  const user = getUser(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const balanceDifference = newBalance - user.balance;
  const updatedUser = updateUserBalance(userId, balanceDifference);

  res.json(updatedUser);
});

export default router;
