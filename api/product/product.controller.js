'use strict';
var redis =  require('redis');
var client = redis.createClient();
var lodash = require('lodash');
exports.show = function(req, res){
  console.log("id is: ",req.params.id);
  var stringToSearch = "";
  if(isNaN(parseInt(req.params.id))){
    stringToSearch = "productDescription:*:"+req.params.id;
  }
  else{
    stringToSearch = "productDescription:"+parseInt(req.params.id)+":*";
  }
  client.scan("0","count", "100000", "match", stringToSearch, function(err, reply){
    if(err){
      console.log("product description with id: "+req.params.id+" does not exists in redis server."+err);
      res.status(404).send("product description does not exists.");
    }
    if(reply[1]){
      client.get(reply[1], function(error, response){
        if(err){
          console.error('error', err);
          res.status(404).send("product description does not exists.");
        }
        else{
          res.status(200).send(response);  
        }
      })
    }
    else{
      res.status(404).send("product description does not exists.");
    }
    // if(reply == null){
    // }else{
    //   console.log("product id: "+req.params.id+" exists in redis server");
    //   res.status(200).send(reply);

    // }
  });
}