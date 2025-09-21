# Setup and Installation Instructions

This document provides instructions for setting up and running the multi-game slot machine application.

## Overview

The application has been restructured to support multiple slot machine games. The main components are:
1.  **Server**: A Node.js application that handles all game logic, user authentication, and game configuration.
2.  **Client**: A set of web pages for the user login, game selection, and the slot machine game itself.
3.  **Admin Panel**: A comprehensive admin page (`admin.html`) for managing users and game configurations.

## Server Setup

The server setup process remains the same.
-   **Prerequisites**: Node.js and npm.
-   **Installation**: Navigate to the `server` directory and run `npm install`.
-   **Running**: From the `server` directory, run `npm start`. The server will start on port 3000.
-   **Production**: Using a process manager like `pm2` is recommended for production.

## Application Flow

1.  **User Login**: Users start at `index.html` where they must log in with a username. User accounts must be created by an admin first.
2.  **Game Selection**: After login, users are directed to `game-selection.html`, where they can choose from a list of available slot games.
3.  **Playing a Game**: Clicking on a game takes the user to `slot.html`, which is the interface for playing the selected slot machine.

## Admin Panel

The admin panel has been updated to support the new multi-game architecture.

### Accessing the Admin Panel
1.  Navigate to `/admin.html` in your browser.
2.  Log in using the admin password.

### Admin Password
-   The default admin password is `supersecretpassword`.
-   This can be changed in the `server/src/config.js` file.

### Admin Features
-   **User Management**: Create new users and manage their balances. The user list is now searchable and sortable.
-   **Game Management**: View all configured games and edit the paytable for each game.

## Managing Games

### Editing a Game's Paytable
1.  In the Admin Panel, go to the "Game Management" section.
2.  Select a game from the dropdown list.
3.  The paytable for that game will be displayed. You can edit the values and click "Save Paytable".
4.  **Note**: These changes are saved in the server's memory and will be **lost on restart**. For permanent changes, you must edit the `config.js` file directly.

### Adding a New Game
To add a new slot machine game to the application, you must manually edit the `server/src/config.js` file.

1.  Open `server/src/config.js`.
2.  Inside the `config.games` object, add a new entry for your game. The key will be the new `gameId` (e.g., `'new-slot'`).
3.  The value should be an object with the following structure:
    ```javascript
    'new-slot': {
      id: 'new-slot', // Must match the key
      name: 'My New Slot Game', // Display name
      backgroundImage: 'URL to the game background',
      symbols: { /* ... object of symbol keys to symbol image URLs ... */ },
      paytable: { /* ... object defining the paytable for the new game ... */ }
    }
    ```
4.  Save the `config.js` file and restart the server. The new game will now appear on the game selection page.
