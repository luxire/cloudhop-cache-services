'use strict';
var express = require('express');
var controller = require('./productsSearchController');
var router = express.Router();

router.get('/:id', controller.productInRedisById);
router.get('/', controller.productInRedisByIds);
router.get('/delete/:id', controller.deleteProductInRedisById);
router.get('/create/:id', controller.createProductInRedisById);
router.get('/update/:id', controller.updateProductInRedisById);






module.exports = router;
