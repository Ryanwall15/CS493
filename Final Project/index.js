const router = module.exports = require('express').Router();

router.use('/boats', require('./boats'));
router.use('/cargo', require('./cargo'));