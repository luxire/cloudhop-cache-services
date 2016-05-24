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
  console.log('Connected to redis server  in api / createRedisIndex / storeProducts.js');
})


 // var productsArr = [];
 // var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
 // //console.log("url : ",env.spree.host+env.spree.products+'?token='+token);
 // console.log("calling all the products for creating the material index...");
 // client.keys("products:\*", function(err, reply){
 //   if(reply.length != 0){
 //
 //     // deleting all the products store in redis
 //     //console.log("reply: ",reply);
 //     console.log("products description is exists...");
 //    //  http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
 //    //    if(err){
 //    //      console.log("error in getting all the products...");
 //    //    }
 //    //    if(response){
 //    //      productsArr = JSON.parse(body);
 //    //      for(var i=0; i<productsArr.length; i++){
 //    //        client.del("products:"+productsArr[i].id, function(err, res){
 //    //           if(err){
 //    //             console.log("error in deleting product... ");
 //    //           }
 //    //           if(res){
 //    //             console.log("sucessfully deletd product...");
 //    //           }
 //    //        });
 //    //      }
 //    //    }
 //    //  }); // end of deleting all the product in redis
 //   }else{
 //     console.log("does not exists products description...");
 //     console.log("creating the products index in redis...");
 //     http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
 //       if(err){
 //         console.log("error in getting all the products: ");
 //       }
 //       if(response){
 //         console.log("getting all the products sucessfull...");
 //         productsArr = JSON.parse(body);
 //          for(var i=0; i<productsArr.length; i++){
 //            var id = productsArr[i].id;
 //            client.set("products:"+id,JSON.stringify(productsArr[i]), function(err, res){
 //                if(err){
 //                  console.log("in setting products index err: ",err);
 //                }
 //                if(res){
 //                  console.log("setting products sucessfully...");
 //                }
 //              });
 //          }
 //       }
 //     });
 //
 //   }
 // });

 var storeAllProductsInRedis = function(){
   var pages;
   var flag = 0;
   var count = 0;
   var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
   var p;
   var pageCount;
   p = new Promise(function(resolve, reject ){
     console.log("retreiving the no of pages...");
     http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
       if(err){
         console.log("error in getting all the products...");
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
         http.get(env.spree.host+env.spree.products+'?page='+pageCount+'&token='+token, function(err, response, body){
           if(err){
             console.log("error in getting products page by page...");
           }
           if(response){
             //console.log("body: ",body);
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
           console.log("product id: ",res[j].id);
           //console.log("count: "+count);
           //pid = res[j].id;
          // pdetails = res[j];
           flag = 0;
           client.set("products:"+res[j].id, JSON.stringify(res[j]), function(err, reply ){
             //console.log("within set function id :",pid);
              if(err){
                 console.log("error in storing products in redis..",err);
              }else{
                 count++;
                 console.log("product created sucessfully in redis with id: ",pid);
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

//storeAllProductsInRedis();

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
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var productsArr = [];
  var promiseObj, tmpColor;
  var count = 0;
  var id;

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
          var idArr = reply[i].split(":");
          console.log("id: ",idArr[1]);
          id = idArr[1];

          http.get(env.spree.host+env.spree.products+"/"+id+'?token='+token, function(err, response, body){
            if(err){
              console.log("error in getting products from rails api...");
            }else{
            console.log("sucess product id: ",JSON.parse(body).id);
            console.log("count: ",i);
            client.set("productDescription:"+id, body,function(err, res){
              if(err){
                console.log("error in setting the product desc in redis...");
              }else{
                console.log("product desc created sucessfully...");
              }
            });
            i++;
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

 //createProductDescInredis();
