'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis =  require('redis');
var Search = require('redis-search');

//var client = redis.createClient();
var redis_server = require("../route");
var env = require("../config/constant");
var http = require('request');


var productid,ProductDetails;
var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api / redisSearch / testRedisSearch.js');
});

// var search = Search.createSearch('test');
var search = Search.createSearch({
            service : "productSearch",   // The name of your service. used for namespacing. Default 'search'.
            key : "nameSearch",       // The name of this search. used for namespacing. So that you may have several searches in the same db. Default 'ngram'.
            n : 2,            // The size of n-gram. Note that this method cannot match the word which length shorter then this size. Default '3'.
            cahce_time : 60,   // The second of cache retention. Default '60'.
            client : client // The redis client instance. Set if you want customize redis connect. Default connect to local.
        });

var strs = [];
strs.push({"id": 1, "name": 'Corduroy: smoke grey'});
strs.push({"id": 2, "name": 'Poplin: White'});
strs.push({"id": 3, "name": "Poplin: turqoise blue"});
strs.push({"id": 4, "name": "Twill: sky blue, black shepherd's check"});
strs.push({"id": 5, "name": "Oxford: aqua green"});
strs.push({"id": 6, "name": 'Poplin: pink, white double pinstripes'});

strs.forEach(function(str, i){ search.index(str, i); });

search
    .type('and')
    .query('smoke grey', function(err, ids) {
        if (err){
          console.log("error: ",err);
        } else{
          console.log(ids);
          //process.exit();
        }

    });
