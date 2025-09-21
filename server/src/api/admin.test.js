import request from 'supertest';
import app from '../index.js';
import { getAllUsers } from '../database/operations.js'; // Import at the top

// Mock the entire module
jest.mock('../database/operations.js');

describe('Admin API', () => {

    // Clear mocks before each test to ensure a clean state
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/users', () => {

        it('should return 403 Forbidden if no admin token is provided', async () => {
            const response = await request(app).get('/api/admin/users');
            expect(response.status).toBe(403);
            expect(response.body.message).toContain('Admin token is missing or invalid');
        });

        it('should return 200 OK and a list of users if the token is valid', async () => {
            // Set up the mock for this specific test
            const mockUsers = [
                { id: 1, username: 'testuser1', balance: 100 },
                { id: 2, username: 'testuser2', balance: 200 }
            ];
            getAllUsers.mockResolvedValue(mockUsers);

            const response = await request(app)
                .get('/api/admin/users')
                .set('x-admin-token', 'secret-admin-token');

            expect(response.status).toBe(200);
            expect(getAllUsers).toHaveBeenCalledTimes(1); // Verify the mock was called
            expect(response.body).toEqual(mockUsers);
            expect(response.body[0].username).toBe('testuser1');
        });
    });

});
