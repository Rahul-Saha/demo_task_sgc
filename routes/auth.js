
const router = require('express').Router();
const authController = require('../controllers/auth');

router.post('/register', [], (req, res) => {
	authController.register(req, res);
});

router.post('/login', [], (req, res) => {
	authController.login(req, res);
});

router.get('/profile', [], (req, res) => {
	authController.getUserProfile(req, res);
});

router.patch('/profile', [], (req, res) => {
	authController.updateUserProfile(req, res);
});

module.exports = router;