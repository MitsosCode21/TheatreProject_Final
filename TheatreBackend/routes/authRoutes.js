const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);

// Το endpoint για το OIDC/PKCE Auth0 Login
router.post('/auth/external', authController.externalLogin); 

module.exports = router;