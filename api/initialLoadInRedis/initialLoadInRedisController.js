'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis =  require('redis');
//var client = redis.createClient();
var redis_server = require("../../route");
var storeProducts = require("../../createRedisIndex/storeProducts");
var env = require("../../config/constant");

var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api/search/searchController.js');
})

exports.initialLoad = function(req, response){
  console.log("initial load function is calling...");
  var productKey;
  var pages;
  var flag = 0;
  var count = 0;
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var p;
  var pageCount, total_count, storedProductCount = 0;

  // ---------- delete all the products from redis server --------------
    client.keys("products:\*", function(err, result ){
      if(err){
        console.log("error in redis server: ",err);
      }
      if(result){
        for(var i=0; i<result.length; i++){
          productKey = result[i];
          client.del(productKey, function(err, reply ){
            if(err){
              console.log("error in redis server: ",err);
            }
            if(reply){
              console.log("product deleted sucessfully..");
              console.log("count: ",i);
              count = i;
            }

          });
        }
      }
    });

  //-----------------  end  --------------------------------------------
  p = new Promise(function(resolve, reject ){
    console.log("retreiving the no of pages...");
    http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
      if(err){
        console.log("error in getting all the products...");
      }
      if(response){
        //pages = JSON.parse(body).pages;
        //console.log("total pages: ",pages);
        total_count = JSON.parse(body).total_count;
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
                storedProductCount++;
                console.log("product created sucessfully in redis.");
                console.log("total count: ",storedProductCount);
             }
             if(total_count == storedProductCount ){
               console.log("send response...");
               response.json({"msg" : "ALL PRODUCT STORED IN REDIS SUCESSFULLY.", "total_count": storedProductCount });

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

exports.initialLoadProductDesc = function(req, response ){
  console.log("calling functionality productDescription initial load..");
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
            count = i;
            getValue();
            }
          });


        }
        else{

            //console.log("sucessfully stored all product description...");
            response.json({ "total_count" : count, "status" : "sucessfully stored all product description..." });

        }
      };
      getValue();

      //-------------------------------------------------------------------------------

      };


    });
}

exports.createIndexByFilterAttributes = function(request, response ){
  console.log("***   create index by filtered attributes is calling  ***");
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type", "suitable_climates", "wrinkle_resistance"];
  var mainColor = ["red", "green", "grey", "yellow", "blue", "olive", "orange", "white", "violet", "mauve", "pink", "purple", "lavender", "peach", "black", 'brown'];
  var productsArr = [];
  var promiseObj, tmpColor, count=0, productId;
  var totalPage, pageNo, total_page;
  var sucessfullCount =0, total_count= 0;

  //deleteFilterAttributesIndexing(); // calling the functionality to delete all the filtered attributes from redis
  promiseObj = new Promise(function(resolve, reject ){
    console.log("fetching the no of pages...");
    http.get(env.spree.host+env.spree.products+'?token='+token, function(err, response, body){
      if(err){
        console.log("error in getting products from rails api...");
      }
      if(response){
        //var parsedBody = JSON.parse(body).pages;
        total_count = JSON.parse(body).total_count;
        total_page = JSON.parse(body).pages;
        resolve(JSON.parse(body).pages);
      }
    });
  });

  promiseObj.then(function(result){
    console.log("sucessfull promise result for page count is : ",result);
    var pageByPage;
    for(var x=0; x<result; x++){
       pageNo = x+1;
        pageByPage = new Promise(function(resolve, reject ){
          console.log("page by page count: ",x+1);
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


              console.log("keys::    product:"+productType+":"+productVariant+":display_price:index");
              //---------------  create indexing for product collection  ----------------------
              client.hmset("product:"+productType+":"+productVariant+":index", "product:"+result[i].id, result[i].id, function(err, res){
                if(err){
                  console.log("error in creating collection index ");
                }else{
                  count++;

                  console.log("collection is created sucessfully... and count: ",count);
                }
              });

              // ------------------------------------- end  -----------------------------------------
              var price = parseFloat(result[i].display_price.substr(1,result[i].display_price.length));

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
            console.log("total: "+total_page);
            console.log("sucessfull count: ",pageNo);
            if( pageNo == total_page){
              response.json({ "total_count": total_count, "msg" : "INDEX CREATED SUCESSFULLY." });
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
