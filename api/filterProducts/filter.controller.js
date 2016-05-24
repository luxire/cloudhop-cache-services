'use strict';
//var _ = require('lodash');
var http = require('request');
var querystring = require('querystring');
// var qs = require('qs');
//var client = require('../api/search');
var redis =  require('redis');
//var client = redis.createClient();
var redis_server = require("../../route");

var client = redis_server.client;
client.on('connect', function(){
  console.log('Connected to redis server  in api/search/searchController.js');
})


// exports.filter = function(req, res ){
//   console.log("calling filter fun in filter products file...");
//   var finalArr = [];
//   var promiseCount = 0;
//      console.log("req.query object : ",req.query);
//      console.log("object length: ",Object.keys(req.query).length);
//      // ----------------  start create the query string  -----------------
//      var queryArr = [];
//      for(var x in req.query){
//
//        queryArr.push({"name" : x, "value": req.query[x]});
//        console.log("qurey arr: ", queryArr);
//      }
//
//      // ----------------  end create the query string  -----------------
//      // ---------------- start iterating over the query string to match pattern ------------------
//
//      for(var i=0; i<queryArr.length; i++){
//        var p;
//        // ---------------- start fetching products ids from redis with pattern color  ------------------
//         if(queryArr[i].name == 'display_price'){ // ---------------- start fetching products ids from redis with pattern price  ------------------
//          console.log("------query string matched with price-----");
//          var tmp = queryArr[i].value.split(",");
//
//          var start = parseInt(tmp[0]);
//          var end = parseInt(tmp[1]);
//          console.log("start: "+start+" end: "+end);
//          p = new Promise(function(resolve, reject){
//            client.exists("product:Display_price:Index", function(err, reply){
//                if(err){
//                  console.log("product:Display_price:Index does not exists...");
//                }else{
//                  console.log("product:Display_price:Index exists...");
//                  client.ZRANGEBYLEX("product:Display_price:Index","["+start,"["+end, function(err, result){
//                          if(err){
//                            console.log("when retrieving price from product price index error: ",err);
//                          }else{
//                            var tempArr = [];
//                            for(var i=0;i<result.length; i++){
//                              var id = result[i].split(":");
//                              id = id[1];
//                              tempArr.push(id);
//                            }
//                            resolve(tempArr);
//                        }
//
//                      });
//                    }
//            });// ---------------- end fetching products ids from redis with pattern price  ------------------
//          });
//
//        }else{
//          console.log("=======calling promises except display_price....=======");
//          p = new Promise(function(resolve, reject){
//           console.log("-----querystring matched with: "+queryArr[i].name+" :----- ");
//           var indexName = queryArr[i].name.charAt(0).toUpperCase()+queryArr[i].name.substr(1).toLowerCase();
//           var indexPropertyName = queryArr[i].value.trim().replace(/\s+/g, "").toLowerCase();
//           console.log("index name: ",indexName);
//           console.log("index property name : ",indexPropertyName);
//           console.log("hash name: "+"product:"+indexName+":Index:"+indexPropertyName);
//           client.hvals("product:"+indexName+":Index:"+indexPropertyName, function(err, result){
//               if(err){
//                   console.log("error getting product: "+indexName+" :Index of: "+indexPropertyName+" ",err);
//               }
//               if(result){
//                   console.log("getting result for indexname: "+indexName+" and property name: ",indexPropertyName+" is sucessfull...");
//                   console.log("sucessfull result is: ",result);
//                   resolve(result);
//               }
//
//             });
//
//          }); // ---------------- end fetching products ids from redis with pattern color  ------------------
//        }
//
//        // dealing with the intersection of filtered products ids
//        p.then(function(result){
//            console.log("promise count: ",promiseCount);
//            console.log("query length: ",queryArr.length);
//            console.log("result array : \n",result);
//            if(promiseCount == 0){
//              finalArr = result;
//            }else{
//              finalArr = finalArr.filter(function(item, index){
//               return result.indexOf(item) != -1;
//             });
//            }
//            promiseCount++;
//            console.log("final array: \n",finalArr);
//            console.log("------------------------");
//
//           if(promiseCount == queryArr.length){
//             console.log("promise ends....");
//             var finalProductsArr = [];
//
//             console.log("final sorted array with unique id is: \n",finalArr);
//             var i = 0;
//             var getValue = function (){
//               if(i<=finalArr.length){
//                 client.get("products:"+finalArr[i], function(error, reply){
//                   if(error){
//                     console.log("getting error when retrieving the product by get products by id: ",err);
//                   }
//                   else{
//                     i++;
//                     getValue();
//                     finalProductsArr.push(JSON.parse(reply));
//
//                   }
//                 })
//               }
//               else{
//                 if(finalProductsArr.length == 0){
//
//                   res.json({"data": "NO PRODUCTS MATCHED THE FILTERATION ATTRIBUTES." });
//
//                 }else{
//
//                   res.json({"data": finalProductsArr });
//
//                 }
//               }
//             };
//             getValue();
//           }
//        }).catch(function( err ){
//           console.log("error in promise: ",err);
//        });
//      }
//      // ----------------- end iterating over the query string to match pattern ----------------------
//
// }


