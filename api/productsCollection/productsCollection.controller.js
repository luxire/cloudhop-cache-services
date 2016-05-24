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
  console.log('Connected to redis server  in api/productsCollection /productsCollection.js');
})


exports.getCollection = function(req, response){
  var page = 1;
  var permalink, productType,productVariant;
  var finalProductsArr = [];
  var maxValuePerPage = 15;
  var total_count,tmpPages,pages,indexStart,indexEnd,current_page_count=0;
  var collectionFlag =0, collectionVariantFlag=0;

  console.log("calling the products collection from redis..");
  console.log("query: ",req.query);
  for(var key in req.query ){
    if(key == "permalink"){
      permalink = req.query[key].split("/");
      console.log("permalink: ",req.query[key]);
      if(permalink.length == 1){
        console.log("permalink : ",permalink);
        productType = permalink[0].toLowerCase();
        collectionFlag = 1;
      }else{
        productType = permalink[0].toLowerCase();
        productVariant = permalink[1].toLowerCase();
        console.log("prod type:",permalink[0]);
        console.log("prod variant: ",permalink[1]);
        collectionVariantFlag = 1;
      }

    }else if(key == "page"){
      page = parseInt(req.query[key]);
    }
  }
    if(collectionFlag){
      client.hvals("product:"+productType+":index", function(err, res){
        if(err){
          console.log("error in fetching collection from redis...");
        }
        if(res){
          if(res.length == 0){
              console.log("no products in this collection..");
              response.json({"msg": "NO PRODUCTS FOUND IN THIS COLLECTION."});

          }else{
            console.log("total count of collection: "+productType+"  is: "+res.length);
            indexStart = (page - 1 ) * maxValuePerPage;
            indexEnd = (page * maxValuePerPage);
            tmpPages = parseInt(res.length / maxValuePerPage);
            console.log("tmppages: ",tmpPages);
            total_count = res.length;
            console.log("collection length: ",total_count);

            if(total_count <= maxValuePerPage){
              pages = 1;
            }else{
              if((total_count % maxValuePerPage) == 0){
                pages = tmpPages;
              }else{
                pages = tmpPages + 1;
                //indexEnd = indexStart + (total_count % maxValuePerPage);
              }
            }

            var i = 0;
            var getValue = function (){
              if(indexStart <= indexEnd ){
                client.get("products:"+res[indexStart], function(error, reply){
                  if(error){
                    console.log("getting error when retrieving the product from redis: ",err);
                  }else{
                      indexStart++;
                      getValue();
                      if(reply != null ){
                        current_page_count++;
                        finalProductsArr.push(JSON.parse(reply));
                      }
                    //i++;

                  }
                })
              }
              else{
                  console.log("count: ",maxValuePerPage);
                  console.log("total count: ",total_count);
                  console.log("current page: ",page);
                  console.log("pages: ",pages);
                  console.log("carruent page count: ",current_page_count);
                  console.log("start: ",indexStart);
                  console.log("end: ",indexEnd);
                  //console.log("products: ", finalProductsArr);
                  response.json({"count": current_page_count,"per_page": maxValuePerPage,"total_count": total_count, "total_pages": pages,"current_page": page,"products": finalProductsArr});
              }
            };
            getValue();
          }
        }
      });

    }

    if(collectionVariantFlag){
      client.hvals("product:"+productType+":"+productVariant+":index", function(err, res){
        if(err){
          console.log("error in fetching collection from redis...");
        }
        if(res){
          if(res.length == 0){
              console.log("no products in this collection..");
              response.json({"msg": "NO PRODUCTS FOUND IN THIS COLLECTION."});

          }else{
            indexStart = (page - 1 ) * maxValuePerPage;
            indexEnd = (page * maxValuePerPage);
            tmpPages = parseInt(res.length / maxValuePerPage);
            console.log("tmppages: ",tmpPages);
            total_count = res.length;
            console.log("collection length: ",total_count);

            if(total_count <= maxValuePerPage){
              pages = 1;
            }else{
              if((total_count % maxValuePerPage) == 0){
                pages = tmpPages;
              }else{
                pages = tmpPages + 1;
                //indexEnd = indexStart + (total_count % maxValuePerPage);
              }
            }

            var i = 0;
            var getValue = function (){
              if(indexStart <= indexEnd ){
                client.get("products:"+res[indexStart], function(error, reply){
                  if(error){
                    console.log("getting error when retrieving the product from redis: ",err);
                  }else{
                      indexStart++;
                      getValue();
                      if(reply != null ){
                        current_page_count++;
                        finalProductsArr.push(JSON.parse(reply));
                      }
                    //i++;

                  }
                })
              }
              else{
                  console.log("count: ",maxValuePerPage);
                  console.log("total count: ",total_count);
                  console.log("current page: ",page);
                  console.log("pages: ",pages);
                  console.log("carruent page count: ",current_page_count);
                  console.log("start: ",indexStart);
                  console.log("end: ",indexEnd);
                  //console.log("products: ", finalProductsArr);
                  response.json({"count": current_page_count,"per_page": maxValuePerPage,"total_count": total_count, "total_pages": pages,"current_page": page,"products": finalProductsArr});
              }
            };
            getValue();
          }
        }
      });

    }



}
