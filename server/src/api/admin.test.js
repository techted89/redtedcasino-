import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Use the same secret as the application
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-secret-and-complex-key-for-dev';

// 1. Set up the mock for the module. This MUST come before any imports that use it.
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

// 2. Now that the mock is defined, we can import the mocked functions to control them.
const { getAllUsers, getGameConfiguration } = await import('../database/operations.js');

// 3. And import the application code, which will now see the mocked version.
const { default: app } = await import('../index.js');


describe('Admin API', () => {

    // Clear mocks before each test to ensure a clean state
    beforeEach(() => {
        jest.clearAllMocks();
        // Since we are testing auth, we need to mock the DB call inside getGameConfiguration
        getGameConfiguration.mockResolvedValue({ paytable: {}, symbolWeights: {} });
    });

    describe('GET /api/admin/users', () => {

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(app).get('/api/admin/users');
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if token is not for an admin', async () => {
            const nonAdminToken = jwt.sign({ id: 2, username: 'test', isAdmin: false }, JWT_SECRET, { expiresIn: '1h' });
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

            const adminToken = jwt.sign({ id: 1, username: 'admin', isAdmin: true }, JWT_SECRET, { expiresIn: '1h' });

            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(getAllUsers).toHaveBeenCalledTimes(1);
            expect(response.body).toEqual(mockUsers);
        });
    });

});
