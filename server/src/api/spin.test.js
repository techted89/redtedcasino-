import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// 1. Set up the mock for the database operations module.
jest.unstable_mockModule('../database/operations.js', () => ({
    getAllUsers: jest.fn(),
    createUser: jest.fn(),
    getUser: jest.fn(),
    updateUserBalance: jest.fn(),
    getGameConfiguration: jest.fn(),
    updateGameStatistics: jest.fn(),
    updatePaytable: jest.fn(),
    getGameStatistics: jest.fn(),
    createWithdrawalRequest: jest.fn(),
    getWithdrawalRequests: jest.fn(),
    updateWithdrawalRequestStatus: jest.fn(),
    setUserBalance: jest.fn(),
    createAdminUser: jest.fn(),
    updateUserPassword: jest.fn(),
    forcePasswordChange: jest.fn(),
    updateUserProfile: jest.fn(),
    getUserStatus: jest.fn(),
    recordWithdrawal: jest.fn(),
    getUserByUsername: jest.fn(),
}));

// 2. Import the mocked functions and the application.
const { getUser, updateUserBalance, getGameConfiguration, updateGameStatistics } = await import('../database/operations.js');
const { default: app } = await import('../index.js');
const { config } = await import('../config.js');

describe('POST /api/spin', () => {
    // Before each test, clear all mocks to ensure isolation.
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock the statistics update by default to avoid errors in tests that don't focus on it.
        updateGameStatistics.mockResolvedValue();
    });

    it('should return 400 if userId, betAmount, or gameId is missing', async () => {
        const response = await request(app).post('/api/spin').send({});
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('userId, betAmount, and gameId are required');
    });

    it('should return 404 if the gameId does not exist in config', async () => {
        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId: 'non-existent-game' });
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Game not found');
    });

    it('should return 500 if game configuration is not found in the database', async () => {
        // This tests the core change: no fallback to static config.
        getGameConfiguration.mockRejectedValue(new Error("Game configuration for 'bear-slot' not found in database."));

        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId: 'bear-slot' });

        expect(response.status).toBe(500);
        expect(getGameConfiguration).toHaveBeenCalledWith('bear-slot');
        expect(response.body.message).toContain("Configuration error for this game. Please contact an admin.");
    });

    it('should return 404 if the user is not found', async () => {
        getGameConfiguration.mockResolvedValue({ paytable: { S1: { '3': 50 } }, symbolWeights: {} });
        getUser.mockResolvedValue(null);

        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 999, betAmount: 10, gameId: 'bear-slot' });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    it('should return 400 for insufficient balance', async () => {
        getGameConfiguration.mockResolvedValue({ paytable: { S1: { '3': 50 } }, symbolWeights: {} });
        getUser.mockResolvedValue({ id: 1, balance: 5 });

        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId: 'bear-slot' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Insufficient balance');
    });

    it('should successfully process a spin for a 3x3 game and return winnings', async () => {
        const gameId = 'medusa-lair';
        const gameConfig = config.games[gameId];

        // Mock DB calls
        getGameConfiguration.mockResolvedValue({
            paytable: { S1: { "3": 50, "4": 100, "5": 200 } },
            symbolWeights: { S1: 1 } // Ensure S1 is the only possible outcome
        });
        getUser.mockResolvedValue({ id: 1, balance: 100 });
        // Mock the return value of the second updateUserBalance call (for winnings)
        updateUserBalance.mockResolvedValue({ id: 1, balance: 100 - 10 + 2000 });

        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId });

        expect(response.status).toBe(200);
        expect(response.body.winnings).toBe(2000); // 10 * 200 for 5 matching S1 symbols
        expect(response.body.reels).toEqual(Array(5).fill(gameConfig.symbols.S1));
        expect(updateUserBalance).toHaveBeenCalledWith(1, -10); // Bet
        expect(updateUserBalance).toHaveBeenCalledWith(1, 2000); // Winnings
        expect(response.body.newBalance).toBe(100 - 10 + 2000);
    });

    it('should successfully process a spin for a 5x1 game with no winnings', async () => {
        const gameId = 'solana-slot';

        // Mock DB calls
        getGameConfiguration.mockResolvedValue({
            paytable: { 'DIAMOND': { '3': 45 } },
            symbolWeights: {} // Will cause unweighted spin
        });
        getUser.mockResolvedValue({ id: 1, balance: 100 });

        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 5, gameId });

        expect(response.status).toBe(200);
        expect(response.body.winnings).toBe(0);
        expect(response.body.newBalance).toBe(95); // 100 - 5
        expect(updateUserBalance).toHaveBeenCalledTimes(1); // Only for the bet
        expect(updateUserBalance).toHaveBeenCalledWith(1, -5);
    });
});