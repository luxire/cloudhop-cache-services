'use strict';
var express = require('express');
var controller = require('./filterByTaxon.controller');
var router = express.Router();

router.post('/filter', controller.filterByTaxon);



module.exports = router;
