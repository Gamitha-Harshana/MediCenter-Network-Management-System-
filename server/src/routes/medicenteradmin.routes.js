const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/medicenteradmin.controller');

router.use(authenticate, authorize('MediCenterAdmin'));

router.get('/dashboard', ctrl.getDashboard);

// Doctors
router.get('/doctors', ctrl.getDoctors);
router.post('/doctors', ctrl.requestDoctor);
router.put('/doctors/:id/deactivate', ctrl.deactivateDoctor);

// Schedules
router.get('/schedules', ctrl.getSchedules);
router.post('/schedules', ctrl.createSchedule);
router.put('/schedules/:id', ctrl.updateSchedule);
router.delete('/schedules/:id', ctrl.deleteSchedule);

// Patients
router.get('/patients', ctrl.getPatients);
router.get('/patients/registered', (req, res, next) => { req.query.type = 'Registered'; next(); }, ctrl.getPatients);
router.get('/patients/temporary', (req, res, next) => { req.query.type = 'Temporary'; next(); }, ctrl.getPatients);
router.post('/patients/temporary', ctrl.createTemporaryPatient);
router.post('/patients/temporary/:patientId/appointment', ctrl.bookAppointmentForTemp);
router.post('/patients/:patientId/appointment', ctrl.bookAppointmentForTemp);

// Drug Inventory
router.get('/inventory/log', ctrl.getInventoryLog);
router.get('/inventory', ctrl.getDrugInventory);
router.post('/inventory', ctrl.addDrug);
router.put('/inventory/:id', ctrl.updateDrug);
router.patch('/inventory/:id/quantity', ctrl.updateDrug);
router.delete('/inventory/:id', ctrl.removeDrug);

// Deletion Requests
router.get('/deletion-requests', ctrl.getDeletionRequests);
router.put('/deletion-requests/:id', ctrl.actionDeletionRequest);

// Notifications
router.get('/notifications', ctrl.getNotifications);
router.put('/notifications/:id/read', ctrl.markNotificationRead);
router.get('/notifications/:id/details', ctrl.getNotificationDetails);

module.exports = router;
