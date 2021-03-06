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
});



exports.deleteIndexByid = function(id){
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type", "suitable_climates", "wrinkle_resistance"];
  var baseColor = ["red", "green", "grey", "yellow", "blue", "olive", "orange", "white", "violet", "mauve", "pink", "purple", "lavender", "peach", "black", 'brown'];
  var permalink, productType, productVariant, variantFlag=0, storedProductObj;
  var updatedProductObj,promiseObj,deletedKey;

  console.log("calling functionality update index by product id: "+id);
  console.log("waiting for the rails api for response...");
  promiseObj =  new Promise(function(resolve, reject ){
    http.get(env.spree.host+env.spree.products+'/'+id+'?token='+token, function(err, response, body){
      if(err){
        console.log("error in getting all the products...");
      }
      if(response){
        //var obj = JSON.parse(body);
        console.log("sucessfully fetched the product object from rails api..");
        resolve(JSON.parse(body));

      }
    });
  });
  promiseObj.then(function(result){
    console.log("sucessfull promise result..");
    updatedProductObj = result;


    // ------------- logic to delete the existing indexing --------------
    client.get("products:"+id, function(err,reply){
      //console.log("get is calling..");
        if(err){
          console.log("error in redis when fetching products from redis..");
        }
        if(reply){
          storedProductObj = JSON.parse(reply);
          console.log("product id: ",storedProductObj.id);
          permalink = storedProductObj.taxons[0].permalink.split("/");
          if(permalink.length == 1){
            productType = permalink[0].toLowerCase();
            variantFlag = 0;
          }else{
            productType = permalink[0].toLowerCase();
            productVariant = permalink[1].toLowerCase();
            variantFlag = 1;
          }
          //----------------------  deleting the index from collection -----------------------------------------

            client.hdel("product:"+productType+":index", "product:"+storedProductObj.id, function(err, reply){
              if(err){
                console.log("error when deleting the collection from redis server : ",err);
              }
              if(reply){
                console.log(" collection is deleted sucessfully...");
              }
            })

          // ----------------------------------------------------------------------------------------------------

          if(variantFlag){

                console.log("nothing doing for the product price..");
                console.log("url: ","product:"+productType+":"+productVariant+":display_price:index");
                var price = parseFloat(storedProductObj.display_price.substr(1,storedProductObj.display_price.length));
                console.log("price: ",price);

                // ------------------------- deleting the price indexing for this product ----------------------------

                client.zrem("product:"+productType+":"+productVariant+":display_price:index", price+":"+storedProductObj.id, function(err, reply){
                  if(err){
                    console.log("error when deleting the fields from hash : ",err);
                  }
                  if(reply){
                    console.log(" display price is deleted sucessfully...");
                  }
                });

                // ----------------------------------------------------------------------------------------------------


            for(var key in storedProductObj.luxire_product){

            if(key == "wrinkle_resistance"){
                    console.log("url: ","product:"+productType+":"+productVariant+":"+key+":index:"+storedProductObj.luxire_product[key]);
                    // var propertyName = storedProductObj.luxire_product[key].trim().toLowerCase();

                    // ------------------------ deleting the wrinkle resistance indexing for this product  -----------------------

                    client.hdel("product:"+productType+":"+productVariant+":wrinkle_resistance:index:"+storedProductObj.luxire_product[key], "product:"+storedProductObj.id, function(err, reply){
                      if(err){
                        console.log("error when deleting the fields from hash : ",err);
                      }
                      if(reply){
                        console.log("wrinkle resistance is deleted sucessfully...");
                      }
                    });

                    // ----------------------------------------------------------------------------------------------------

              }else if(key == "product_color"){
                var mainProductColor = storedProductObj.luxire_product["product_color"].split(",");
                console.log("main color: ",mainProductColor);
                for(var x=0; x<mainProductColor.length; x++){
                  for(var y=0;y<baseColor.length; y++){
                    if(mainProductColor[x].indexOf(baseColor[y]) != -1){
                      propertyName = baseColor[y].toLowerCase().trim();
                      console.log("===== main color: "+mainProductColor[x]+" matched with base color: ",baseColor[y]+"======");

                      // ------------------------ deleting the wrinkle resistance indexing for this product  -----------------------

                      client.hdel("product:"+productType+":"+productVariant+":product_color:index:"+propertyName, "product:"+storedProductObj.id, function(err, reply){
                        if(err){
                          console.log("error when deleting the fields from hash : ",err);
                        }
                        if(reply){
                          console.log("color index deleted sucessfully...");
                          console.log("product_color index is deleted sucessfully...for color: ",baseColor[y]);
                        }
                      });

                      // ----------------------------------------------------------------------------------------------------

                    }
                  }
                }
              }else{
                for(var i =0; i<filterAttributes.length; i++){
                  if( filterAttributes[i] != 'product_color' && filterAttributes[i] != 'wrinkle_resistance' && key == filterAttributes[i] && storedProductObj.luxire_product[key] != null){
                    console.log("matching key is: ",key);
                    deletedKey = key;
                    var keyVal = storedProductObj.luxire_product[key].split(",");
                    console.log("matching value length: ",keyVal.length);
                    if(keyVal.length == 1){
                        console.log("single value: ",keyVal);
                        var propertyName = keyVal[0].toLowerCase();
                        console.log("urls: "+"product:"+productType+":"+productVariant+":"+key+":index:"+propertyName);

                        // ------------------------ deleting the other filter attributes (having single value ) indexing for this product  -----------------------

                        client.hdel("product:"+productType+":"+productVariant+":"+key+":index:"+propertyName, "product:2008", function(err, reply){
                          if(err){
                            console.log("error when deleting the fields from hash : ",err);
                          }
                          if(reply){
                            console.log(deletedKey+" is deleted sucessfully...");
                          }
                        });

                        // ----------------------------------------------------------------------------------------------------

                    }else{
                      for(var j=0; j<keyVal.length; j++){
                        console.log("multipal value: ",keyVal[j]);
                        console.log("urls:  ","product:"+productType+":"+productVariant+":"+key+":index:"+keyVal[j].toLowerCase()+", "+"product:"+storedProductObj.id);
                        var propertyName = keyVal[j].trim().replace(/\s+/g, "").toLowerCase();

                        // ------------------------ deleting the other filter attributes (having multiple value ) indexing for this product  -----------------------

                        client.hdel("product:"+productType+":"+productVariant+":"+key+":index:"+propertyName, "product:"+storedProductObj.id, function(err, reply){
                          if(err){
                            console.log("error when deleting the fields from hash : ",err);
                          }
                          if(reply){
                            console.log("-----------when deleting hash response: ",reply);
                            console.log(deletedKey+" is deleted sucessfully...");
                          }
                        });
                        // ----------------------------------------------------------------------------------------------------

                      }
                    }


                  }
                }
              }

            }

          }


        }
        // deleting the product (partials details )from redis server
      //   client.del("products:"+storedProductObj.id, function(err, reply){
      //     if(err){
      //       console.log("error when deleting product from redis server...");
      //     }
      //     if(reply){
      //       console.log("product deleted sucessfully from redis server...");
      //     }
      //   })
       });// ------------------- end ----------------------------------------


      // deleting the product ( detailed details )from redis server
    //   client.del("productDescription:"+storedProductObj.id, function(err, reply){
    //     if(err){
    //       console.log("error when deleting product description details  from redis server...");
    //     }
    //     if(reply){
    //       console.log("product detailed description deleted sucessfully from redis server...");
    //     }
    //   })
     });// ------------------- end ----------------------------------------


}

