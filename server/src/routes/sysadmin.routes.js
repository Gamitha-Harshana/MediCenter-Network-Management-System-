const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/sysadmin.controller');

router.use(authenticate, authorize('SysAdmin'));

router.get('/dashboard', ctrl.getDashboardStats);
router.get('/centers/pending', ctrl.getPendingCenters);
router.get('/centers', ctrl.getAllCenters);
router.put('/centers/:id/approve', ctrl.approveCenter);
router.put('/centers/:id/reject', ctrl.rejectCenter);
router.put('/centers/:id/deactivate', ctrl.deactivateCenter);
router.put('/centers/:id', ctrl.updateCenter);
router.get('/doctors/pending', ctrl.getPendingDoctors);
router.put('/doctors/:id/approve', ctrl.approveDoctor);
router.put('/doctors/:id/reject', ctrl.rejectDoctor);

module.exports = router;
