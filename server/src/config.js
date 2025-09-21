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
  games: {
    'bear-slot': {
      id: 'bear-slot',
      name: 'Bear Slot',
      backgroundImage: 'http://redtedcasino.com/BearSlot/img/background.jpg',
      symbols: {
        S1: 'http://redtedcasino.com/BearSlot/img/symbol1.png',
        S2: 'http://redtedcasino.com/BearSlot/img/symbol2.png',
        S3: 'http://redtedcasino.com/BearSlot/img/symbol3.png',
        S4: 'http://redtedcasino.com/BearSlot/img/symbol4.png',
        S5: 'http://redtedcasino.com/BearSlot/img/symbol5.png',
        WILD: 'http://redtedcasino.com/BearSlot/img/symbol_wild.png',
        JACKPOT: 'http://redtedcasino.com/BearSlot/img/symbol_jackpot.png'
      },
      paytable: {
        'S1': { '3': 50, '4': 100, '5': 200 },
        'S2': { '3': 40, '4': 80, '5': 160 },
        'S3': { '3': 30, '4': 60, '5': 120 },
        'S4': { '3': 20, '4': 40, '5': 80 },
        'S5': { '3': 10, '4': 20, '5': 40 },
        'JACKPOT': { '3': 500, '4': 1000, '5': 5000 }
      }
    }
    // New games can be added here in the future
  }
};

// This is a hack to allow updating the config in this environment.
// In a real app, this would be handled by a proper database or config management system.
export function __UNSAFE_updateGameConfig(gameId, newPaytable) {
  if (config.games[gameId]) {
    config.games[gameId].paytable = newPaytable;
  }
}