var pid = 2008;
//deleteIndexByid(pid);


exports.createIndexByid = function(id){
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type", "suitable_climates", "wrinkle_resistance"];
  var baseColor = ["red", "green", "grey", "yellow", "blue", "olive", "orange", "white", "violet", "mauve", "pink", "purple", "lavender", "peach", "black", 'brown'];
  var permalink, productType, productVariant, variantFlag=0, storedProductObj;
  var updatedProductObj,promiseObj,deletedKey;

  console.log("calling functionality update index by product id: "+id);
  console.log("waiting for the rails api for response...");
  promiseObj =  new Promise(function(resolve, reject ){
    http.get(env.spree.host+env.spree.products+'/'+id+'?token='+token, function(err, response, body){
      if(err){
        console.log("error in getting all the products...");
      }
      if(response){
        //var obj = JSON.parse(body);
        console.log("sucessfully fetched the product object from rails api..");
        resolve(JSON.parse(body));

      }
    });
  });
  promiseObj.then(function(result){
    console.log("sucessfull promise result..");
    storedProductObj = result;

          // --------------------  separating the permalink object validation  ----------------------
          console.log("product id: ",storedProductObj.id);
          permalink = storedProductObj.taxons[0].permalink.split("/");
          if(permalink.length == 1){
            productType = permalink[0].toLowerCase();
            variantFlag = 0;
          }else{
            productType = permalink[0].toLowerCase();
            productVariant = permalink[1].toLowerCase();
            variantFlag = 1;
          }
          // -----------------------------------------------------------------------------------------
          //----------------------  creating the index for collection -----------------------------------------
            console.log("url for collection: product:"+productType+":index");
            client.hmset("product:"+productType+":index", "product:"+storedProductObj.id, storedProductObj.id,  function(err, reply){
              if(err){
                console.log("error when creating the collection from redis server : ",err);
              }
              if(reply){
                console.log(" collection is creted sucessfully...");
              }
            })

          // ----------------------------------------------------------------------------------------------------

          if(variantFlag){

                var price = parseFloat(storedProductObj.display_price.substr(1,storedProductObj.display_price.length));
                console.log("price: ",price);

                client.zadd("product:"+productType+":"+productVariant+":display_price:index", 0, price+":"+storedProductObj.id, function(err, reply){
                  if(err){
                    console.log("error when creating the fields from hash : ",err);
                  }
                  if(reply){
                    console.log(" display price is created sucessfully...");
                  }
                });

            for(var key in storedProductObj.luxire_product){

            if(key == "wrinkle_resistance"){

                    client.hmset("product:"+productType+":"+productVariant+":wrinkle_resistance:index:"+storedProductObj.luxire_product[key], "product:"+storedProductObj.id, storedProductObj.id, function(err, reply){
                      if(err){
                        console.log("error when creating the fields from hash : ",err);
                      }
                      if(reply){
                        console.log("wrinkle resistance is created sucessfully...");
                      }
                    });
              }else if(key == "product_color"){
                var mainProductColor = storedProductObj.luxire_product["product_color"].split(",");
                console.log("main color: ",mainProductColor);
                for(var x=0; x<mainProductColor.length; x++){
                  for(var y=0;y<baseColor.length; y++){
                    if(mainProductColor[x].indexOf(baseColor[y]) != -1){
                      propertyName = baseColor[y].toLowerCase().trim();
                      console.log("===== main color: "+mainProductColor[x]+" matched with base color: ",baseColor[y]+"======");
                      client.hmset("product:"+productType+":"+productVariant+":product_color:index:"+propertyName, "product:"+storedProductObj.id, storedProductObj.id, function(err, reply){
                        if(err){
                          console.log("error when creating the fields from hash : ",err);
                        }
                        if(reply){
                          console.log("color index created sucessfully...");
                        }
                      });
                    }
                  }
                }
              }else{
                for(var i =0; i<filterAttributes.length; i++){
                  if( filterAttributes[i] != 'product_color' && filterAttributes[i] != 'wrinkle_resistance' && key == filterAttributes[i] && storedProductObj.luxire_product[key] != null){
                    console.log("matching key is: ",key);
                    deletedKey = key;
                    var keyVal = storedProductObj.luxire_product[key].split(",");
                    console.log("matching value length: ",keyVal.length);
                    if(keyVal.length == 1){
                        console.log("single value: ",keyVal);
                        var propertyName = keyVal[0].trim().replace(/\s+/g, "").toLowerCase();
                        console.log("urls: "+"product:"+productType+":"+productVariant+":"+key+":index:"+propertyName);
                        client.hmset("product:"+productType+":"+productVariant+":"+key+":index:"+propertyName, "product:"+storedProductObj.id, storedProductObj.id,function(err, reply){
                          if(err){
                            console.log("error when creating the fields from hash : ",err);
                          }
                          if(reply){
                            console.log(deletedKey+" is created sucessfully...");
                          }
                        });
                    }else{
                      for(var j=0; j<keyVal.length; j++){
                        console.log("multipal value: ",keyVal[j]);
                        console.log("urls:  ","product:"+productType+":"+productVariant+":"+key+":index:"+keyVal[j].toLowerCase()+", "+"product:"+storedProductObj.id);
                        var propertyName = keyVal[j].trim().replace(/\s+/g, "").toLowerCase();
                        client.hmset("product:"+productType+":"+productVariant+":"+key+":index:"+propertyName, "product:"+storedProductObj.id, storedProductObj.id, function(err, reply){
                          if(err){
                            console.log("error when creating the indexing in redis server : ",err);
                          }
                          if(reply){
                            console.log(" product indexing is created sucessfully...");
                          }
                        });
                      }
                    }


                  }
                }
              }

            }

          }

        // creating the product (partials details) in redis server
        // client.set("products:"+storedProductObj.id, function(err, reply){
        //   if(err){
        //     console.log("error when storing the product in redis server...");
        //   }
        //   if(reply){
        //     console.log("product stored sucessfully in redis server...");
        //   }
        // })

        // ------------------------------------------------------------------
        // creating the product description in redis server
        // client.set("productDescription:"+storedProductObj.id, function(err, reply){
        //   if(err){
        //     console.log("error when storing the product in redis server...");
        //   }
        //   if(reply){
        //     console.log("product stored sucessfully in redis server...");
        //   }
        // })

        // ------------------------------------------------------------------
  });

}

//createIndexByid(pid);

exports.test = function(){
  console.log("hi i am function test...");
}
