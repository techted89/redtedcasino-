import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'a-very-secret-and-complex-key-for-dev';

/**
 * Authentication middleware that verifies a JWT.
 * Can be configured to require admin privileges.
 * @param {boolean} requireAdmin - If true, the middleware will only pass if the user is an admin.
 */
export const checkAuth = (requireAdmin = false) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: Token is missing' });
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Forbidden: Token is invalid or expired' });
            }

            // If admin is required, check the isAdmin flag from the token payload.
            if (requireAdmin && !user.isAdmin) {
                return res.status(403).json({ message: 'Forbidden: Admin access required' });
            }

            // Attach the decoded user payload to the request object for use in subsequent handlers.
            req.user = user;
            next();
        });
    };
};
