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
  console.log('Connected to redis server  in api/search/searchController.js');
})


exports.productInRedisById = function(req, res){
  console.log("calling the products in redis by id ");
  console.log("id is: ",req.params.id);
  var id = parseInt(req.params.id);
  client.get("products:"+id, function(err, reply){
    if(err){
      console.log("product with id: "+req.params.id+" does not exists in redis server."+err);
    }
    if(reply == null){
      res.json({"data": "product does not exists."});
    }else{
      console.log("product id: "+req.params.id+" exists in redis server");
      var data = JSON.parse(reply);
      res.json({"data": data});

    }
  });
}
exports.productInRedisByIds = function(req, res){
  var finalProductsArr = [];
  console.log("calling the products in redis by ids ");
  console.log("ids array  is: ",req.query.ids);
  var tmpIdsStr = req.query.ids.substr(1,req.query.ids.length-2);
  var idsArr = tmpIdsStr.split(",");
  console.log("idsArr: ",idsArr);
  var i = 0;
  var getValue = function (){
    if(i <= idsArr.length){
      client.get("products:"+idsArr[i], function(error, reply){ // finalArr[indexStart]
        if(error){
          console.log("getting error when retrieving the product by get products by id: ",err);
        }else{
            i++;
            getValue();
            if(reply != null ){
              finalProductsArr.push(JSON.parse(reply));
            }
          //i++;

        }
      })
    }
    else{
      //console.log("finalproducts array: \n",finalProductsArr);
      res.json({"data": finalProductsArr});

    }
  }
  getValue();
}