exports.filter = function(req, res ){
  console.log("calling filter fun in filter products file...");
  var finalArr = [];
  var promiseCount = 0;
  var pageNo;
  var maxValuePerPage = 2;
     //console.log("req.query object : ",req.query);
     //console.log("object length: ",Object.keys(req.query).length);
     // ----------------  start create the query string  -----------------
     var queryArr = [];
     for(var x in req.query){
       if(x == "page"){
         pageNo = req.query[x];
       }else{
         queryArr.push({"name" : x, "value": req.query[x].split(",")});
       }
       //console.log("qurey arr: ", queryArr);
     }

     // ----------------  end create the query string  -----------------
     // ---------------- start iterating over the query string to match pattern ------------------

     for(var i=0; i<queryArr.length; i++){
       var p;
       // ---------------- start fetching products ids from redis with pattern color  ------------------
        if(queryArr[i].name == 'display_price'){ // ---------------- start fetching products ids from redis with pattern price  ------------------
         console.log("------query string matched with price-----");
         //var tmp = queryArr[i].value.split(",");

        //  var start = parseInt(tmp[0]);
        //  var end = parseInt(tmp[1]);

         var start = parseInt(queryArr[i].value[0]);
         var end = parseInt(queryArr[i].value[1]);

         console.log("start: "+start+" end: "+end);
         p = new Promise(function(resolve, reject){
           client.exists("product:Display_price:Index", function(err, reply){
               if(err){
                 console.log("product:Display_price:Index does not exists...");
               }else{
                 console.log("product:Display_price:Index exists...");
                 client.ZRANGEBYLEX("product:Display_price:Index","["+start,"["+end, function(err, result){
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

       }else{
         var indexName, indexPropertyName;
         console.log("=======calling promises except display_price....=======");
         p = new Promise(function(resolve, reject ){
           if(queryArr[i].value.length == 1){
             indexName = queryArr[i].name.charAt(0).toUpperCase()+queryArr[i].name.substr(1).toLowerCase();
                 indexPropertyName = queryArr[i].value[0].trim().replace(/\s+/g, "").toLowerCase();
                 console.log("in case of query string value 1..");
                 console.log("index name",indexName);
                 console.log("index property name: ",indexPropertyName);
                 client.hvals("product:"+indexName+":Index:"+indexPropertyName, function(err, result){
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
              indexName = queryArr[i].name.charAt(0).toUpperCase()+queryArr[i].name.substr(1).toLowerCase();
              indexPropertyName = queryArr[i].value[index].trim().replace(/\s+/g, "").toLowerCase();
              var indexValue = queryArr[i].value;
              console.log("index value: ",indexValue);
              var getIndexIds = function(){
                if(index < len){
                  console.log("index name",indexName);
                  indexPropertyName = indexValue[index].trim().replace(/\s+/g, "").toLowerCase();
                  console.log("index property name: ",indexPropertyName);
                   client.hvals("product:"+indexName+":Index:"+indexPropertyName, function(err, result){
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

            var i = 0;
            var getValue = function (){
              if(indexStart <= indexEnd ){
                client.get("products:"+finalArr[indexStart], function(error, reply){
                  if(error){
                    console.log("getting error when retrieving the product by get products by id: ",err);
                  }else{
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

                  res.json({"data": finalProductsArr });

                }
              }
            };
            getValue();
          }
       }).catch(function( err ){
          console.log("error in promise: ",err);
       });
     }
     // ----------------- end iterating over the query string to match pattern ----------------------

}
