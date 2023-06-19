const userCtrl = require('../controllers/user');

const express = require('express');
const router = express.Router();

router.post('/signup', userCtrl.signup);
router.post('/login', userCtrl.login); // on utilise POST pour le body

module.exports = router;