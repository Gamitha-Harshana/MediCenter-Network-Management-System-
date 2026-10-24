const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/doctor.controller');

router.use(authenticate, authorize('Doctor'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/queue', ctrl.getQueue);
router.post('/scan-qr', ctrl.scanQR);
router.get('/inventory', ctrl.getDrugInventory);
router.get('/patients/:patientId/history', ctrl.getPatientHistory);
router.get('/patients/:patientId/cross-center-history', ctrl.getCrossCenterHistory);
router.post('/consultation', ctrl.saveConsultation);
router.get('/schedules', ctrl.getMySchedules);

module.exports = router;
