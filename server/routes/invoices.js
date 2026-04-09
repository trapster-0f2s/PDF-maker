const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/invoiceController');

router.get('/stats',    ctrl.getStats);
router.get('/',         ctrl.getAll);
router.get('/:id',      ctrl.getOne);
router.post('/',        ctrl.create);
router.put('/:id',      ctrl.update);
router.delete('/:id',   ctrl.remove);
router.get('/:id/pdf',  ctrl.generatePDF);

module.exports = router;