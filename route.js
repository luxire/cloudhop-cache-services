/**
 * Main application routes
 */

'use strict';

//var errors = require('./components/errors');
var path = require('path');
//var jwt = require('jsonwebtoken');//used to create/sign/verify token
//var constants = require('./config/constants');
//var redis_client = require('./config/colorMaster');
//var formidable = require('formidable');
var util = require('util');
var fs = require('fs');
var http = require('request');
var redis =  require('redis');
var querystring = require('querystring');


var client = redis.createClient();
console.log("I am in redis_server.js page ");

 client.on('connect', function(){
   console.log('Connected to redis in redis_server.js');
 })



//console.log('redis client', redis_client);
module.exports = function(app) {

    app.use('/api/redis/products', require('./api/productsSearch'));
    app.use('/api/redis/productDesc', require('./api/productDescription'));
    app.use('/api/redis/collection', require('./api/productsCollection'));
    app.use('/api/redis/initialLoad', require('./api/initialLoadInRedis'));


    //app.use('/api/redis/products', require('./api/filterProducts'));

    // customer side filteration
    // app.use('/api/redis/customer/products', require('./api/filterProducts/customer'));
    // app.use('/api/redis/admin/products', require('./api/filterProducts/admin'));
    // app.use('/api/redis/admin/products', require('./api/filterProducts/admin'));

    app.use('/api/redis/customer/search', require('./api/search'));




};
module.exports.client = client;
//exports = module.exports = client;
