# Production Deployment Guide

This guide provides step-by-step instructions for deploying the application to a production environment consisting of a static web host for the client and a VPS for the server.

- **Client Host:** `http://redtedcasino.com`
- **Server Host:** VPS at `74.208.167.101`

---

## Part 1: Server-Side Setup (VPS)

These steps should be performed on your VPS (Virtual Private Server) at `74.208.167.101`.

### 1. Prerequisites

Ensure your VPS has the following software installed:
- **Node.js** (version 18.x or later recommended)
- **npm** (usually comes with Node.js)
- **A MariaDB or MySQL database server.**
- **Nginx** (recommended for use as a reverse proxy)
- **PM2** (a process manager for Node.js: `npm install pm2 -g`)

### 2. File Placement

1.  Copy the entire `server/` directory from the repository to a location on your VPS. A common location is `/var/www/redted-casino-server`.
    ```bash
    # Example using scp (run from your local machine)
    scp -r server/ user@74.208.167.101:/var/www/redted-casino-server
    ```

### 3. Database Setup

1.  Log in to your database server as the root user.
    ```bash
    mysql -u root -p
    ```
2.  Create a new database and a dedicated user for the application. **Replace `'your_strong_password'` with a secure password.**
    ```sql
    CREATE DATABASE dbs14774816;
    CREATE USER 'dbu536762'@'localhost' IDENTIFIED BY 'your_strong_password';
    GRANT ALL PRIVILEGES ON dbs14774816.* TO 'dbu536762'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```
3.  Run the `schema.sql` script to create all the necessary tables.
    ```bash
    # Navigate to the server directory on your VPS
    cd /var/www/redted-casino-server
    # Run the script
    mysql -u dbu536762 -p dbs14774816 < database/schema.sql
    ```

### 4. Application Configuration

1.  In the server directory (`/var/www/redted-casino-server`), create a file named `.env`. This file will hold your environment variables.
2.  Add the following content to the `.env` file, replacing the placeholder values with your actual database credentials and a long, random string for your JWT secret.
    ```
    # Database Configuration
    DB_HOST=localhost
    DB_USER=dbu536762
    DB_PASSWORD=your_strong_password
    DB_NAME=dbs14774816

    # Application Security
    JWT_SECRET=your_super_long_and_secret_jwt_string_here
    ```

### 5. Install Dependencies & Run

1.  Navigate to the server directory.
    ```bash
    cd /var/www/redted-casino-server
    ```
2.  Install the Node.js dependencies.
    ```bash
    npm install
    ```
3.  Start the application using the `pm2` process manager. This will ensure the server runs in the background and restarts automatically if it crashes.
    ```bash
    pm2 start src/server.js --name "redted-api"
    ```
    You can check the status of your application with `pm2 list`.

### 6. Nginx Reverse Proxy Setup (Recommended)

1.  Create a new Nginx configuration file for your site.
    ```bash
    sudo nano /etc/nginx/sites-available/redtedcasino-api
    ```
2.  Paste the following configuration into the file. This sets up Nginx to listen for requests and forward them to your Node.js application running on port 3000.
    ```nginx
    server {
        listen 80;
        server_name 74.208.167.101;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
3.  Enable the site by creating a symbolic link.
    ```bash
    sudo ln -s /etc/nginx/sites-available/redtedcasino-api /etc/nginx/sites-enabled/
    ```
4.  Test the Nginx configuration and restart the service.
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```
**Note on HTTPS:** For a true production environment, you should secure your API with SSL/TLS (HTTPS). You can use a free tool like Certbot from Let's Encrypt to easily set this up for your Nginx server.

---

## Part 2: Client-Side Setup (Web Host)

These steps are for your static web hosting provider where `http://redtedcasino.com` is hosted.

### 1. File Placement

1.  Take all the files from the `client/` directory in the repository.
2.  Upload them to the root directory of your web hosting account (e.g., `public_html`, `www`, or similar).

The file structure on your web host should look like this:
```
/ (your web root)
├── admin.html
├── game-selection.html
├── index.html
├── slot.html
└── test-harness.html
```

### 2. Configuration

No further configuration is needed. The client-side files have already been updated to point all API requests directly to your server's IP address (`http://74.208.167.101`).

---

## Deployment Complete

Once both parts are complete, you should be able to navigate to `http://redtedcasino.com` in your browser, and it will communicate with the backend server running on your VPS.
