const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your-secret-key-change-this'; // Must match auth.js

const verifyToken = (req, res, next) => {
    const tokenHeader = req.headers['authorization'];
    if (!tokenHeader) {
        return res.status(403).json({ auth: false, message: 'No token provided.' });
    }

    const token = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : tokenHeader;

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        }
        // Save to request for use in other routes
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.userName = decoded.name;
        req.userEmail = decoded.email;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Require Admin Role!' });
    }
    next();
};

module.exports = { verifyToken, isAdmin };
