import request from 'supertest';

// Use top-level await to dynamically import the app after mocks are set up
const { default: app } = await import('../index.js');

// Use jest.unstable_mockModule to mock before imports
jest.unstable_mockModule('../database/operations.js', () => ({
    getAllUsers: jest.fn(),
    createUser: jest.fn(),
    getUser: jest.fn(),
    updateUserBalance: jest.fn()
}));

// Now that the mock is in place, we can import the mocked functions
const { getAllUsers } = await import('../database/operations.js');


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
