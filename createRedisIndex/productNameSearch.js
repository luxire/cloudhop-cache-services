'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis =  require('redis');
var Search = require('reds');

//var client = redis.createClient();
var redis_server = require("../route");
var env = require("../config/constant");
var http = require('request');



var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api / createRedisIndex / productNameSearch.js');
})



var nameSearch = function(){
  var count = 0;
  var search = Search.createSearch({
             service : "Search",
             key : "searchName",
             n : 2,
             cahce_time : 60,
             client : client
         });

  client.keys("products:\*", function(err, result){
    if(err){
      console.log("error in redis: ",err);
    }
    if(result){
      for(var i=0; i<result.length; i++){
        var productKey = result[i];
        count++;
        client.get(productKey, function(err, reply){
          if(err){
            console.log("error in redis: ",err);
          }
          else{
            //console.log("product name: ", JSON.parse(reply).name);
            search.index(JSON.parse(reply).name, JSON.parse(reply).id);
            //console.log("count: ",count);
          }
        });
      }
    }
  });

  console.log("admin side products name search index created sucessfully...");



}

//nameSearch();
