const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

exports.login = async (req, res) => {
    let conn;
    try {
        const { email, password } = req.body;
        conn = await pool.getConnection();
        const users = await conn.query("SELECT * FROM users WHERE email = ?", [email]);
        
        if (users.length > 0) {
            const user = users[0];
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                const token = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: '15m' });
                const refreshToken = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: '7d' });
                
                res.json({ message: "Επιτυχής σύνδεση!", user_id: user.user_id, name: user.name, token, refreshToken });
            } else {
                res.status(401).json({ error: 'Λάθος κωδικός' });
            }
        } else {
            res.status(401).json({ error: 'Ο χρήστης δεν βρέθηκε' });
        }
    } catch (err) { res.status(500).json({ error: 'Σφάλμα σύνδεσης' }); } 
    finally { if (conn) conn.release(); }
};

exports.register = async (req, res) => {
    let conn;
    try {
        const { name, email, password } = req.body;
        if (!email || !email.includes('@')) return res.status(400).json({ error: "Μη έγκυρη μορφή email." });
        if (!password || password.length < 6) return res.status(400).json({ error: "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες." });

        conn = await pool.getConnection();
        const existing = await conn.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Το email χρησιμοποιείται ήδη' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await conn.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword]);
        res.json({ message: "Εγγραφή ολοκληρώθηκε", user_id: Number(result.insertId) });
    } catch (err) { res.status(500).json({ error: 'Σφάλμα εγγραφής' }); } 
    finally { if (conn) conn.release(); }
};

exports.refresh = (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Missing Refresh Token" });

    jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Refresh Token" });
        const newAccessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
        const newRefreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    });
};

// =========================================================================
// ΝΕΟ: ΕΞΩΤΕΡΙΚΗ ΣΥΝΔΕΣΗ (GOOGLE / AUTH0)
// =========================================================================
exports.externalLogin = async (req, res) => {
    let conn;
    try {
        const { email, name, external_id } = req.body;
        conn = await pool.getConnection();

        // Ψάχνουμε αν υπάρχει ήδη ο χρήστης με βάση το external_id ή το email
        const users = await conn.query("SELECT * FROM users WHERE external_id = ? OR email = ?", [external_id, email]);
        
        let user;

        if (users.length === 0) {
            // Ο χρήστης μπαίνει πρώτη φορά με Google -> Κάνουμε εγγραφή.
            // Επειδή η βάση μπορεί να απαιτεί password (χωρίς default value), βάζουμε ένα dummy password.
            const dummyPassword = "OAUTH_USER_NO_PASSWORD";
            const result = await conn.query(
                "INSERT INTO users (name, email, external_id, password) VALUES (?, ?, ?, ?)", 
                [name, email, external_id, dummyPassword]
            );
            user = { user_id: Number(result.insertId), name, email };
        } else {
            // Ο χρήστης υπάρχει ήδη
            user = users[0];
            
            // Αν είχε παλιό λογαριασμό μόνο με email, τον κάνουμε update για να συνδεθεί το Google
            if (!user.external_id) {
                await conn.query("UPDATE users SET external_id = ? WHERE user_id = ?", [external_id, user.user_id]);
            }
        }

        // Φτιάχνουμε τα δικά μας JWT (Οπότε η εφαρμογή συνεχίζει να δουλεύει κανονικά!)
        const token = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ 
            message: "Επιτυχής OIDC σύνδεση!", 
            user_id: user.user_id, 
            name: user.name, 
            token, 
            refreshToken 
        });

    } catch (err) { 
        console.error("Auth External Error:", err);
        res.status(500).json({ error: 'Σφάλμα εξωτερικής σύνδεσης' }); 
    } finally { 
        if (conn) conn.release(); 
    }
};