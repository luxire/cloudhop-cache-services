'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis = require('redis');
//var client = redis.createClient();
var redis_server = require("../../route");
var syncRedis = require("../../createRedisIndex/syncRedis");

var env = require("../../config/constant");
var product_search = require('../../search/products');

var client = redis_server.client;
client.on('connect', function () {
  console.log('Connected to redis server  in api/search/searchController.js');
})


exports.productInRedisById = function (req, res) {
  console.log("calling the products in redis by id ");
  console.log("id is: ", req.params.id);
  var id = parseInt(req.params.id);
  client.get("products:" + id, function (err, reply) {
    if (err) {
      console.log("product with id: " + req.params.id + " does not exists in redis server." + err);
    }
    if (reply == null) {
      res.json({ "data": "product does not exists." });
    } else {
      console.log("product id: " + req.params.id + " exists in redis server");
      var data = JSON.parse(reply);
      res.json({ "data": data });

    }
  });
}
exports.productInRedisByIds = function (req, res) {
  var finalProductsArr = [];
  console.log("calling the products in redis by ids ");
  console.log("ids array  is: ", req.query.ids);
  var tmpIdsStr = req.query.ids.substr(1, req.query.ids.length - 2);
  var idsArr = tmpIdsStr.split(",");
  console.log("idsArr: ", idsArr);
  var i = 0;
  var getValue = function () {
    if (i <= idsArr.length) {
      client.get("products:" + idsArr[i], function (error, reply) { // finalArr[indexStart]
        if (error) {
          console.log("getting error when retrieving the product by get products by id: ", err);
        } else {
          i++;
          getValue();
          if (reply != null) {
            finalProductsArr.push(JSON.parse(reply));
          }
          //i++;

        }
      })
    }
    else {
      //console.log("finalproducts array: \n",finalProductsArr);
      res.json({ "data": finalProductsArr });

    }
  }
  getValue();
}

exports.deleteProductInRedisById = function (req, res) {
  let productKey = "products:" + req.params.id
  client.get(productKey, function (err, product) {
    if (err) {
      console.error(`Unable to fetch product with key:${productKey} for deleting`);
      res.status(422).json({ msg: `Error deleting product with id ${req.params.id}` });
    } else {
      product_search.deleteIndex(JSON.parse(product)).then(function (product) {
        client.del(productKey, function (err, response) {
          if (err) {
            console.error("error in deleting products in redis server for id: ", req.params.id);
            res.status(422).json({ msg: `Error deleting product with id ${req.params.id}` });
          } else {
            console.log("product deleted sucessfully in redis server for id: ", req.params.id);
            res.status(200).json({ msg: `Product with id ${req.params.id} deleted successfully` });
          }
        })
      }, function (error) {
        res.status(422).json({ msg: `Error deleting product Index with id ${req.params.id}` });
      })
    }
  })
}

