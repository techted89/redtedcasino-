-- =================================================================
--
-- File: solana_slot_data.sql
-- Description: This script inserts the paytable and symbol weights for the 'solana-slot' game.
--
-- =================================================================

-- The `paytables` table is assumed to have the following columns:
-- - gameId (VARCHAR, PRIMARY KEY)
-- - paytable (JSON)
-- - symbolWeights (JSON)

-- Upsert the configuration for 'solana-slot'
INSERT INTO `paytables` (`gameId`, `paytable`, `symbolWeights`)
VALUES
(
  'solana-slot',
  -- Paytable for the 'solana-slot' game.
  '{
    "DIAMOND": { "3": 45, "4": 60, "5": 75 },
    "CHERRY": { "3": 30, "4": 40, "5": 50 },
    "GRAPE": { "3": 15, "4": 20, "5": 25 },
    "BELL": { "3": 6, "4": 8, "5": 10 },
    "LEMON": { "3": 3, "4": 4, "5": 5 },
    "ORANGE": { "3": 5, "4": 6, "5": 8 }
  }',
  -- Symbol weights for 'solana-slot'. Since this is a 5x1 game,
  -- there are no "WILD" or "JACKPOT" symbols in this configuration.
  -- The weights are balanced to make higher-paying symbols rarer.
  '{
    "DIAMOND": 1,
    "CHERRY": 3,
    "GRAPE": 5,
    "BELL": 10,
    "LEMON": 15,
    "ORANGE": 12
  }'
)
ON DUPLICATE KEY UPDATE
  `paytable` = VALUES(`paytable`),
  `symbolWeights` = VALUES(`symbolWeights`);