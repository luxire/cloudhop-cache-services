'use strict';
var redis = require('redis');
var client = redis.createClient();
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
        product_search.updateIndex(products[i]);
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
          let eachObject = {};
          eachObject.id = parsedObject.id;
          eachObject.name = parsedObject.name;
          eachObject.url = parsedObject.master.images[0].small_url;
          responseArray.push(eachObject);
        }
        res.json(responseArray);
      }
    })
  }else{
    let responseMsg = {msg: "Please provide product id"};
    res.status(422).send(JSON.stringify(responseMsg));
  }

}