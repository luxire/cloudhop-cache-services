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
var deleteFilterAttributesIndexing = function(){
  console.log("calling the delete filter attributes indexing...");
  // ---------  deleting the indexing for price index ------
  client.keys("product:*:*:*:index",function(err, result){
    if(err){
      console.log("error in redis: ",err);
    }
    if(result){
      //console.log("result for price index keys: ", result);
      for(var i=0; i<result.length; i++){
        console.log("key: ",result[i]);
        client.del(result[i], function(err, reply){
          if(err){
            console.log("error in deleting keys: ",err);
          }
          if(reply){
            console.log(" key deleted sucessfully...");
          }else{
            console.log("key can not be deleted...");
          }
        })
      }
    }
  });
  // ---------  deleting the indexing other than price index ------
  client.keys("product:*:*:*:index:*",function(err, res){
    if(err){
      console.log("error in redis: ",err);
    }
    if(res){
      // console.log("result for another index keys: ", res);

      for(var j=0; j<res.length; j++){
        console.log("key: ",res[j]);
        client.del(res[j], function(err, reply){
          if(err){
            console.log("error in deleting keys: ",err);
          }
          if(res){
            console.log(" key deleted sucessfully...");
          }else{
            console.log("key can not be deleted...");
          }
        })
      }
    }
  });


}

var createIndexByFilterAttributes = function(){

  console.log("***   create index by filtered attributes is calling  ***");
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type", "suitable_climates", "wrinkle_resistance"];
  var mainColor = ["red", "green", "grey", "yellow", "blue", "olive", "orange", "white", "violet", "mauve", "pink", "purple", "lavender", "peach", "black", 'brown'];
  var productsArr = [];
  var promiseObj, tmpColor, count=0, productId;
  var totalPage;
  var sucessfullCount = 0;

  deleteFilterAttributesIndexing(); // calling the functionality to delete all the filtered attributes from redis
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
            productId = result[i].id;
            console.log("product id: ",result[i].id);
            if(result[i].taxons.length == 0){
                console.log("index can not be created...");
                console.log("undefined taxons of product id: ",result[i].id);
            }else{
              console.log("permalink: ",result[i].taxons[0].permalink);
              var permalink = result[i].taxons[0].permalink.split("/");
              console.log("product type: ",permalink[0]);
              console.log("variants type: ",permalink[1]);
              var productType = permalink[0].toLowerCase();
              var productVariant = permalink[1].trim().replace(/\s+/g, "");


              var price = parseFloat(result[i].display_price.substr(1,result[i].display_price.length));
              console.log("keys::    product:"+productType+":"+productVariant+":display_price:index");

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
                  if(filterAttributes[j] == key && filterAttributes[j] != 'display_price' && filterAttributes[j] != 'wrinkle_resistance' && filterAttributes[j] != 'product_color' ){

                    var keyValue = result[i].luxire_product[key].split(",");
                    for(var k=0;k<keyValue.length; k++){

                      var indexValue = keyValue[k].trim().replace(/\s+/g, "").toLowerCase();

                      //var indexName = "product:"+key+":Index:"+indexValue;
                      var id = result[i].id;
                      console.log("permalink: ",permalink);
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
                  //------------------- start create indexing for nested product color -----------------

                  if(filterAttributes[j] == "product_color" && filterAttributes[j] == key){
                    console.log("create indexing functionality for product color... ");
                    if(result[i].luxire_product["product_color"] == null){
                        console.log("key occoured null value...");
                    }else{
                      var tmpColorArr = result[i].luxire_product["product_color"].split(",");
                      console.log("tmpColorArr: ",tmpColorArr);
                      for(var k=0; k<tmpColorArr.length; k++){
                        tmpColor = tmpColorArr[k].toLowerCase().trim().replace(/\s+/g, "");
                        for(var l=0; l<mainColor.length; l++ ){
                          if(tmpColor.indexOf(mainColor[l]) != -1){
                             console.log("color: "+tmpColor+"  matched with maincolor: ",mainColor[l]);
                             console.log("url: ","product:"+productType+":"+productVariant+":product_color:index:"+mainColor[l]);
                            //  id = result[i].id;
                             console.log("product id : ",productId );
                             count++;

                            client.hmset("product:"+productType+":"+productVariant+":product_color:index:"+mainColor[l], "product:"+productId, productId, function(err, res){
                              if(err){
                                console.log("error in creating color index ");
                              }else{
                                console.log("color index is created sucessfully... and count: ",count);
                              }
                            });

                          }
                        }
                      }
                  }// end of else which checking for null value validation


                  }


                  //------------------- end create indexing for nested product color  -----------------



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
createIndexByFilterAttributes();

var createIndexByNestedColor = function(){
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var productsArr = [];
  var mainColor = ["red", "green", "grey", "yellow", "blue", "olive", "orange", "white", "violet", "mauve", "pink", "purple", "lavender", "peach", "black", 'brown'];
  var promiseObj, tmpColor;
  var id, count = 0;

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
          productId = result[i].id;
          console.log("\n-------------------------------------------------------------------\n");
          console.log("products length: ",result.length);
          for(var i=0; i<result.length; i++ ){
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
              // ----------------------logic of creating the index based on taxons--------------------------

                if(result[i].luxire_product["product_color"] == null){
                    console.log("key occoured null value...");
                }else{
                  var tmpColorArr = result[i].luxire_product["product_color"].split(",");
                  console.log("tmpColorArr: ",tmpColorArr);
                  for(var k=0; k<tmpColorArr.length; k++){
                    tmpColor = tmpColorArr[k].toLowerCase().trim().replace(/\s+/g, "");
                    for(var l=0; l<mainColor.length; l++ ){
                      if(tmpColor.indexOf(mainColor[l]) != -1){
                         console.log("color: "+tmpColor+"  matched with maincolor: ",mainColor[l]);
                         console.log("url: ","product:"+productType+":"+productVariant+":product_color:index:"+mainColor[l]);
                        //  id = result[i].id;
                         console.log("id : ",id );
                         console.log("");
                         count++;
                        client.hmset("product:"+productType+":"+productVariant+":product_color:index:"+mainColor[l], "product:"+id, id, function(err, res){
                          if(err){
                            console.log("error in creating color index ");
                          }else{
                            console.log("color index is created sucessfully... and count: ",count);
                          }
                        });

                      }
                    }
                  }
              }// end of else which checking for null value validation

            }

            //-------------------------------*****************--------------------------------------------

          }
          console.log("\n-------------------------------------------------------------------\n");
        }).catch(function(error){
          console.log("error in promise: ",error);
        });
    }
  });
}

//createIndexByNestedColor();

// --------------------- create and delete collection indexing


// -----------------------------  delete collection functionality ----------------------------

var deleteCollection = function(){
  console.log("caling the delete collection function...");
  client.keys("product:*:*:index", function(err, reply){
    if(err){
      console.log("error in redis deleting collection: ",err);
    }else{
        for(var i=0; i<reply.length; i++){
          client.del(reply[i], function(err, res){
            console.log("key :",reply[i]);
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
  var id;


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
              var permalink = obj.taxons[0].permalink.split("/");
              var productType = permalink[0].toLowerCase();
              var productVariant = permalink[1].toLowerCase();
              console.log("sucess product id: "+obj.id);
              console.log("collection key::  ","product:"+productType+":"+productVariant);

              // setting the product type indexing...
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
//createCollection();

// -------------------------- end of create collection indexing functionality -------------------



//deleteFilterAttributesIndexing();
