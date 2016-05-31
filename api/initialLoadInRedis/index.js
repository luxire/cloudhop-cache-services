'use strict';
var express = require('express');
var controller = require('./initialLoadInRedisController');
var router = express.Router();

router.get('/all', controller.initialLoad);
router.get('/loadDesc', controller.initialLoadProductDesc);
router.get('/createIndex', controller.createIndexByFilterAttributes);






module.exports = router;
