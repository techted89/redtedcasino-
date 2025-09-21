// This file contains the configuration for the application.
// In a real production environment, you would use environment variables
// or a secure configuration management system for sensitive data.

export let config = {
  adminPassword: 'supersecretpassword', // Change this in a real environment
  paytable: {
    'S1': { '3': 50, '4': 100, '5': 200 },
    'S2': { '3': 40, '4': 80, '5': 160 },
    'S3': { '3': 30, '4': 60, '5': 120 },
    'S4': { '3': 20, '4': 40, '5': 80 },
    'S5': { '3': 10, '4': 20, '5': 40 },
    'JACKPOT': { '3': 500, '4': 1000, '5': 5000 }
  }
};

// This is a hack to allow updating the config in this environment.
// In a real app, this would be handled by a proper database or config management system.
export function __UNSAFE_updateConfig(newPaytable) {
  config.paytable = newPaytable;
}
