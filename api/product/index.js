'use strict';
var express = require('express');
var controller = require('./product.controller');
var router = express.Router();

router.get('/:id', controller.show);//fetch search results
// router.delete('/:id', controller.delete);

// router.put('/:id', controller.update);
// router.post('/', controller.products);



module.exports = router;