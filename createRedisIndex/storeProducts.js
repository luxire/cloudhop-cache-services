
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
var product_search = require("../search/products");
var Promise = require("es6-promise").Promise;

var productid,ProductDetails;
var client = redis_server.client;
var async = require("async");
client.on('connect', function(){
  console.log('Connected to redis server  in api / createRedisIndex / storeProducts.js');
});

var i = 0;

var storeProductDescription = function(id, slug){
  console.log('id', id, 'slug', slug);
  http.get({uri: env.spree.host+env.spree.products+"/"+id, timeout: 6000000, pool: {maxSockets: Infinity}}, function(err, response, body){
    if(err){
      console.log("error in getting products from rails api...", err);
    }else{
      console.log("count: ",i++, "id", id, body);
      client.set("productDescription:"+id, body,function(err, res){
        if(err){
          console.log("error in setting the product desc in redis...");
        }else{
          console.log("product desc created sucessfully...");
        }
      });
      client.set("productDescription:"+slug, body,function(err, res){
        if(err){
          console.log("error in setting the product desc in redis...");
        }else{
          console.log("product desc created sucessfully...");
        }
      });
      
    }
  });
};


 var storeAllProductsInRedis = function(){
   var pages;
   var flag = 0;
   var count = 0;
  //  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
   var p;
   var pageCount;
   p = new Promise(function(resolve, reject ){
     console.log("retreiving the no of pages...");
     http.get(env.spree.host+env.spree.products, function(err, response, body){
       if(err){
         console.log("error in getting all the products...", err);
       }
       if(response){
         //pages = JSON.parse(body).pages;
         //console.log("total pages: ",pages);
         resolve(JSON.parse(body).pages);
       }
     });
   });
   p.then(function(result){
     pages = result;
     console.log("after sucessfull response total page count: "+pages);
     var pageByPage, promiseCount=0, pid;
     for(var i=0; i<result; i++ ){
       pageCount = i+1;
       pageByPage = new Promise(function(resolve, reject ){
         console.log("url: "+env.spree.host+env.spree.products+'?page='+pageCount);
         http.get(env.spree.host+env.spree.products+'?page='+pageCount, function(err, response, body){
           if(err){
             console.log("error in getting products page by page...");
           }
           if(response){
             console.log("body: ",body);
             resolve(JSON.parse(body).products);
           }
         });
       });

       pageByPage.then(function(res){
         var pcount = promiseCount + 1;
         //console.log("res: ",res);
         console.log("----------------------------------------------------------------");
         console.log("product count for page no: "+pcount+"  is: ",res.length);
          //console.log("product count for page no: "+pageCount+"  is: ",res.length);
         for(var j=0; j<res.length; j++ ){
           //productId = res[j].id;
           //productDetails = res[j];
           //count++;
          //  console.log("product id: ",res[j].id);
           //console.log("count: "+count);
           //pid = res[j].id;
          // pdetails = res[j];
           product_search.createIndex(res[j]); // create index for search
          //  storeProductDescription(res[j].id, res[j].slug);
           flag = 0;
           client.set("products:"+res[j].id, JSON.stringify(res[j]), function(err, reply ){
             //console.log("within set function id :",pid);
              if(err){
                 console.log("error in storing products in redis..",err);
              }else{
                 count++;
                 console.log("product created sucessfully in redis ");
                 console.log("total count: ",count);
              }
          });



         }
         promiseCount++;
         console.log("----------------------------------------------------------------");
       }).catch(function(err){
         console.log("error in promises: ",err);
       });
     }
   });


 }



//--------------------------------------------------------------------------------------------------------------

var id = 1793;
var storeProductInRedisById = function ( id ){
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var p;
  p = new Promise(function(resolve, reject ){
    http.get(env.spree.host+env.spree.products+'/'+id+'?token='+token, function(err, response, body){
      if(err){
        console.log("error in getting products from rails server...");
      }
      if(response){
        resolve(JSON.parse(body));
      }
    });
  });

  p.then(function(result){
    client.set("products:"+id, JSON.stringify(result), function(err, res){
      if(err){
        console.log("error in storing products in redis server for id: ",id);
      }else{
        console.log("product stored sucessfully in redis server for id: ",id);
      }
    });
  }).catch(function(err){

  })
}

