'use strict';
var express = require('express');
var controller = require('./productDescription.controller');
var router = express.Router();

router.get('/:id', controller.productDescInRedisById);
router.get('/', controller.productDescInRedisByIds);




module.exports = router;
