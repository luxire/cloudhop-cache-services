'use strict';
var express = require('express');
var controller = require('./filter.controller');
var router = express.Router();

//router.get('/color', controller.color_search);
//router.get('/price', controller.price_search);
router.post('/filter', controller.filter);



module.exports = router;
