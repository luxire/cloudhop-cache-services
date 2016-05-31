'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
var redis =  require('redis');
var Search = require('reds');

var redis_server = require("../../../route");

var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server in api/filterProducts/admin/adminSerchController.js ');
})


exports.filterByName = function(request, response){
  console.log("calling admin- filter by name functioanlity..");
  var searchName, i, indexStart, total_count, pages;
  var finalProductsArr = [];
  var maxValuePerPage = 15;
  var currentPage = 1;

  currentPage
  for(var key in request.query){
    if(key == 'name'){
        searchName = request.query[key];
    }else if(key == 'page'){
      currentPage = request.query[key];
    }
  }
  console.log("searched name is: ", searchName);

  var count = 0;
  var search = Search.createSearch({
             service : "Search",
             key : "searchName",
             n : 2,
             cahce_time : 60,
             client : client
         });


  search
  .query(searchName)
  .type('or')
  .end(function(err, res){
    if (err) {
      console.log("error: ",err);
    }
    if(res.length > 0){
      console.log("query result in redis: ",res);
      console.log("total match: ",res.length-1);
      var indexStart = (currentPage -1 ) * maxValuePerPage;
      var indexEnd = (currentPage * maxValuePerPage);
      var tmpPages = parseInt(res.length / maxValuePerPage);
      var current_count=0;
      console.log("tmppages: ",tmpPages);
      total_count = res.length;
      if(total_count <= maxValuePerPage){
        pages = 1;
      }else{
        if((total_count % maxValuePerPage) == 0){
          pages = tmpPages;
        }else{
          pages = tmpPages + 1;
        }
      }

      i = 1;
      var getProductsById = function(){
        if(indexStart < indexEnd){
          current_count++;
          var id = parseInt(res[indexStart]);
          // if(id != res.length){
            client.get("products:"+id, function(err, reply ){
              if(err){
                console.log("error in redis: ",err);
              }
              else{
                //i++;
                indexStart++;
                getProductsById();
                if(reply != null){
                  finalProductsArr.push(JSON.parse(reply));
                }

              }
            });
          //}

        }else{
          response.json({ "count": current_count, "total_count": total_count, "current_page": currentPage , "pages": pages, "per_page": maxValuePerPage,"products" : finalProductsArr});
        }
      }
      getProductsById();
    }else{
      var msg = "NO RESULTS FOUND.";
      response.json({ "data" : msg});
    }

  });

}
