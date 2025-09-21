import request from 'supertest';
import app from '../index.js';
import { getAllUsers, createUser, getUser, updateUserBalance } from '../database/operations.js';

// Mock the entire module with a factory function
jest.mock('../database/operations.js', () => ({
    getAllUsers: jest.fn(),
    createUser: jest.fn(),
    getUser: jest.fn(),
    updateUserBalance: jest.fn()
}));

describe('Admin API', () => {

    // Clear mocks before each test to ensure a clean state
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/users', () => {

        it('should return 403 Forbidden if no admin token is provided', async () => {
            const response = await request(app).get('/api/admin/users');
            expect(response.status).toBe(403);
        });

        it('should return 200 OK and a list of users if the token is valid', async () => {
            const mockUsers = [
                { id: 1, username: 'testuser1', balance: 100 },
                { id: 2, username: 'testuser2', balance: 200 }
            ];
            // Since we imported the mocked function, we can set its implementation
            getAllUsers.mockResolvedValue(mockUsers);

            const response = await request(app)
                .get('/api/admin/users')
                .set('x-admin-token', 'secret-admin-token');

            expect(response.status).toBe(200);
            expect(getAllUsers).toHaveBeenCalledTimes(1);
            expect(response.body).toEqual(mockUsers);
        });
    });

});
