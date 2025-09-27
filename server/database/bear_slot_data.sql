-- =================================================================
--
-- File: bear_slot_data.sql
-- Description: This script inserts the paytable and symbol weights for the 'bear-slot' game.
--
-- =================================================================

-- The `paytables` table is assumed to have the following columns:
-- - gameId (VARCHAR, PRIMARY KEY)
-- - paytable (JSON)
-- - symbolWeights (JSON)

-- Upsert the configuration for 'bear-slot'
INSERT INTO `paytables` (`gameId`, `paytable`, `symbolWeights`)
VALUES
(
  'bear-slot',
  -- Paytable defines the payout for matching symbols.
  -- Key: symbol name, Value: { "matches": payout_multiplier }
  '{
    "S1": { "3": 50, "4": 100, "5": 200 },
    "S2": { "3": 40, "4": 80, "5": 160 },
    "S3": { "3": 30, "4": 60, "5": 120 },
    "S4": { "3": 20, "4": 40, "5": 80 },
    "S5": { "3": 10, "4": 20, "5": 40 },
    "JACKPOT": { "3": 500, "4": 1000, "5": 5000 }
  }',
  -- Symbol weights determine the frequency of each symbol appearing on the reels.
  -- Higher numbers mean higher frequency.
  '{
    "S1": 5,
    "S2": 10,
    "S3": 15,
    "S4": 20,
    "S5": 25,
    "WILD": 3,
    "JACKPOT": 1
  }'
)
ON DUPLICATE KEY UPDATE
  `paytable` = VALUES(`paytable`),
  `symbolWeights` = VALUES(`symbolWeights`);