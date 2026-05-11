const pool = require('../config/db');
const bcrypt = require('bcryptjs'); // SOS: Απαραίτητο για την αλλαγή κωδικού!

exports.getShows = async (req, res) => {
    let conn;
    try {
        const { theatreId, title, date } = req.query;
        conn = await pool.getConnection();
        let sql = "SELECT s.*, t.name as theatre_name, t.location FROM shows s JOIN theatres t ON s.theatre_id = t.theatre_id WHERE 1=1";
        let params = [];
        if (theatreId) { sql += " AND s.theatre_id = ?"; params.push(theatreId); }
        if (title) { sql += " AND s.title LIKE ?"; params.push(`%${title}%`); }
        if (date) { sql += " AND s.show_id IN (SELECT show_id FROM showtimes WHERE show_date = ?)"; params.push(date); }
        const shows = await conn.query(sql, params);
        res.json(shows);
    } catch (err) { res.status(500).json({ error: 'Σφάλμα ανάκτησης παραστάσεων' }); } 
    finally { if (conn) conn.release(); }
};

exports.getTheatres = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        res.json(await conn.query("SELECT * FROM theatres"));
    } catch (err) { res.status(500).json({ error: 'Σφάλμα' }); } 
    finally { if (conn) conn.release(); }
};

exports.getShowtimes = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        res.json(await conn.query("SELECT * FROM showtimes WHERE show_id = ?", [req.params.show_id]));
    } catch (err) { res.status(500).json({ error: 'Σφάλμα' }); } 
    finally { if (conn) conn.release(); }
};

exports.getSeats = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const reservations = await conn.query("SELECT seat_numbers FROM reservations WHERE showtime_id = ?", [req.params.showtimeId]);
        let takenSeats = [];
        reservations.forEach(r => { if (r.seat_numbers) takenSeats = takenSeats.concat(r.seat_numbers.split(',')); });
        res.json(takenSeats); 
    } catch (err) { res.status(500).json({ error: 'Σφάλμα' }); } 
    finally { if (conn) conn.release(); }
};

// Δημιουργία Κράτησης: Χρήση Transactions για αποφυγή διπλοκρατήσεων
exports.createReservation = async (req, res) => {
    let conn;
    try {
        const { user_id, showtime_id, seats_booked, seat_numbers } = req.body;
        const requestedSeats = seat_numbers ? seat_numbers.split(',') : [];
        conn = await pool.getConnection();
        
        // Κλείδωμα εγγραφών (Transaction) για διασφάλιση συνέπειας δεδομένων
        await conn.beginTransaction();
        
        // Έλεγχος διαθεσιμότητας θέσεων με FOR UPDATE (κλείδωμα της γραμμής στη DB)
        const existingRes = await conn.query("SELECT seat_numbers FROM reservations WHERE showtime_id = ? FOR UPDATE", [showtime_id]);
        let takenSeats = [];
        existingRes.forEach(r => { if (r.seat_numbers) takenSeats = takenSeats.concat(r.seat_numbers.split(',')); });

        if (requestedSeats.some(seat => takenSeats.includes(seat))) {
            await conn.rollback();
            return res.status(409).json({ error: 'Κάποιες θέσεις κρατήθηκαν ήδη!' });
        }

        const st = await conn.query("SELECT price FROM showtimes WHERE showtime_id = ?", [showtime_id]);
        const price = st.length > 0 ? st[0].price : 15;
        
        // Οριστικοποίηση κράτησης
        await conn.query("INSERT INTO reservations (user_id, showtime_id, seats_booked, total_price, seat_numbers) VALUES (?, ?, ?, ?, ?)", [user_id, showtime_id, seats_booked, price * seats_booked, seat_numbers]);
        await conn.commit(); // Επιτυχής ολοκλήρωση
        res.json({ message: "Κράτηση επιτυχής!" });
    } catch (err) { if (conn) await conn.rollback(); res.status(500).json({ error: 'Σφάλμα κράτησης' }); } 
    finally { if (conn) conn.release(); }
};

