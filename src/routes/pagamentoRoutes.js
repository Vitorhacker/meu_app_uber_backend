const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { checkAuth, checkRole } = require('../middlewares/authMiddleware');

router.post('/checkout', checkAuth, checkRole('passageiro'), paymentController.checkout);
router.get('/:id', checkAuth, paymentController.getStatus);

module.exports = router;
