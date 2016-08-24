'use strict';
var express = require('express');
var controller = require('./productsSearchController');
var router = express.Router();

router.get('/:id', controller.productInRedisById);
router.get('/', controller.productInRedisByIds);
router.delete('/:id', controller.deleteProductInRedisById);
router.post('/:id', controller.createProductInRedisById);
router.put('/:id', controller.updateProductInRedisById);






module.exports = router;