exports.updateReservation = async (req, res) => {
    let conn;
    try {
        const { new_seats_booked, new_seat_numbers, showtime_id } = req.body;
        const requestedSeats = new_seat_numbers ? new_seat_numbers.split(',') : [];
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const existingRes = await conn.query("SELECT seat_numbers FROM reservations WHERE showtime_id = ? AND reservation_id != ? FOR UPDATE", [showtime_id, req.params.id]);
        let takenSeats = [];
        existingRes.forEach(r => { if (r.seat_numbers) takenSeats = takenSeats.concat(r.seat_numbers.split(',')); });

        if (requestedSeats.some(seat => takenSeats.includes(seat))) {
            await conn.rollback();
            return res.status(409).json({ error: 'Μη διαθέσιμες θέσεις.' });
        }

        const st = await conn.query("SELECT price FROM showtimes WHERE showtime_id = ?", [showtime_id]);
        const price = st.length > 0 ? st[0].price : 15;

        await conn.query("UPDATE reservations SET seats_booked = ?, seat_numbers = ?, total_price = ? WHERE reservation_id = ? AND user_id = ?", [new_seats_booked, new_seat_numbers, price * new_seats_booked, req.params.id, req.params.userId]);
        await conn.commit();
        res.json({ message: "Ενημέρωση επιτυχής!" });
    } catch (err) { if (conn) await conn.rollback(); res.status(500).json({ error: 'Σφάλμα' }); } 
    finally { if (conn) conn.release(); }
};

exports.getUserReservations = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const query = `
            SELECT 
                r.*, 
                st.show_date, 
                st.show_time, 
                st.room_name,
                sh.title, 
                sh.image_url,
                t.name AS theatre_name, 
                t.location AS theatre_location
            FROM reservations r
            JOIN showtimes st ON r.showtime_id = st.showtime_id
            JOIN shows sh ON st.show_id = sh.show_id
            JOIN theatres t ON sh.theatre_id = t.theatre_id
            WHERE r.user_id = ?
            ORDER BY r.reservation_id DESC
        `;
        const resv = await conn.query(query, [req.params.user_id]);
        res.json(resv);
    } catch (err) { 
        res.status(500).json({ error: 'Σφάλμα' }); 
    } 
    finally { 
        if (conn) conn.release(); 
    }
};

exports.deleteReservation = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("DELETE FROM reservations WHERE reservation_id = ? AND user_id = ?", [req.params.id, req.params.userId]);
        res.json({ message: "Ακύρωση επιτυχής!" });
    } catch (err) { res.status(500).json({ error: 'Σφάλμα' }); } 
    finally { if (conn) conn.release(); }
};

exports.updateProfile = async (req, res) => {
    let conn;
    try {
        const { userId } = req.params;
        const { name, phone, profile_picture } = req.body;
        
        console.log("Στοιχεία προς αποθήκευση:", { userId, name, phone, hasImage: !!profile_picture });

        conn = await pool.getConnection();
        
        const result = await conn.query(
            "UPDATE users SET name = ?, phone = ?, profile_picture = ? WHERE user_id = ?",
            [name, phone, profile_picture, userId]
        );
        
        console.log("Αποτέλεσμα MySQL:", result);
        res.json({ message: "Το προφίλ ενημερώθηκε επιτυχώς!" });
    } catch (err) {
        console.error("ΣΦΑΛΜΑ UPDATE:", err); 
        res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση του προφίλ' });
    } finally {
        if (conn) conn.release();
    }
};

// ΝΕΟ: Ανάκτηση Στοιχείων Προφίλ Χρήστη (Χρήσιμο για το Login/Ανανέωση σελίδας)
exports.getUserProfile = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const users = await conn.query(
            "SELECT name, phone, profile_picture FROM users WHERE user_id = ?", 
            [req.params.userId]
        );
        
        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(404).json({ error: 'Ο χρήστης δεν βρέθηκε' });
        }
    } catch (err) {
        console.error("Σφάλμα ανάκτησης προφίλ:", err);
        res.status(500).json({ error: 'Σφάλμα διακομιστή' });
    } finally {
        if (conn) conn.release();
    }
};

// Αλλαγή Κωδικού Πρόσβασης
exports.changePassword = async (req, res) => {
    let conn;
    try {
        const { userId } = req.params;
        const { oldPassword, newPassword } = req.body;

        conn = await pool.getConnection();

        const users = await conn.query("SELECT password FROM users WHERE user_id = ?", [userId]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Ο χρήστης δεν βρέθηκε.' });
        }

        const user = users[0];

        // Ελέγχουμε αν ο παλιός κωδικός είναι σωστός
        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Ο παλιός κωδικός δεν είναι σωστός.' });
        }

        // Κρυπτογραφούμε τον νέο κωδικό
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // Ενημερώνουμε τη βάση
        await conn.query("UPDATE users SET password = ? WHERE user_id = ?", [hashedNewPassword, userId]);

        res.json({ message: 'Ο κωδικός άλλαξε επιτυχώς!' });
    } catch (err) {
        console.error("Σφάλμα αλλαγής κωδικού:", err);
        res.status(500).json({ error: 'Σφάλμα κατά την αλλαγή κωδικού.' });
    } finally {
        if (conn) conn.release();
    }
};