'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis =  require('redis');
//var client = redis.createClient();
var redis_server = require("../../route");

var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api / weaveType / weaveType.controller.js');
})

exports.index = function(req, res){

    console.log("calling weave type index functionality...");
      console.log("request params :",req.query);
      var demoWeave = req.query.weave.toLowerCase();
      client.hvals("productsWeaveTypeIndex:"+demoWeave, function(err, result){
        if(err){
          console.log("getting error creating products weave type  index: ",err);
        }
        if(result){
          console.log("product ids for weave type : "+demoWeave+"  are as follows\n");
          var productsArr = [];
          console.log('result length', result.length);
          var i = 0;
          var getValue = function (){
            if(i<result.length){
              client.get("products:"+result[i], function(error, reply){
                if(error){
                  console.log("getting error when retrieving the product by get products by id: ",err);
                }
                else{
                  i++;
                  productsArr.push(JSON.parse(reply));
                  getValue();
                }
              })
            }
            else{
              res.json({"weave": productsArr });
            }
          };
          getValue();
        }

      });
}
