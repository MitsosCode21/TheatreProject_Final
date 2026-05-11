const jwt = require('jsonwebtoken');

const JWT_SECRET = 'my_super_secret_village_key_2026'; 

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ error: "Απαιτείται σύνδεση." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Το session έληξε." });
        }
        req.user = user; 
        next();
    });
};

module.exports = { authenticateToken, JWT_SECRET };