exports.createProductInRedisById = function (req, res) {
  console.log("calling function create product in redis by id...");
  var token = '99da15069ef6b38952aa73d4550d88dd266fc302a4c8b058';
  var filterAttributes = ["product_color", "transparency", "display_price", "pattern", "product_weave_type", "suitable_climates", "wrinkle_resistance"];
  var baseColor = ["red", "green", "grey", "yellow", "blue", "olive", "orange", "white", "violet", "mauve", "pink", "purple", "lavender", "peach", "black", 'brown'];
  var permalink, productType, productVariant, variantFlag = 0, storedProductObj;
  var updatedProductObj, promiseObj, deletedKey, product_id;

  console.log("waiting for the rails api for response...");
  product_id = parseInt(req.params.id);
  promiseObj = new Promise(function (resolve, reject) {
    http.get(env.spree.host + env.spree.products + '/' + product_id + '?token=' + token, function (err, response, body) {
      if (err) {
        console.log("error in getting all the products...");
      }
      if (response) {
        //var obj = JSON.parse(body);
        console.log("sucessfully fetched the product object from rails api..");
        resolve(JSON.parse(body));

      }
    });
  });
  promiseObj.then(function (result) {
    console.log("sucessfull promise result..");
    storedProductObj = result;

    // --------------------  separating the permalink object validation  ----------------------
    console.log("product id: ", storedProductObj.id);
    permalink = storedProductObj.taxons[0].permalink.split("/");
    if (permalink.length == 1) {
      productType = permalink[0].toLowerCase();
      variantFlag = 0;
    } else {
      productType = permalink[0].toLowerCase();
      productVariant = permalink[1].toLowerCase();
      variantFlag = 1;
    }
    // -----------------------------------------------------------------------------------------
    //----------------------  creating the index for collection -----------------------------------------
    console.log("url for collection: product:" + productType + ":index");
    client.hmset("product:" + productType + ":index", "product:" + storedProductObj.id, storedProductObj.id, function (err, reply) {
      if (err) {
        console.log("error when creating the collection from redis server : ", err);
      }
      if (reply) {
        console.log(" collection is creted sucessfully...");
      }
    })

    // ----------------------------------------------------------------------------------------------------

    if (variantFlag) {

      var price = parseFloat(storedProductObj.display_price.substr(1, storedProductObj.display_price.length));
      console.log("price: ", price);

      client.zadd("product:" + productType + ":" + productVariant + ":display_price:index", 0, price + ":" + storedProductObj.id, function (err, reply) {
        if (err) {
          console.log("error when creating the fields from hash : ", err);
        }
        if (reply) {
          console.log(" display price is created sucessfully...");
        }
      });

      for (var key in storedProductObj.luxire_product) {

        if (key == "wrinkle_resistance") {

          client.hmset("product:" + productType + ":" + productVariant + ":wrinkle_resistance:index:" + storedProductObj.luxire_product[key], "product:" + storedProductObj.id, storedProductObj.id, function (err, reply) {
            if (err) {
              console.log("error when creating the fields from hash : ", err);
            }
            if (reply) {
              console.log("wrinkle resistance is created sucessfully...");
            }
          });
        } else if (key == "product_color") {
          var mainProductColor = storedProductObj.luxire_product["product_color"].split(",");
          console.log("main color: ", mainProductColor);
          for (var x = 0; x < mainProductColor.length; x++) {
            for (var y = 0; y < baseColor.length; y++) {
              if (mainProductColor[x].indexOf(baseColor[y]) != -1) {
                propertyName = baseColor[y].toLowerCase().trim();
                console.log("===== main color: " + mainProductColor[x] + " matched with base color: ", baseColor[y] + "======");
                client.hmset("product:" + productType + ":" + productVariant + ":product_color:index:" + propertyName, "product:" + storedProductObj.id, storedProductObj.id, function (err, reply) {
                  if (err) {
                    console.log("error when creating the fields from hash : ", err);
                  }
                  if (reply) {
                    console.log("color index created sucessfully...");
                  }
                });
              }
            }
          }
        } else {
          for (var i = 0; i < filterAttributes.length; i++) {
            if (filterAttributes[i] != 'product_color' && filterAttributes[i] != 'wrinkle_resistance' && key == filterAttributes[i] && storedProductObj.luxire_product[key] != null) {
              console.log("matching key is: ", key);
              deletedKey = key;
              var keyVal = storedProductObj.luxire_product[key].split(",");
              console.log("matching value length: ", keyVal.length);
              if (keyVal.length == 1) {
                console.log("single value: ", keyVal);
                var propertyName = keyVal[0].trim().replace(/\s+/g, "").toLowerCase();
                console.log("urls: " + "product:" + productType + ":" + productVariant + ":" + key + ":index:" + propertyName);
                client.hmset("product:" + productType + ":" + productVariant + ":" + key + ":index:" + propertyName, "product:" + storedProductObj.id, storedProductObj.id, function (err, reply) {
                  if (err) {
                    console.log("error when creating the fields from hash : ", err);
                  }
                  if (reply) {
                    console.log(deletedKey + " is created sucessfully...");
                  }
                });
              } else {
                for (var j = 0; j < keyVal.length; j++) {
                  console.log("multipal value: ", keyVal[j]);
                  console.log("urls:  ", "product:" + productType + ":" + productVariant + ":" + key + ":index:" + keyVal[j].toLowerCase() + ", " + "product:" + storedProductObj.id);
                  var propertyName = keyVal[j].trim().replace(/\s+/g, "").toLowerCase();
                  client.hmset("product:" + productType + ":" + productVariant + ":" + key + ":index:" + propertyName, "product:" + storedProductObj.id, storedProductObj.id, function (err, reply) {
                    if (err) {
                      console.log("error when creating the indexing in redis server : ", err);
                    }
                    if (reply) {
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
    // client.set("products:"+storedProductObj.id, JSON.stringify(storedProductObj), function(err, reply){
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

    res.json({ "msg": "INDEXING RELATED TO THIS PRODUCT IS CREATED SUCESSFULLY.." });

  });
}


exports.updateProductInRedisById = function (req, res) {
  console.log("calling function update product in redis by id...");
  var product_id = parseInt(req.params.id);
  console.log("product object to update is: ", product_id);
  syncRedis.test();
  syncRedis.deleteIndexByid(product_id);
  syncRedis.createIndexByid(product_id);
  res.json({ "msg": "INDEXING RELATED TO THIS PRODUCT IS CREATED SUCESSFULLY.." });

}
