'use strict';
var express = require('express');
var controller = require('./productsCollection.controller');
var router = express.Router();

router.get('/', controller.getCollection);




module.exports = router;
