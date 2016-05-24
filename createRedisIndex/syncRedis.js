'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis =  require('redis');
//var client = redis.createClient();
var redis_server = require("../route");
var env = require("../config/constant");
var http = require('request');


var productid,ProductDetails;
var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api / storeProducts / syncredis.js');
})


var id = 2008;
var createIndexByid = function(id){
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var filterAttributes = ["product_color", "transparency", "pattern", "product_weave_type"];
  var permalink, productType, productVariant;

  console.log("calling functionality create index by product id: "+id);
  // http.get(env.spree.host+env.spree.products+'/'+id+'?token='+token, function(err, response, body){
  //   if(err){
  //     console.log("error in getting all the products...");
  //   }
  //   if(response){
  //     var obj = JSON.parse(body);
  //     console.log("product id: ",obj.id);
  //
  //   }
  // });
  client.get("products:"+id, function(err,reply){
    if(err){
      console.log("error in redis when fetching products from redis..");
    }else{
      var obj = JSON.parse(reply);
      console.log("product id: ",obj.id);
      permalink = obj.taxons[0].permalink.split("/");
      productType = permalink[0];
      productVariant = permalink[1];
      for(var key in obj.luxire_product){
        for(var i =0; i<filterAttributes.length; i++){
          if(key == filterAttributes[i]){
            console.log("matching key is: ",key);
            var keyVal = obj.luxire_product[key].split(",");
            console.log("matching value length: ",keyVal.length);
            if(keyVal.length == 0){
                console.log("single value: ",keyVal);
            }else{
              for(var j=0; j<keyVal.length; j++){
                console.log("multipal value: ",keyVal[j]);
              }
            }
          }
        }
      }
    }
  });
}

//createIndexByid(id);
