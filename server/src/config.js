// This file contains the configuration for the application.
// It reads sensitive data from environment variables, with fallbacks for local development.
export let config = {
  db: {
    host: process.env.DB_HOST || 'db5018640333.hosting-data.io',
    user: process.env.DB_USER || 'dbu536762',
    password: process.env.DB_PASSWORD || 'Dag0D0g0503!',
    database: process.env.DB_NAME || 'dbs14774816'
  },
  adminPassword: process.env.ADMIN_PASSWORD || 'supersecretpassword',
  jwtSecret: process.env.JWT_SECRET || 'a-very-secret-and-complex-key-for-dev',
  games: {
    'aetherian-vault': {
      id: 'aetherian-vault',
      name: 'Aetherian Vault',
      gameUrl: 'game.html', // Uses the unified game hub
      gameType: '5x4',
      backgroundImage: '/aetherian-vault/img/background.jpg',
      symbols: {
        // High-Value Symbols
        'CHRONOS_ORB': '/aetherian-vault/img/chronos_orb.png',
        'INFINITY_GEAR': '/aetherian-vault/img/infinity_gear.png',
        'CELESTIAL_MAP': '/aetherian-vault/img/celestial_map.png',
        // Low-Value Symbols
        'ACE': '/aetherian-vault/img/ace.png',
        'KING': '/aetherian-vault/img/king.png',
        'QUEEN': '/aetherian-vault/img/queen.png',
        'JACK': '/aetherian-vault/img/jack.png',
        // Special Symbols
        'AETHERIAN_KEY': '/aetherian-vault/img/wild.png', // Wild
        'VAULT_CORE': '/aetherian-vault/img/scatter.png', // Scatter
        'AETHER_SHARD': '/aetherian-vault/img/shard.png' // Progression Symbol
      }
    }
    // New games can be added here in the future
  }
};

// The __UNSAFE_updateGameConfig function has been removed.
// Paytables are now managed in the database.