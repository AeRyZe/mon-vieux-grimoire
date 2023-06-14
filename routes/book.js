const bookCtrl = require('../controllers/book');

const auth = require('../middlewares/auth');
const multer = require('../middlewares/multer-config');

const express = require('express');
const router = express.Router();

router.get('/', bookCtrl.getAllBooks);
router.get('/bestrating', bookCtrl.getBestRating);
router.get('/:id', bookCtrl.getOneBook);
router.post('/', auth, multer, bookCtrl.createBook);
router.put('/:id', auth, multer, bookCtrl.modifyBook);
router.delete('/:id', auth, bookCtrl.deleteBook);
router.post('/:id/rating', auth, bookCtrl.addNewRating);

module.exports = router;