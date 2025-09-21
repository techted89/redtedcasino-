import request from 'supertest';
import app from '../index.js'; // Import the configured Express app

// We need to mock the database operations to avoid real DB calls in tests.
// Jest's mocking capabilities are perfect for this.
jest.mock('../database/operations.js');

describe('Admin API', () => {

    describe('GET /api/admin/users', () => {

        it('should return 403 Forbidden if no admin token is provided', async () => {
            const response = await request(app).get('/api/admin/users');
            expect(response.status).toBe(403);
            expect(response.body.message).toContain('Admin token is missing or invalid');
        });

        it('should return 200 OK and a list of users if the token is valid', async () => {
            // This test requires mocking the getAllUsers function
            const { getAllUsers } = await import('../database/operations.js');
            getAllUsers.mockResolvedValue([
                { id: 1, username: 'testuser1', balance: 100 },
                { id: 2, username: 'testuser2', balance: 200 }
            ]);

            const response = await request(app)
                .get('/api/admin/users')
                .set('x-admin-token', 'secret-admin-token'); // Use the mock token

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(2);
            expect(response.body[0].username).toBe('testuser1');
        });
    });

});
