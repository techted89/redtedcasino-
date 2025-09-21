# Setup and Installation Instructions

This document provides instructions for setting up and running the multi-game slot machine application.

## Overview

The application has been restructured to support multiple slot machine games. The main components are:
1.  **Server**: A Node.js application that handles all game logic, user authentication, and game configuration.
2.  **Client**: A set of web pages for the user login, game selection, and the slot machine game itself.
3.  **Admin Panel**: A comprehensive admin page (`admin.html`) for managing users and game configurations.

## Deployment (Choose One Method)

### Method 1: Deployment with Docker (Recommended)
This is the easiest and most reliable way to run the application.

**Prerequisites:**
-   Docker and Docker Compose installed on your server.
-   A running MariaDB (or MySQL) server accessible from your Docker environment.

**Steps:**

1.  **Create the Database Table:**
    Connect to your MariaDB server and run the following SQL commands to create the database and the required `users` table:
    ```sql
    CREATE DATABASE IF NOT EXISTS redtedcasino;
    USE redtedcasino;
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```

2.  **Configure Environment Variables:**
    The `docker-compose.yml` file is configured to read database credentials and other secrets from environment variables. For local testing, you can create a `.env` file in the project root:
    ```
    # .env file for local Docker development
    DB_HOST=host.docker.internal # For Docker Desktop, use your server's IP if on a remote host
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=redtedcasino
    ADMIN_PASSWORD=supersecretpassword
    ```
    **In production, set these variables securely in your hosting environment.**

3.  **Build and Run the Container:**
    From the root directory of the project, run:
    ```bash
    docker-compose up -d --build
    ```
    The application server will be running on port 3000.

---

### Method 2: Manual Setup
Use this method if you cannot use Docker.

-   **Prerequisites**: Node.js, npm, and a running MariaDB server.
-   **Database Setup**: Follow Step 1 from the Docker method to create the database and table.
-   **Application Setup**:
    1.  Open `server/src/config.js` and manually enter your database credentials and admin password.
    2.  Navigate to the `server/` directory.
    3.  Run `npm install`.
    4.  Run `npm start`.

## Client and Web Server Setup
Regardless of the deployment method, you still need a web server like Nginx or Apache to serve the static files from the `client` directory and to act as a reverse proxy for the API.

- **Serve Client Files:** Configure your web server to serve the files from the `client` directory.
- **Reverse Proxy:** Configure the web server to forward all requests for `/api/` to the Node.js server running on port 3000 (e.g., `proxy_pass http://localhost:3000;`).

## Application Flow

1.  **User Login**: Users start at `index.html` where they must log in with a username. User accounts must be created by an admin first.
2.  **Game Selection**: After login, users are directed to `game-selection.html`, where they can choose from a list of available slot games.
3.  **Playing a Game**: Clicking on a game takes the user to `slot.html`.

## Admin Panel
- **Access:** Navigate to `admin.html`.
- **Password:** The default password is `supersecretpassword` (can be changed via environment variable or in `config.js`).
- **Features:** Manage users (create, update balance) and game paytables.

## Managing Games
To add a new slot machine game, you must manually edit the `server/src/config.js` file. See the comments within that file for the required object structure. After editing, you will need to restart the server (or rebuild the Docker container).
