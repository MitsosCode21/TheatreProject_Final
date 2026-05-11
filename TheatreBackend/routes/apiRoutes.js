const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Δημόσια endpoints (Δεν χρειάζονται σύνδεση)
router.get('/shows', apiController.getShows);
router.get('/theatres', apiController.getTheatres);
router.get('/showtimes/:show_id', apiController.getShowtimes);
router.get('/seats/:showtimeId', apiController.getSeats);

// Προστατευμένα endpoints (Χρειάζονται JWT)
router.post('/reservations', authenticateToken, apiController.createReservation);
router.put('/reservations/:id/:userId', authenticateToken, apiController.updateReservation);
router.get('/user/reservations/:user_id', authenticateToken, apiController.getUserReservations);
router.delete('/reservations/:id/:userId', authenticateToken, apiController.deleteReservation);
router.put('/user/change-password/:userId', authenticateToken, apiController.changePassword);
router.get('/user/profile/:userId', authenticateToken, apiController.getUserProfile);
// ΝΕΟ: Ενημέρωση προφίλ χρήστη
router.put('/user/profile/:userId', authenticateToken, apiController.updateProfile);

module.exports = router;