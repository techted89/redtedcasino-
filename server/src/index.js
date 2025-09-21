import express from 'express';
import spinRouter from './api/spin.js';
import adminRouter from './api/admin.js';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// API routes
app.use('/api', spinRouter);
app.use('/api/admin', adminRouter);

app.get('/', (req, res) => {
  res.send('Slot machine server is running!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
