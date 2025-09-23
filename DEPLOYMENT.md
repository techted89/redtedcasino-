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
2.  Create a new database and a dedicated user for the application. Use a strong, unique password for your database user.
    ```sql
    -- Example SQL for creating the database and user.
    -- Replace 'your_strong_password' with your actual password.
    CREATE DATABASE dbs14774816;
    CREATE USER 'dbu536762'@'localhost' IDENTIFIED BY 'your_strong_password';
    GRANT ALL PRIVILEGES ON dbs14774816.* TO 'dbu536762'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```
3.  Run the `schema.sql` script to create all the necessary tables.
    ```bash
    # From within the server directory (/var/www/redted-casino-server)
    mysql -u dbu536762 -p dbs14774816 < database/schema.sql
    ```

### 4. Application Configuration

1.  In the server directory (`/var/www/redted-casino-server`), create a file named `.env`.
2.  Add the following content to the `.env` file. Fill in the `DB_PASSWORD` with the password you created above, and generate a long, random, and secret string for the `JWT_SECRET`.
    ```
    # Database Configuration
    DB_HOST=localhost
    DB_USER=dbu536762
    DB_PASSWORD=...your_database_password_here...
    DB_NAME=dbs14774816

    # Application Security
    JWT_SECRET=...your_super_long_and_secret_jwt_string_here...
    ```

### 5. Install Dependencies & Create Admin User

1.  Navigate to the server directory.
    ```bash
    cd /var/www/redted-casino-server
    ```
2.  Install the Node.js dependencies.
    ```bash
    npm install
    ```
3.  **Create the Initial Admin User.** Run the following command. Replace the bracketed values with your desired admin credentials.
    ```bash
    # Usage: npm run create-admin -- <username> <password> <firstName> <lastName> <age>
    npm run create-admin -- admin your_secure_password Admin User 99
    ```

### 6. Run the Application

1.  Start the application using the `pm2` process manager. This will ensure the server runs in the background and restarts automatically if it crashes.
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
├── test-harness.html
└── utils.js
```

### 2. Configuration

No further configuration is needed. The client-side files have already been updated to point all API requests directly to your server's IP address (`http://74.208.167.101`).

---

## Deployment Complete

Once both parts are complete, you should be able to navigate to `http://redtedcasino.com` in your browser, and it will communicate with the backend server running on your VPS.

---

## Part 3: Production Build Steps (Recommended)

For a true production deployment, the client-side assets (`.html`, `.js` files) should be optimized to improve performance. This typically involves **bundling** and **minification**.

-   **Bundling:** Combining multiple JavaScript files (like `utils.js` and the scripts inside each HTML file) into a single file. This reduces the number of HTTP requests the browser needs to make.
-   **Minification:** Removing all unnecessary characters (whitespace, comments, etc.) from code to reduce its file size, making it faster to download.

While this repository is not set up with a build tool, here is a high-level overview of how you would do this with a popular tool like **Vite**:

1.  **Restructure Client Files:** You would move your client-side JavaScript out of the `<script>` tags in your HTML files and into separate `.js` files (e.g., `admin.js`, `index.js`).
2.  **Install Vite:** Add Vite to your project as a development dependency (`npm install -D vite`).
3.  **Create a Vite Config:** Create a `vite.config.js` file to tell Vite which files are your entry points (e.g., your HTML files).
4.  **Run the Build:** Execute the `vite build` command. Vite will automatically bundle your scripts, minify them, and place the optimized output in a `dist` directory.
5.  **Deploy the `dist` Folder:** Instead of uploading the raw `client/` directory to your web host, you would upload the contents of the generated `dist/` directory.

This build step is a standard practice for production web applications and is highly recommended for the best performance and user experience.
