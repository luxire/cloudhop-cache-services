'use strict';
var express = require('express');
var controller = require('./productsSearchController');
var router = express.Router();

router.get('/:id', controller.productInRedisById);
router.get('/', controller.productInRedisByIds);




module.exports = router;
