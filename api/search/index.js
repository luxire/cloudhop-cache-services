'use strict';
var express = require('express');
var controller = require('./searchController');
var router = express.Router();

router.post('/products', controller.products);//fetch search results





module.exports = router;