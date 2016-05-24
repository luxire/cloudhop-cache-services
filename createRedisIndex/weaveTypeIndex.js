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



var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api / createRedisIndex / materialIndex.js');
})
 var productsArr = [];
 var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
 //console.log("url : ",env.spree.host+env.spree.products+'?token='+token);
 console.log("calling all the products for creating the material index...");
 client.keys("productsWeaveTypeIndex:\*", function(err, reply){
   if(reply){
     console.log("products weave type index exists...");
   }else{
     http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
       if(err){
         console.log("error in getting all the products: ");
       }
       if(response){
         console.log("getting all the products sucessfull...");
         productsArr = JSON.parse(body);
         //console.log("products arr: ",productsArr);
          //*** creating the product color index  ***
          for(var i=0; i<productsArr.length; i++){
              var weaveType = productsArr[i].luxire_product.product_weave_type;
              weaveType = weaveType.replace(/\s+/g, "").toLowerCase();
              // creating hash for weave type
              client.hmset("productsWeaveTypeIndex:"+weaveType,"product:"+productsArr[i].id,productsArr[i].id, function(err, res){
                if(err){
                  console.log("in creating products weave type  index err: ",err);
                }
                if(res){
                  console.log("products weave type index created sucessfully...");
                }
              });
          }
       }
     });

   }
 });


 // http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
 //   if(err){
 //     console.log("error in getting all the products: ");
 //   }
 //   if(response){
 //     console.log("getting all the products sucessfull...");
 //     productsArr = JSON.parse(body);
 //     //console.log("products arr: ",productsArr);
 //      //*** creating the product color index  ***
 //      for(var i=0; i<productsArr.length; i++){
 //          var weaveType = productsArr[i].luxire_product.product_weave_type;
 //          weaveType = weaveType.replace(/\s+/g, "").toLowerCase();
 //          // creating hash for weave type
 //          client.hmset("productsWeaveTypeIndex:"+weaveType,"product:"+productsArr[i].id,productsArr[i].id, function(err, res){
 //            if(err){
 //              console.log("in creating products weave type  index err: ",err);
 //            }
 //            if(res){
 //              console.log("products weave type index created sucessfully...");
 //            }
 //          });
 //      }
 //   }
 // });
