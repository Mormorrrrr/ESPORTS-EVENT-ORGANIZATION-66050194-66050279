import jwt from 'jsonwebtoken';

const protect = (req, res, next) => {
    let token;

    // Check if authorization header exists and starts with Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const jwtSecret = process.env.JWT_SECRET || 'secret';
            const decoded = jwt.verify(token, jwtSecret);

            // Add user payload from token to request object
            req.user = decoded;

            next(); // Proceed to the next middleware or route handler
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

export default protect;
