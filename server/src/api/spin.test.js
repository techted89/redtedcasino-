import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import pool from '../database/connection.js';

jest.unstable_mockModule('../database/operations.js', () => ({
    getUser: jest.fn(),
    updateUserBalance: jest.fn(),
    getGameConfiguration: jest.fn(),
    updateGameStatistics: jest.fn(),
}));

let app;
let getUser;
let updateUserBalance;
let getGameConfiguration;
let updateGameStatistics;
let config;

describe('POST /api/spin', () => {

    beforeAll(async () => {
        const dbOps = await import('../database/operations.js');
        getUser = dbOps.getUser;
        updateUserBalance = dbOps.updateUserBalance;
        getGameConfiguration = dbOps.getGameConfiguration;
        updateGameStatistics = dbOps.updateGameStatistics;

        const index = await import('../index.js');
        app = index.default;

        const configModule = await import('../config.js');
        config = configModule.config;
    });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        updateGameStatistics.mockResolvedValue();
    });

    it('should return 400 if userId, betAmount, or gameId is missing', async () => {
        const response = await request(app).post('/api/spin').send({});
        expect(response.status).toBe(400);
    });

    it('should return 404 if the gameId does not exist in config', async () => {
        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId: 'non-existent-game' });
        expect(response.status).toBe(404);
    });

    it('should return 500 if game configuration is not found in the database', async () => {
        getGameConfiguration.mockRejectedValue(new Error("Game configuration not found."));
        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId: 'bear-slot' });
        expect(response.status).toBe(500);
    });

    it('should return 404 if the user is not found', async () => {
        getGameConfiguration.mockResolvedValue({ paytable: { S1: { '3': 50 } }, symbolWeights: {} });
        getUser.mockResolvedValue(null);
        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 999, betAmount: 10, gameId: 'bear-slot' });
        expect(response.status).toBe(404);
    });

    it('should return 400 for insufficient balance', async () => {
        getGameConfiguration.mockResolvedValue({ paytable: { S1: { '3': 50 } }, symbolWeights: {} });
        getUser.mockResolvedValue({ id: 1, balance: 5 });
        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId: 'bear-slot' });
        expect(response.status).toBe(400);
    });

    it('should successfully process a spin and return winnings', async () => {
        const gameId = 'medusa-lair';
        const gameConfig = config.games[gameId];
        getGameConfiguration.mockResolvedValue({
            paytable: { S1: { "3": 50, "4": 100, "5": 200 } },
            symbolWeights: { S1: 1 }
        });
        getUser.mockResolvedValue({ id: 1, balance: 100 });
        updateUserBalance.mockResolvedValue({ id: 1, balance: 100 - 10 + 2000 });

        const response = await request(app)
            .post('/api/spin')
            .send({ userId: 1, betAmount: 10, gameId });

        expect(response.status).toBe(200);
        expect(response.body.winnings).toBe(2000);
    });
});
