import { jest, describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../database/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'a-very-secret-and-complex-key-for-dev';

jest.unstable_mockModule('../database/operations.js', () => ({
    getAllUsers: jest.fn(),
    getUserByUsername: jest.fn(),
    getGameConfiguration: jest.fn(),
}));

let app;
let getAllUsers;
let getGameConfiguration;
let getUserByUsername;

describe('Admin API', () => {

    beforeAll(async () => {
        const dbOps = await import('../database/operations.js');
        getAllUsers = dbOps.getAllUsers;
        getUserByUsername = dbOps.getUserByUsername;
        getGameConfiguration = dbOps.getGameConfiguration;

        const index = await import('../index.js');
        app = index.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        getGameConfiguration.mockResolvedValue({ paytable: {}, symbolWeights: {} });
        getUserByUsername.mockResolvedValue({ id: 1, username: 'admin', password: 'hashedpassword', isAdmin: true });
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('GET /api/admin/users', () => {

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(app).get('/api/admin/users');
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if token is not for an admin', async () => {
            const nonAdminToken = jwt.sign({ userId: 2, username: 'test', isAdmin: false }, JWT_SECRET, { expiresIn: '1h' });
            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${nonAdminToken}`);
            expect(response.status).toBe(403);
        });

        it('should return 200 OK and a list of users if the admin token is valid', async () => {
            const mockUsers = {
                data: [{ id: 1, username: 'testuser1', balance: 100 }],
                totalPages: 1,
                currentPage: 1
            };
            getAllUsers.mockResolvedValue(mockUsers);

            const adminToken = jwt.sign({ userId: 1, username: 'admin', isAdmin: true }, JWT_SECRET, { expiresIn: '1h' });

            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(getAllUsers).toHaveBeenCalledTimes(1);
            expect(response.body).toEqual(mockUsers);
        });
    });
});
