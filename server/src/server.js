import app from './index.js';
import { testConnection } from './database/connection.js';

const port = 3000;

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
