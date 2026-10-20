const express = require('express');
const router = express.Router();
const { listUsers, createTeacher } = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('admin'), listUsers);
router.post('/teacher', authenticate, requireRole('admin'), createTeacher);

module.exports = router;
