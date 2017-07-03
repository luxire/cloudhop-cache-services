'use strict';
var redis = require('redis');
var path = require('path');
var constantFilePath = path.resolve(process.cwd(), 'config', 'constant.js');
var env = require(constantFilePath);
var client = redis.createClient(env.redisConf);
client.auth(process.env.NODE_REDIS_PASSWORD);
var lodash = require('lodash');
var http = require('request');
var constants = require('../../config/constant');
var product_search = require('../../search/products');

exports.show = function (req, res) {
  console.log("id is: ", req.params.id);
  var stringToSearch = "";
  if (isNaN(parseInt(req.params.id))) {
    stringToSearch = "productDescription:*:" + req.params.id;
  }
  else {
    stringToSearch = "productDescription:" + parseInt(req.params.id) + ":*";
  }
  client.scan("0", "count", "100000", "match", stringToSearch, function (err, reply) {
    if (err) {
      console.log("product description with id: " + req.params.id + " does not exists in redis server." + err);
      res.status(404).send("product description does not exists.");
    }
    if (reply[1]) {
      client.get(reply[1], function (error, response) {
        if (error) {
          console.error('error', error);
          res.status(404).send("product description does not exists.");
        }
        else {
          res.status(200).send(response);
        }
      })
    }
    else {
      res.status(404).send("product description does not exists.");
    }
    // if(reply == null){
    // }else{
    //   console.log("product id: "+req.params.id+" exists in redis server");
    //   res.status(200).send(reply);

    // }
  });
}

exports.sync = function (req, res) {
  console.log("timestamp @received", Date.now())
  var product_ids = req.body.ids;//expecting array of ids
  http.get({
    uri: constants.spree.host + constants.spree.products + '?per_page=' + product_ids.length + '&ids=' + product_ids.toString()
  }, function (err, response, body) {
    if (err) {
      console.log(err);
      res.status(500).send(error.syscall);
    }
    else {
      console.log("timestamp @product fetched", Date.now())
      var products = JSON.parse(body).products;
      for (var i = 0; i < products.length; i++) {
        let product = products[i];
        client.set("products:" + product.id, JSON.stringify(product), function (err, res) {
          if (err) {
            console.log("error in updating products in redis server for id: ", product.id);
          } else {
            console.log("product updated sucessfully in redis server for id: ", product.id);
            product_search.updateIndex(product);
          }
        });
      };
      res.status(200).send("Sync in progress..");
    }
  });

};

exports.getAllProducts = function (req, res) {
  let ids = lodash.values(req.query.ids);
  let queryStringArr = [];
  for (let id of ids) {
    queryStringArr.push(`products:${id}`);
  }
  console.log("queryStringArr", queryStringArr);
  if (queryStringArr.length !== 0) {
    client.mget(queryStringArr, function (error, response) {
      if (error) {
        console.error('error', error);
        res.status(404).send(`can not retrieve product details because of ${error}`);
      } else {
        let responseArray = [];
        let parsedObject = {};
        for (let res of response) {
          parsedObject = JSON.parse(res);
          if (parsedObject !== null) {
            let eachObject = {};
            eachObject.id = parsedObject.id;
            eachObject.name = parsedObject.name;
            eachObject.url = parsedObject.master.images[0].small_url;
            responseArray.push(eachObject);
          } else {
            console.error("Redis: Unable to find product ", res);
          }
        }
        res.json(responseArray);
      }
    })
  } else {
    let responseMsg = { msg: "Please provide product id" };
    res.status(422).send(JSON.stringify(responseMsg));
  }

}

exports.updateRedis = function (req, res) {
  let product = JSON.parse(req.body.product);
  client.set("products:" + product.id, JSON.stringify(product), function (err, reply) {
    if (err) {
      console.log(`Error while updating redis. Reason is ${err}`);
      res.status(500).json("Error updating Redis");
    } else {
      product_search.deleteIndex(product).then(function (product) {
        product_search.createIndex(product);
        console.log(`${product.name} is updated successfully in redis`);
        res.status(200).json("Redis Updated sucessfully");
      }, function (error) {
        console.log("Failed to update", error);
        if (error.status == 404) {
          product_search.createIndex(product);
          console.log(`${product.name} is updated successfully in redis`);
          res.status(200).json("Redis Updated sucessfully");
        } else {
          console.log(`Error while updating redis. Reason is ${error}`);
          res.status(500).json("Error updating Redis");
        }
      });
      product_search.updateIndex(product);
    }
  })
}
