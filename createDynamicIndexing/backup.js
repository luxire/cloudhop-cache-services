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
  console.log('Connected to redis server  in api / createDynamicIndexing / dynamicIndexing.js');
})



var createIndex = function(){
var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type"];
var productsArr = [];

console.log("calling products index api...");
console.log("url: ",env.spree.host+env.spree.products);
http.get(env.spree.host+env.spree.products+'?'+token, function(err, res, body ){
  if(res){
    console.log("products retrieved sucessfully...");
    productsArr = JSON.parse(body);
    for(var i=0; i<productsArr.length; i++){
      console.log("----------------------------------- id: ",productsArr[i].id+"--------------------");
      for(var key in productsArr[i].luxire_product){
        for(var j=0; j<filterAttributes.length; j++){
          var akey = key;
          if(filterAttributes[j] == 'display_price'){
             var price = parseFloat(productsArr[i].display_price.substr(1,productsArr[i].display_price.length));
             client.zadd("product:Display_price:Index",0, price+":"+productsArr[i].id, function(err, res){
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
            var keyValue = productsArr[i].luxire_product[key].split(",");
            //console.log("key value: ",keyValue);
            for(var k=0;k<keyValue.length; k++){
              var ckey = bkey;
              //   var color = colors[j].replace(/\s+/g, "").toLowerCase();
              var indexValue = keyValue[k].trim().replace(/\s+/g, "").toLowerCase();
              key = key.charAt(0).toUpperCase()+key.substr(1).toLowerCase();
              var indexName = "product:"+key+":Index:"+indexValue;
              var id = productsArr[i].id;
              //console.log("indexname: ",indexName);
              //console.log("indexvalue: ",id);
              //console.log("key : ",key);
              // console.log("index name: "+"product:"+key+":Index:"+indexValue);
              // client.hvals("product:"+key+":Index:"+indexValue, function(err, res){
              //   var dkey = ckey;
              //   var aindexValue = indexValue;
              //   console.log("key in hvals : ",dkey);
              //   var hash = "product:"+dkey+":Index:"+aindexValue;
              // //console.log("hash in hvals : ",hash);
              //   if(res.length == 0){
              //       console.log("hash :"+hash+" for id: "+id+"  is not exists");
              //   }else{
              //     console.log("hash :"+hash+" for id: "+id+"  is exists...");
              //   }
              //   //}
              // });
              client.hmset("product:"+key+":Index:"+indexValue, "product:"+id, id, function(err, res){
                if(err){
                  console.log("error in creating products :\""+key+"\" index ");
                }else{
                  console.log("index : "+key+" is created sucessfully...");
                }
              });
            }
          }
        }
      }
      console.log("-------------------------------------------------------");

    }
  }else{
    console.log("getting error in retreiving products index from rails api..");

  }
});

};

//createIndex();


var createIndexById = function(productIdsArr){
var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type"];
var productsArr = [];

console.log("calling products index api...");
//console.log("url: ",env.spree.host+env.spree.products);
var promiseObj;
for(var i=0; i<productIdsArr.length; i++ ){
  //var id = productIdsArr[i];
  promiseObj = new Promise(function(resolve, reject ){
    http.get(env.spree.host+env.spree.products+'/'+productIdsArr[i]+'&token='+token, function(err, response, body){
      if(err){
        console.log("error in getting products from rails api...");
      }
      if(response){
        resolve(JSON.parse(body));
      }
    });
  });
    promiseObj.then(function(result){
      console.log("------------------------------------------------------------");
      console.log("after sucessfull promise return result id:  ",result.id);
      console.log("in promise: filtered attributes is: ",filterAttributes[2]);
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
        console.log("---------------------------------------------------------------------------------");
      }
    }).catch(function(err){
        console.log("error in promise: ",err);
    });
  };

}

//}
var ids = [1983,1853,1936];
//createIndexById(ids);

//----------------------------------------------------------------------------------------------------------------------------

var createIndexByTaxons = function(){

  console.log("***   create index by taxons is calling  ***");
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type", "suitable_climates", "wrinkle_resistance"];
  var productsArr = [];
  var promiseObj;
  var totalPage;
  var sucessfullCount = 0;
  promiseObj = new Promise(function(resolve, reject ){
    console.log("fetching the no of pages...");
    http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
      if(err){
        console.log("error in getting products from rails api...");
      }
      if(response){
        //var parsedBody = JSON.parse(body).pages;
        resolve(JSON.parse(body).pages);
      }
    });
  });

  promiseObj.then(function(result){
    console.log("sucessfull promise result for page count is : ",result);
    var pageByPage;
    for(var i=0; i<result; i++){
        var pageNo = i+1;
        pageByPage = new Promise(function(resolve, reject ){
          console.log("page by page count: ",i+1);
          http.get(env.spree.host+env.spree.products+'?page='+pageNo+'&token='+token, function(err, response, body){
            if(err){
              console.log("error in getting products page by page...");
            }
            if(response){
              resolve(JSON.parse(body).products);
            }
          });
        });
        pageByPage.then(function(result){
          console.log("\n-------------------------------------------------------------------\n");
          console.log("products length: ",result.length);
          for(var i=0; i<result.length; i++ ){
            sucessfullCount++;
            console.log("product id: ",result[i].id);
            console.log("permalink: ",result[i].taxons[0].permalink);
            if(result[i].taxons.length == 0){
                console.log("index can not be created...");
                console.log("undefined taxons of product id: ",result[i].id);
            }else{
              var permalink = result[i].taxons[0].permalink.split("/");
              console.log("product type: ",permalink[0]);
              console.log("variants type: ",permalink[1]);
              var productType = permalink[0].toLowerCase();
              var productVariant = permalink[1].trim().replace(/\s+/g, "");


              var price = parseFloat(result[i].display_price.substr(1,result[i].display_price.length));
              console.log("price: ",price);
              console.log("product:"+productType+":"+productVariant+":display_price:index:");
               client.zadd("product:"+productType+":"+productVariant+":display_price:index",0, price+":"+result[i].id, function(err, res){
                      if(err){
                          console.log("error in creating product price index: ",err);
                      }else{
                          console.log("products price index created sucessfully...");
                      }
                });


              // ----------------------logic of creating the index based on taxons--------------------------
              for(var key in result[i].luxire_product){
                //console.log("key: ",key);
                if(result[i].luxire_product[key] == null){
                    console.log("key occoured null value...");
                }else{
                for(var j=0; j<filterAttributes.length; j++){


                  //------------------- start create indexing other than price and wrinkle resistance -----------------
                  if(filterAttributes[j] == key && filterAttributes[j] != 'display_price' && filterAttributes[j] != 'wrinkle_resistance' ){
                    //console.log("***** filterd attribute:  ",filterAttributes[j]+"  matched with key : "+key+"   ******");
                    //console.log("key : ",key);
                    //console.log("key name: \n"+key+"\ntypeof key: \n",typeof(key));
                    var keyValue = result[i].luxire_product[key].split(",");
                    //console.log("key value: ",keyValue);
                    for(var k=0;k<keyValue.length; k++){

                      var indexValue = keyValue[k].trim().replace(/\s+/g, "").toLowerCase();

                      //var indexName = "product:"+key+":Index:"+indexValue;
                      var id = result[i].id;
                      //console.log("permalink: ",permalink);
                      console.log("&&&&&& product:"+productType+":"+productVariant+":"+key+":index:"+indexValue);
                      client.hmset("product:"+productType+":"+productVariant+":"+key+":index:"+indexValue, "product:"+id, id, function(err, res){
                        if(err){
                          console.log("error in creating products :\""+key+"\" index ");
                        }else{
                          console.log("index is created sucessfully...");
                        }
                      });
                    }
                  }
                  //------------------- end create indexing other than price and wrinkle resistance -----------------
                  if(filterAttributes[j] == "wrinkle_resistance" && filterAttributes[j] == key){
                    console.log("create indexing functionality for wrinkle_resistance... ");
                    var indexValue = result[i].luxire_product[key];
                    console.log("index value: ",indexValue);
                    //var indexName = "product:"+key+":Index:"+indexValue;
                    console.log("&&&&&& product:"+productType+":"+productVariant+":"+key+":index:"+indexValue);
                    client.hmset("product:"+productType+":"+productVariant+":"+key+":index:"+indexValue, "product:"+id, id, function(err, res){
                      if(err){
                        console.log("error in creating products :\""+key+"\" index ");
                      }else{
                        console.log("index is created sucessfully...");
                      }
                    });

                  }
                  //------------------- start create indexing other than price and wrinkle resistance -----------------


                  //------------------- start create indexing other than price and wrinkle resistance -----------------

                }
              }// end of else which checking for null value validation
              }
            }

            //-------------------------------*****************--------------------------------------------

          }
          console.log("\n-------------------------------------------------------------------\n");
        }).catch(function(error){
          console.log("error in promise: ",error);
        });
    }
  }).catch(function(error){
    console.log("error in promise: ",error);
  });

}
//createIndexByTaxons();
