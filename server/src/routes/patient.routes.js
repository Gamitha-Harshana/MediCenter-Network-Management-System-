const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/patient.controller');

router.use(authenticate, authorize('Patient'));

router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.get('/centers/search', ctrl.searchCenters);
router.get('/centers/:centerId/doctors', ctrl.getCenterDoctors);
router.get('/centers/queue-info', ctrl.getQueueInfo);
router.post('/appointments', ctrl.bookAppointment);
router.get('/appointments', ctrl.getAppointments);
router.put('/appointments/:id/cancel', ctrl.cancelAppointment);
router.get('/health-record', ctrl.getHealthRecord);
router.put('/health-record', ctrl.updateHealthRecord);
router.post('/deletion-requests', ctrl.requestDeletion);
router.get('/history', ctrl.getVisitHistory);

module.exports = router;
