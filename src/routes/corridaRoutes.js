const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/corridaController');

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.put('/:id/assign', ctrl.assignDriver);
router.put('/:id/finish', ctrl.finish);

module.exports = router;
