'use strict';
var express = require('express');
var controller = require('./adminSearchController');
var router = express.Router();

router.get('/', controller.filterByName);



module.exports = router;
