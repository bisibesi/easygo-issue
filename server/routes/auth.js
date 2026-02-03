const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET_KEY = 'your-secret-key-change-this'; // In production, use env var

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, SECRET_KEY, {
            expiresIn: 86400 // 24 hours
        });

        res.json({ auth: true, token, user: { email: user.email, name: user.name, role: user.role } });
    });
});

// Logout (Client side just drops token, but we can verify token here)
router.post('/logout', (req, res) => {
    res.json({ auth: false, token: null });
});

// Verify Token (Get User)
router.get('/me', (req, res) => {
    const token = req.headers['authorization']; // Bearer <token>
    if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

    // Simple split if "Bearer " is present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

    jwt.verify(cleanToken, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
        res.status(200).send(decoded);
    });
});

module.exports = router;
