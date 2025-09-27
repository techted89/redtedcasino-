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
    'bear-slot': {
      id: 'bear-slot',

      name: 'Bear Slot',
      gameUrl: 'bear-slot/index.html',

      name: 'Bear slot',
      gameUrl: '/bear-slot/index.html',
      backgroundImage: '/bear-slot/img/background.jpg',

      gameUrl: 'slot.html',

      gameType: '3x3',
      backgroundImage: 'http://redtedcasino.com/BearSlot/img/background.jpg',

      symbols: {

        S1: 'http://redtedcasino.com/BearSlot/img/symbol1.png',
        S2: 'http://redtedcasino.com/BearSlot/img/symbol2.png',
        S3: 'http://redtedcasino.com/BearSlot/img/symbol3.png',
        S4: 'http://redtedcasino.com/BearSlot/img/symbol4.png',
        S5: 'http://redtedcasino.com/BearSlot/img/symbol5.png',
        WILD: 'http://redtedcasino.com/BearSlot/img/symbol_wild.png',
        JACKPOT: 'http://redtedcasino.com/BearSlot/img/symbol_jackpot.png'

        S1: '/bear-slot/img/symbol1.png',
        S2: '/bear-slot/img/symbol2.png',
        S3: '/bear-slot/img/symbol3.png',
        S4: '/bear-slot/img/symbol4.png',
        S5: '/bear-slot/img/symbol5.png',
        WILD: '/bear-slot/img/symbol_wild.png',
        JACKPOT: '/bear-slot/img/symbol_jackpot.png'
      },
    },
    'medusa-lair': {
      id: 'medusa-lair',
      name: "Medusa's Lair",
      gameUrl: 'medusa-lair.html',
      backgroundImage: '/medusa-lair/img/background.jpg',
      symbols: {
        S1: '/medusa-lair/img/symbol1.png',
        S2: '/medusa-lair/img/symbol2.png',
        S3: '/medusa-lair/img/symbol3.png',
        S4: '/medusa-lair/img/symbol4.png',
        S5: '/medusa-lair/img/symbol5.png',
        WILD: '/medusa-lair/img/symbol_wild.png',
        JACKPOT: '/medusa-lair/img/symbol_jackpot.png'

      }
    },
    'medusa-lair': {
      id: 'medusa-lair',
      name: "Medusa's Lair",
      gameUrl: 'medusa-lair.html',
      gameType: '3x3',
      backgroundImage: '/medusa-lair/img/background.jpg',
      symbols: {
        S1: '/medusa-lair/img/symbol1.png',
        S2: '/medusa-lair/img/symbol2.png',
        S3: '/medusa-lair/img/symbol3.png',
        S4: '/medusa-lair/img/symbol4.png',
        S5: '/medusa-lair/img/symbol5.png',
        WILD: '/medusa-lair/img/symbol_wild.png',
        JACKPOT: '/medusa-lair/img/symbol_jackpot.png'
      }
    },
    'solana-slot': {
      id: 'solana-slot',
      name: 'Solana Slot',
      gameUrl: 'solana-slot/public/index.html',
      gameType: '5x1',
      backgroundImage: '/solana-slot/public/images/bg.png',
      symbols: {
        'LEMON': 'LEMON',
        'BELL': 'BELL',
        'ORANGE': 'ORANGE',
        'CHERRY': 'CHERRY',
        'GRAPE': 'GRAPE',
        'DIAMOND': 'DIAMOND'
      }
    }
    // New games can be added here in the future
  }
};

// The __UNSAFE_updateGameConfig function has been removed.
// Paytables are now managed in the database.