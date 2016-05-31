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
  console.log('Connected to redis server  in api / createDynamicIndexing / createCollection.js');
})


var deleteCollection = function(){
  console.log("caling the delete collection function...");
  client.keys("product:*:index", function(err, reply){
    if(err){
      console.log("error in redis deleting collection: ",err);
    }else{
          console.log("for product type dleted key length: ",reply.length);
        for(var i=0; i<reply.length; i++){
          console.log("key :"+reply[i]);
          client.del(reply[i], function(err, res){
            if(err){
              console.log("error in redis when deleting the keys for clooection..");
            }
            if(res){
              console.log("deleted sucessfully.. ");
              console.log("after delete key result: ",res);
            }
          })
        }
    }
  });


  client.keys("product:*:*:index", function(err, reply){
    if(err){
      console.log("error in redis deleting collection: ",err);
    }else{
          console.log(" for product variant dleted key length: ",reply.length);
        for(var i=0; i<reply.length; i++){
          console.log("key :"+reply[i]);
          client.del(reply[i], function(err, res){
            if(err){
              console.log("error in redis when deleting the keys for clooection..");
            }
            if(res){
              console.log("deleted sucessfully.. ");
              console.log("after delete key result: ",res);
            }
          })
        }
    }
  });

}
//deleteCollection();




var createCollection = function(){
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var productsArr = [];
  var promiseObj, tmpColor;
  var count = 0;
  var id, productTypeFlag = 0, productVariantFlag = 0, productType, productVariant;


  deleteCollection(); // first delete the collection from redis server

  client.keys("products:\*", function(err, reply){
    if(err){
      console.log("error in redis..");
    }
    if(reply){
      //console.log("reply:",reply);
      console.log("reply length: ",reply.length);
      var i=0;

      //-------------------------------------------------------------------------------
      var getValue = function (){
        if(i < reply.length ){
          var obj;
          var idArr = reply[i].split(":");
          console.log("id: ",idArr[1]);
          id = idArr[1];

          client.get("products:"+id, function(err, res){
            if(err){
              console.log("error in getting products from redis api...");
            }else{
            obj = JSON.parse(res);
            if(obj.taxons.length == 0 ){
              console.log("no permalink with the product: ",obj.id);
            }else{
              if(obj.taxons[0].permalink == "gift-cards"){
                  console.log("required no processing for gift card yet, hav to implement later");
                  productTypeFlag = 0;
                  productVariantFlag = 0;
              }else{
                console.log("sucess product id: "+obj.id);
                var permalink = obj.taxons[0].permalink.split("/");
                if(permalink.length == 1){
                    productTypeFlag = 1;
                    productVariantFlag = 0;
                    productType = permalink[0].toLowerCase();
                    console.log("collection key::  ","product:"+productType+":index");

                }else{
                    productVariantFlag = 1;
                    productTypeFlag = 0;
                    productType = permalink[0].toLowerCase();
                    productVariant = permalink[1].toLowerCase();
                    console.log("collection key::  ","product:"+productType+":"+productVariant+":index");

                }

              }

              // setting the product type indexing...
              if(productTypeFlag == 1 ){
                client.hmset("product:"+productType+":index", "product:"+obj.id, obj.id, function(err, res){
                  if(err){
                    console.log("error in creating collection index ");
                  }else{
                    count++;

                    console.log("collection is created sucessfully... and count: ",count);
                  }
                });
              }
              if(productVariantFlag == 1 ){
                client.hmset("product:"+productType+":index", "product:"+obj.id, obj.id, function(err, res){
                  if(err){
                    console.log("error in creating collection index ");
                  }else{
                    count++;

                    console.log("collection is created sucessfully... and count: ",count);
                  }
                });

                // creating the indexing collection wise...
                client.hmset("product:"+productType+":"+productVariant+":index", "product:"+obj.id, obj.id, function(err, res){
                  if(err){
                    console.log("error in creating collection index ");
                  }else{
                    count++;

                    console.log("collection is created sucessfully... and count: ",count);
                  }
                });
              }

            }

            i++;
            productType = 0;
            productVariant = 0;
            getValue();
            }
          });


        }
        else{

            console.log("sucessfully stored all product description...");

        }
      };
      getValue();

      //-------------------------------------------------------------------------------

      };


    });

}
//createCollection();
