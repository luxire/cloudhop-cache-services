'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis =  require('redis');
//var client = redis.createClient();
var redis_server = require("../../../route");

var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api/ filterProducts /filterByTaxon.controller.js');
})

exports.filterByTaxon = function(req, res ){

  console.log("calling the customer side filteration functionality...");

  var finalArr = [];
  var promiseCount = 0;
  var pageNo = 1;
  var permalink;
  var maxValuePerPage = 15;
  var pages,total_count,tmpPages,current_page_count;
  var sortType = "default";
     console.log("req.query object : ",req.query);
     //console.log("object length: ",Object.keys(req.query).length);
     // ----------------  start create the query object  -----------------
     var queryArr = [];
     for(var x in req.query){
       if(x == "page"){
         pageNo = parseInt(req.query[x]);
       }else if(x == "sort"){
         sortType = req.query[x].toLowerCase();
       }else if(x == "permalink"){
         permalink = req.query[x].split("/");;
       }else{
         queryArr.push({"name" : x, "value": req.query[x].split(",")});
       }
     }
     console.log("permalink: ",permalink);
     console.log("queryArr: \n\n\n\n",queryArr);

     // ---------------  end processing of query object ------------------------

     //************************* start the procesing of fetching product by taxons *************************


          for(var i=0; i<queryArr.length; i++){
            var p;
            // ---------------- start fetching products ids from redis with pattern color  ------------------
             if(queryArr[i].name == 'display_price'){ // ---------------- start fetching products ids from redis with pattern price  ------------------
              console.log("------query string matched with price-----");
              var start = parseInt(queryArr[i].value[0]);
              var end = parseInt(queryArr[i].value[1]);

              console.log("price start: "+start+" price end: "+end);
              console.log("permalink: ",permalink);
              console.log("hash name:: "+"product:"+permalink[0]+":"+permalink[1]+":display_price:index");
              p = new Promise(function(resolve, reject){
                client.exists("product:"+permalink[0]+":"+permalink[1]+":display_price:index", function(err, reply){
                    if(err){
                      console.log("product:Display_price:Index does not exists...");
                    }else{
                      console.log("product:Display_price:Index exists...");
                      client.ZRANGEBYLEX("product:"+permalink[0]+":"+permalink[1]+":display_price:index","["+start,"["+end, function(err, result){
                              if(err){
                                console.log("when retrieving price from product price index error: ",err);
                              }else{
                                var tempArr = [];
                                for(var i=0;i<result.length; i++){
                                  var id = result[i].split(":");
                                  id = id[1];
                                  tempArr.push(id);
                                }
                                resolve(tempArr);
                            }

                          });
                        }
                });// ---------------- end fetching products ids from redis with pattern price  ------------------
              });

            }else{//end of display price
              var indexName, indexPropertyName;
              console.log("=======calling promises except display_price....=======");
              p = new Promise(function(resolve, reject ){
                if(queryArr[i].value.length == 1){
                  // indexName = queryArr[i].name.charAt(0).toUpperCase()+queryArr[i].name.substr(1).toLowerCase();
                      indexName = queryArr[i].name;
                      indexPropertyName = queryArr[i].value[0].trim().replace(/\s+/g, "").toLowerCase();
                      console.log("in case of query string value 1..");
                      console.log("index name",indexName);
                      console.log("index property name: ",indexPropertyName);
                      console.log("permalink: ",permalink);
                      console.log("hash name:: "+"product:"+permalink[0]+":"+permalink[1]+":"+indexName+":index:"+indexPropertyName);
                      client.hvals("product:"+permalink[0]+":"+permalink[1]+":"+indexName+":index:"+indexPropertyName, function(err, result){
                          if(err){
                              console.log("error getting product: "+indexName+" :Index of: "+indexPropertyName+" ",err);
                          }
                          if(result){
                              console.log("getting result for indexname: "+indexName+" and property name: ",indexPropertyName+" is sucessfull...");
                              console.log("sucessfull result is: ",result);
                              resolve(result);
                          }

                        });
                }else{
                 console.log("in case of query string value > 1..");

                   console.log("value length: ",queryArr[i].value.length);
                   var index = 0;
                   var uniqueIdsArr = [];
                   var len = queryArr[i].value.length;
                  //  indexName = queryArr[i].name.charAt(0).toUpperCase()+queryArr[i].name.substr(1).toLowerCase();
                   indexName = queryArr[i].name;

                   indexPropertyName = queryArr[i].value[index].trim().replace(/\s+/g, "").toLowerCase();
                   var indexValue = queryArr[i].value;
                   console.log("index value: ",indexValue);
                   console.log("permalink: ",permalink);
                   console.log("hash name:: "+"product:"+permalink[0]+":"+permalink[1]+":"+indexName+":index:"+indexPropertyName);
                   var getIndexIds = function(){
                     if(index < len){
                       console.log("index name",indexName);
                       indexPropertyName = indexValue[index].trim().replace(/\s+/g, "").toLowerCase();
                       console.log("index property name: ",indexPropertyName);
                       console.log("hash name: "+"product:"+permalink[0]+":"+permalink[1]+":"+indexName+":index:"+indexPropertyName);
                        client.hvals("product:"+permalink[0]+":"+permalink[1]+":"+indexName+":index:"+indexPropertyName, function(err, result){
                           if(err){
                               console.log("error getting product: "+indexName+" :Index of: "+indexPropertyName+" ",err);
                           }
                           if(result){
                               console.log("getting result for indexname: "+indexName+" and property name: ",indexPropertyName+" is sucessfull...");
                               console.log("sucessfull result is: ",result);
                               for(var j=0; j<result.length; j++ ){
                                 if(uniqueIdsArr.indexOf(result[j]) == -1){
                                   uniqueIdsArr.push(result[j]);
                                 }
                               }
                               index++;
                               getIndexIds();

                           }

                         });
                     }else{
                       console.log("\n\n+++++++++++++ final unique ids are ++++++++++++++: \n\n",uniqueIdsArr);
                       resolve(uniqueIdsArr);
                     }
                   }
                   getIndexIds();
                }
              });

            }

            // dealing with the intersection of filtered products ids
            p.then(function(result){
               //  console.log("promise count: ",promiseCount);
               //  console.log("query length: ",queryArr.length);
               //  console.log("result array : \n",result);
                if(promiseCount == 0){
                  finalArr = result;
                }else{
                  finalArr = finalArr.filter(function(item, index){
                   return result.indexOf(item) != -1;
                 });
                }
                promiseCount++;
               //  console.log("final array: \n",finalArr);
                console.log("------------------------");

               if(promiseCount == queryArr.length){
                 // console.log("promise ends....");
                 var finalProductsArr = [];

                 console.log("final sorted array with unique id is: \n",finalArr);
                 console.log("in query page no is: ",pageNo);
                 console.log("in get value index start: ",(pageNo-1)*maxValuePerPage);
                 console.log("in get value index end: ",(pageNo*maxValuePerPage)-1);
                 var indexStart = (pageNo -1 ) * maxValuePerPage;
                 var indexEnd = (pageNo * maxValuePerPage);
                 tmpPages = parseInt(finalArr.length / maxValuePerPage);
                 console.log("tmppages: ",tmpPages);
                 total_count = finalArr.length;
                 if(total_count <= maxValuePerPage){
                   pages = 1;
                 }else{
                   if((total_count % maxValuePerPage) == 0){
                     pages = tmpPages;
                   }else{
                     pages = tmpPages + 1;
                   }
                 }


                 var i = 0;
                 var getValue = function (){
                   if(/*i <= finalArr.length*/ indexStart <= indexEnd ){
                     client.get("products:"+finalArr[indexStart], function(error, reply){ // finalArr[indexStart]
                       if(error){
                         console.log("getting error when retrieving the product by get products by id: ",err);
                       }else{
                           //i++;
                           indexStart++;
                           getValue();
                           if(reply != null ){
                             finalProductsArr.push(JSON.parse(reply));
                           }
                         //i++;

                       }
                     })
                   }
                   else{
                     if(finalProductsArr.length == 0){

                       res.json({"data": "NO PRODUCTS MATCHED THE FILTERATION ATTRIBUTES." });

                     }else{
                       // -------------------- start sorting functionality by price --------------------

                       console.log("before sending the product arr to client");
                       console.log("sorttype: "+sortType);
                       if(sortType == "default"){
                         console.log("caling sort type default...");
                         current_page_count = finalProductsArr.length;
                       }
                       if(sortType == "asc" ){
                         console.log("calling asc sort type logic... ");
                         current_page_count = finalProductsArr.length;

                         finalProductsArr.sort(function(obj1, obj2){
                               var obj1Price =  parseFloat(obj1.display_price.substr(1,obj1.display_price.length));
                               var obj2Price =  parseFloat(obj2.display_price.substr(1,obj2.display_price.length));

                               return obj1Price - obj2Price ;
                             });
                             var tmparr =[];
                             for(var l=0; l<finalProductsArr.length; l++){
                               tmparr.push(finalProductsArr[l].id);
                             }
                             console.log("after sorting final arr in ascending order: ",tmparr);
                             console.log("count: ",finalProductsArr.length);

                       }
                       if(sortType == "desc"){
                         console.log("calling desc sort type logic... ");
                         current_page_count = finalProductsArr.length;

                         finalProductsArr.sort(function(obj1, obj2){
                               var obj1Price =  parseFloat(obj1.display_price.substr(1,obj1.display_price.length));
                               var obj2Price =  parseFloat(obj2.display_price.substr(1,obj2.display_price.length));

                               return obj2Price - obj1Price ;
                             });
                             var tmparr =[];
                             for(var l=0; l<finalProductsArr.length; l++){
                               tmparr.push(finalProductsArr[l].id);
                             }
                             console.log("after sorting final arr in descending order: ",tmparr);
                             console.log("count: ",finalProductsArr.length);


                       }


                       // -------------------- end sorting functionality by price --------------------

                       res.json({"count": current_page_count,"total_count": total_count,"current_page": pageNo, "per_pages": maxValuePerPage ,"pages": pages,"products": finalProductsArr});

                     }
                   }
                 };
                 // check condition for no products in the current page
                 if(indexStart > finalArr.length ){
                   var msg = "NO PRODUCTS FOUND IN THE CURRENT PAGE: "+pageNo;
                   res.json({"data": msg });

                 }else{
                   getValue();
                 }
                 //getValue();
                 // check condition for no products in the current page

               }
            }).catch(function( err ){
               console.log("error in promise: ",err);
            });
          }


     //************************* end the procesing of fetching product by taxons ***************************

}
