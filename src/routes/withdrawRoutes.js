// src/routes/withdrawRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/withdrawController');

// Criar saque
router.post('/', ctrl.create);

// Listar saques
router.get('/', ctrl.list);

// Aprovar saque (admin)
router.put('/:id/approve', ctrl.approve);

module.exports = router;
