const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/login/admin', ctrl.loginAdmin);
router.post('/login/doctor', ctrl.loginDoctor);
router.post('/login/patient', ctrl.loginPatient);
router.post('/register/patient', ctrl.registerPatient);
router.post('/register/medicenter', ctrl.registerMediCenter);
router.get('/me', authenticate, ctrl.getMe);

module.exports = router;