//storeProductInRedisById(id);

// ------------ FUNCTION TO CREATE HASH AND INDEX AND STORE IT INTO REDIS SERVER ------------
var id = 1914;
var setProductAndCreateIndexById = function ( id ){
  console.log("calling the set product and create index function...");
  var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type"];
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var p;
  p = new Promise(function(resolve, reject ){
    http.get(env.spree.host+env.spree.products+'/'+id, function(err, response, body){
      if(err){
        console.log("error in getting products from rails server...");
      }
      if(response){
        resolve(JSON.parse(body));
      }
    });
  });

  p.then(function(result){

    // --------------------- create hash and index of this product into the redis server ---------------
    console.log("product id is: ",result.id);
    for(var key in result.luxire_product){
      //console.log("key: ",key);
      for(var j=0; j<filterAttributes.length; j++){
        var akey = key;
        if(filterAttributes[j] == 'display_price'){
           var price = parseFloat(result.display_price.substr(1,result.display_price.length));
           client.zadd("product:Display_price:Index",0, price+":"+result.id, function(err, res){
                if(err){
                    console.log("error in creating product price index: ",err);
                }
                if(res){
                    console.log("products price index created sucessfully...");
                }
          });

        }else if(filterAttributes[j] == key ){
          var bkey = akey;
          console.log("***** filterd attribute:  ",filterAttributes[j]+"  matched with key : "+key+"   ******");
          //console.log("key : ",key);
          var keyValue = result.luxire_product[key].split(",");
          //console.log("key value: ",keyValue);
          for(var k=0;k<keyValue.length; k++){
            var ckey = bkey;
            //   var color = colors[j].replace(/\s+/g, "").toLowerCase();
            var indexValue = keyValue[k].trim().replace(/\s+/g, "").toLowerCase();
            key = key.charAt(0).toUpperCase()+key.substr(1).toLowerCase();
            var indexName = "product:"+key+":Index:"+indexValue;
            var id = result.id;

            client.hmset("product:"+key+":Index:"+indexValue, "product:"+id, id, function(err, res){
              if(err){
                console.log("error in creating products :\""+key+"\" index ");
              }else{
                console.log("index is created sucessfully...");
              }
            });
          }
        }
      }
      // console.log("---------------------------------------------------------------------------------");
    }

    // ---------------------------------------------- end ----------------------------------------------

    // -------------store the product into the redis server----------------
    client.set("products:"+id, JSON.stringify(result), function(err, res){
      if(err){
        console.log("error in storing products in redis server for id: ",id);
      }else{
        console.log("product stored sucessfully in redis server for id: ",id);
      }
    });
    // -------------------------------end-----------------------------------
    console.log("---------------------------------------------------------------------------------");

  }).catch(function(err){

  })
}

//setProductAndCreateIndexById(id);




var createProductDescInredis = function(){
  var productsArr = [];
  var promiseObj, tmpColor;
  var count = 0;
  var id;

  client.scan("0", "count", "100000", "match", "products:*", function(err, reply){
    if(err){
      console.log("error in redis..");
    }
    if(reply){
      //console.log("reply:",reply);
      console.log("reply length: ",reply[1]);
      var i=0;
      var index = 0;
      //-------------------------------------------------------------------------------
      var getValue = function (index, reply){
        console.log('index', index);
          var idArr = reply[index].split(":");
          id = idArr[1];
                    console.log("id: ",id);
          http.get(env.spree.host+env.spree.products+"/"+id, function(err, response, body){
            if(err){
              console.log("error in getting products from rails api...", err);
            }else{
            console.log("count: ",i++, "id", body);
            client.set("productDescription:"+JSON.parse(body).id+":"+JSON.parse(body).slug, body,function(err, res){
              if(err){
                console.log("error in setting the product desc in redis...");
              }else{
                console.log("product desc created sucessfully...");
              }
            });
            }
          });
       
      };
      getValue(0, reply[1]);
      var interval = setInterval(function(){
        if(index<= reply[1].length-1){
                  getValue(index++, reply[1]);
        }
        else{
          console.log('product load complete');
          clearInterval(interval);
        }
      }, 750);
      
      };


    });
}

// createProductDescInredis();
  // storeAllProductsInRedis();
