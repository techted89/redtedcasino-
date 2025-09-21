# Setup and Installation Instructions

This document provides instructions for setting up and running the slot machine application on your server.

## Overview

The application consists of two main parts:
1.  **Server**: A Node.js application that handles all game logic.
2.  **Client**: A web client for users to interact with the game (currently a placeholder).

## Server Setup

### Prerequisites
-   Node.js and npm installed on your server.

### Steps
1.  **Navigate to the server directory**:
    Open a terminal and change to the `server` directory.
    ```bash
    cd path/to/your/project/server
    ```

2.  **Install Dependencies**:
    Run `npm install` to download and install the required Node.js packages.
    ```bash
    npm install
    ```

3.  **Start the Server**:
    Run the following command to start the server:
    ```bash
    npm start
    ```
    The server will start on port 3000 by default.

4.  **Production Environment (Recommended)**:
    For a live server, it's best to use a process manager like `pm2` to ensure the server application runs continuously.
    ```bash
    # Install pm2 globally
    npm install pm2 -g

    # Start the server with pm2
    cd path/to/your/project/server
    pm2 start src/index.js --name "slot-server"
    ```

## Client and Web Server Setup

### Prerequisites
-   A web server like Nginx or Apache installed on your server.

### Steps
1.  **Serve the Client Files**:
    Configure your web server to serve the static files from the `client` directory. The root for your site `http://redtedcasino.com/BearSlot` should point to the `client` directory.

2.  **Set up a Reverse Proxy**:
    The client needs to communicate with the Node.js server for game actions. You need to configure your web server to act as a reverse proxy, forwarding API requests from the client to the Node.js server running on port 3000. You should proxy all requests from a path like `/api/` to `http://localhost:3000`.

    **Example for Nginx**:
    You would add a `location` block to your Nginx site configuration:
    ```nginx
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        # ... other proxy settings
    }
    ```
    The exact configuration will depend on your server setup. The goal is that a request from the browser to `http://redtedcasino.com/BearSlot/api/spin` gets routed to `http://localhost:3000/api/spin`.

## Admin Panel

A new admin panel has been added to manage users and game settings.

### Accessing the Admin Panel
1.  Navigate to `/admin.html` in your browser (e.g., `http://redtedcasino.com/BearSlot/admin.html`).
2.  You will be prompted for a password.

### Admin Password
-   The default admin password is `supersecretpassword`.
-   To change the password, you must edit the `adminPassword` field in the `server/src/config.js` file and restart the server.

### Features
The admin panel provides the following functionalities:
-   **User Management:** Create new users with an initial balance and update the balance of existing users.
-   **Payout Management:** View and edit the payout table for the slot machine.

### Important Note on Saving Payouts
Due to the limitations of this development environment, the "Save Payouts" button does **not** permanently save your changes. It will update the settings in the server's memory for the current session, but a server restart will revert the changes. To make permanent changes to the paytable, you must edit the `paytable` object in the `server/src/config.js` file and restart the server.
