# Multi-Game Slot Machine Platform

## Functional Overview

This project is a robust and scalable platform for hosting multiple slot machine games. It features a client-server architecture with a Node.js backend and a web-based client. The platform is designed to be easily extensible, allowing for the addition of new games without impacting the core functionality or existing games.

## Feature Breakdown

### Client-Side Features

- **User Authentication:** A secure login system for players.
- **Game Selection:** A dynamic game selection screen that populates with available games from the server.
- **Modular Game Interface:** Each game is a self-contained module, allowing for unique themes, assets, and gameplay mechanics.
- **Phaser Game Engine:** The client-side games are built using the powerful Phaser 3 game engine, providing a rich and interactive user experience.
- **Admin Panel:** A comprehensive admin panel (`admin.html`) for managing users and game configurations.

### Server-Side Features

- **Node.js Backend:** A fast and reliable backend built with Node.js and Express.
- **RESTful API:** A well-defined API for handling user authentication, game data, and spin requests.
- **Centralized Game Logic:** A generic spin endpoint (`/api/spin`) handles the core slot machine logic for all games, ensuring consistency and ease of maintenance.
- **Database Integration:** The server is connected to a MariaDB database for storing user data, game configurations, and statistics.
- **Environment-Based Configuration:** The application is configured using environment variables, allowing for easy deployment across different environments.

## Project Information: "Medusa's Lair" Slot Machine

As part of the ongoing development of this platform, a new slot machine game, "Medusa's Lair," has been added. This game serves as a template for how to integrate new games into the existing architecture.

### "Medusa's Lair" Integration

- **Modular Design:** The game resides in its own directory (`client/medusa-lair/`) with its own HTML, JavaScript, and image assets.
- **Independent Configuration:** The game's paytable and symbol weights are defined in a separate SQL script (`server/database/medusa_lair_data.sql`), which is then loaded into the database.
- **Scalable Integration:** The game is seamlessly integrated into the game selection screen by adding its configuration to `server/src/config.js` and leveraging the dynamic `gameUrl` property.
- **No Core Logic Changes:** The "Medusa's Lair" game was added without any changes to the core server logic, demonstrating the platform's extensibility.