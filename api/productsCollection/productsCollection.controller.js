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
  console.log('Connected to redis server  in api/productsCollection /productsCollection.js');
})

exports.getCollection = function(req, response){
  var pageNo = 1, queryArr = [];
  var permalink, productType,productVariant;
  var finalProductsArr = [];
  var maxValuePerPage = 15;
  var total_count,tmpPages,pages,indexStart,indexEnd,current_page_count=0;
  var collectionFlag = 0, collectionVariantFlag=0;
  var filterCollectionFlag = 0;
  var promiseCount = 0, finalArr = [];
  var sortType = "default";


  console.log("calling the products collection from redis..");
  console.log("query: ",req.query);
  for(var key in req.query ){
    if(key == "permalink"){
      permalink = req.query[key].split("/");
      console.log("permalink: ",req.query[key]);
      if(permalink.length == 1){
        console.log("permalink : ",permalink);
        productType = permalink[0].toLowerCase();
        collectionFlag = 1;
      }else{
        productType = permalink[0].toLowerCase();
        productVariant = permalink[1].toLowerCase();
        console.log("prod type:",permalink[0]);
        console.log("prod variant: ",permalink[1]);
        collectionVariantFlag = 1;
      }

    }else if(key == "page"){
      pageNo = parseInt(req.query[key]);
    }else if(key == "sort"){
      sortType = req.query[key].toLowerCase();
    }else{
      queryArr.push({"name" : key, "value": req.query[key].split(",")});
    }
  }
  console.log("permalink: ",permalink);
  console.log("queryArr: \n\n\n\n",queryArr);

  if(queryArr.length == 0){
      filterCollectionFlag = 0;
  }else{
      filterCollectionFlag = 1;
  }

    if(filterCollectionFlag == 0){
    if(collectionFlag){
      client.hvals("product:"+productType+":index", function(err, res){
        if(err){
          console.log("error in fetching collection from redis...");
        }
        if(res){
          if(res.length == 0){
              console.log("no products in this collection..");
              response.json({"msg": "NO PRODUCTS FOUND IN THIS COLLECTION."});

          }else{
            console.log("total count of collection: "+productType+"  is: "+res.length);
            indexStart = (pageNo - 1 ) * maxValuePerPage;
            indexEnd = (pageNo * maxValuePerPage);
            tmpPages = parseInt(res.length / maxValuePerPage);
            console.log("tmppages: ",tmpPages);
            total_count = res.length;
            console.log("collection length: ",total_count);

            if(total_count <= maxValuePerPage){
              pages = 1;
            }else{
              if((total_count % maxValuePerPage) == 0){
                pages = tmpPages;
              }else{
                pages = tmpPages + 1;
                //indexEnd = indexStart + (total_count % maxValuePerPage);
              }
            }

            var i = 0;
            var getValue = function (){
              if(indexStart <= indexEnd ){
                client.get("products:"+res[indexStart], function(error, reply){
                  if(error){
                    console.log("getting error when retrieving the product from redis: ",err);
                  }else{
                      indexStart++;
                      getValue();
                      if(reply != null ){
                        current_page_count++;
                        finalProductsArr.push(JSON.parse(reply));
                      }
                    //i++;

                  }
                })
              }
              else{
                  console.log("count: ",maxValuePerPage);
                  console.log("total count: ",total_count);
                  console.log("current page: ",pageNo);
                  console.log("pages: ",pages);
                  console.log("carruent page count: ",current_page_count);
                  console.log("start: ",indexStart);
                  console.log("end: ",indexEnd);
                  //console.log("products: ", finalProductsArr);
                  response.json({"count": current_page_count,"per_page": maxValuePerPage,"total_count": total_count, "total_pages": pages,"current_page": pageNo,"products": finalProductsArr});
              }
            };
            getValue();
          }
        }
      });

    }

    if(collectionVariantFlag){
      client.hvals("product:"+productType+":"+productVariant+":index", function(err, res){
        if(err){
          console.log("error in fetching collection from redis...");
        }
        if(res){
          if(res.length == 0){
              console.log("no products in this collection..");
              response.json({"msg": "NO PRODUCTS FOUND IN THIS COLLECTION."});

          }else{
            indexStart = (pageNo - 1 ) * maxValuePerPage;
            indexEnd = (pageNo * maxValuePerPage);
            tmpPages = parseInt(res.length / maxValuePerPage);
            console.log("tmppages: ",tmpPages);
            total_count = res.length;
            console.log("collection length: ",total_count);

            if(total_count <= maxValuePerPage){
              pages = 1;
            }else{
              if((total_count % maxValuePerPage) == 0){
                pages = tmpPages;
              }else{
                pages = tmpPages + 1;
                //indexEnd = indexStart + (total_count % maxValuePerPage);
              }
            }

            var i = 0;
            var getValue = function (){
              if(indexStart <= indexEnd ){
                client.get("products:"+res[indexStart], function(error, reply){
                  if(error){
                    console.log("getting error when retrieving the product from redis: ",err);
                  }else{
                      indexStart++;
                      getValue();
                      if(reply != null ){
                        current_page_count++;
                        finalProductsArr.push(JSON.parse(reply));
                      }
                    //i++;

                  }
                })
              }
              else{
                  console.log("count: ",maxValuePerPage);
                  console.log("total count: ",total_count);
                  console.log("current page: ",pageNo);
                  console.log("pages: ",pages);
                  console.log("carruent page count: ",current_page_count);
                  console.log("start: ",indexStart);
                  console.log("end: ",indexEnd);
                  //console.log("products: ", finalProductsArr);
                  response.json({"count": current_page_count,"per_page": maxValuePerPage,"total_count": total_count, "total_pages": pages,"current_page": pageNo,"products": finalProductsArr});
              }
            };
            getValue();
          }
        }
      });

    }

  }// end of fetch product without filteration
    if(filterCollectionFlag == 1){
      console.log("processing the filteration on collection api...");
      for(var i=0; i<queryArr.length; i++){
        var p;
        if(queryArr[i].name == 'display_price'){ // ---------------- start fetching products ids from redis with pattern price  ------------------
         console.log("------query string matched with price-----");
         var start = parseInt(queryArr[i].value[0]);
         var end = parseInt(queryArr[i].value[1]);

         console.log("price start: "+start+" price end: "+end);
         console.log("permalink: ",permalink);
         console.log("hash name:: "+"product:"+productType+":"+productVariant+":display_price:index");
         p = new Promise(function(resolve, reject){
           client.exists("product:"+productType+":"+productVariant+":display_price:index", function(err, reply){
               if(err){
                 console.log("product:Display_price:Index does not exists...");
               }else{
                 console.log("product:Display_price:Index exists...");
                 client.ZRANGEBYLEX("product:"+productType+":display_price:index","["+start,"["+end, function(err, result){
                         if(err){
                           console.log("when retrieving price from product price index error: ",err);
                         }else{
                           console.log("price search result: ",result);
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
                 //console.log("hash name:: "+"product:"+permalink[0]+":"+permalink[1]+":"+indexName+":index:"+indexPropertyName);
                 client.hvals("product:"+productType+":"+indexName+":index:"+indexPropertyName, function(err, result){
                     if(err){
                         console.log("error getting product: "+indexName+" :Index of: "+indexPropertyName+" ",err);
                     }
                     if(result){
                         console.log("getting result for indexname: "+indexName+" and property name: ",indexPropertyName+" is sucessfull...");
                         //console.log("sucessfull result is: ",result);
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
                  //console.log("hash name: "+"product:"+permalink[0]+":"+permalink[1]+":"+indexName+":index:"+indexPropertyName);
                   client.hvals("product:"+productType+":"+indexName+":index:"+indexPropertyName, function(err, result){
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

       p.then(function(result){


         if(promiseCount == 0){
           finalArr = result;
         }else{
           finalArr = finalArr.filter(function(item, index){
            return result.indexOf(item) != -1;
          });
         }
         promiseCount++;


         if(promiseCount == queryArr.length){
           console.log("final sorted array with unique id is: \n",finalArr);
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

                 response.json({"data": "NO PRODUCTS MATCHED THE FILTERATION ATTRIBUTES." });

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

                 response.json({"count": current_page_count,"total_count": total_count,"current_page": pageNo, "per_pages": maxValuePerPage ,"pages": pages,"products": finalProductsArr});

               }
             }
           };
           // check condition for no products in the current page
           if(indexStart > finalArr.length ){
             var msg = "NO PRODUCTS FOUND IN THE CURRENT PAGE: "+pageNo;
             response.json({"data": msg });

           }else{
             getValue();
           }

         }

       }).catch(function( err ){
          console.log("error in promise: ",err);
       });
     }// end of for loop to itarate the query string..
    }

}


// exports.getCollection = function(req, response){
//   var page = 1;
//   var permalink, productType,productVariant;
//   var finalProductsArr = [];
//   var maxValuePerPage = 15;
//   var total_count,tmpPages,pages,indexStart,indexEnd,current_page_count=0;
//
//   console.log("calling the products collection from redis..");
//   console.log("query: ",req.query);
//   for(var key in req.query ){
//     if(key == "permalink"){
//       permalink = req.query[key].split("/");
//       console.log("permalink: ",req.query[key]);
//       productType = permalink[0].toLowerCase();
//       productVariant = permalink[1].toLowerCase();
//     }else if(key == "page"){
//       page = req.query[key];
//     }
//   }
//   console.log("collection keys: ","product:"+productType+":"+productVariant+":index");
//   client.hvals("product:"+productType+":"+productVariant+":index", function(err, res){
//     if(err){
//       console.log("error in fetching collection from redis...");
//     }
//     if(res){
//       if(res.length == 0){
//           console.log("no products in this collection..");
//           response.json({"msg": "NO PRODUCTS FOUND IN THIS COLLECTION."});
//
//       }else{
//         indexStart = (page - 1 ) * maxValuePerPage;
//         indexEnd = (page * maxValuePerPage);
//         tmpPages = parseInt(res.length / maxValuePerPage);
//         console.log("tmppages: ",tmpPages);
//         total_count = res.length;
//         console.log("collection length: ",total_count);
//
//         if(total_count <= maxValuePerPage){
//           pages = 1;
//         }else{
//           if((total_count % maxValuePerPage) == 0){
//             pages = tmpPages;
//           }else{
//             pages = tmpPages + 1;
//           }
//         }
//
//         var i = 0;
//         var getValue = function (){
//           if(indexStart <= indexEnd ){
//             client.get("products:"+res[indexStart], function(error, reply){
//               if(error){
//                 console.log("getting error when retrieving the product from redis: ",err);
//               }else{
//                   indexStart++;
//                   current_page_count++;
//                   getValue();
//                   if(reply != null ){
//                     finalProductsArr.push(JSON.parse(reply));
//                   }
//                 //i++;
//
//               }
//             })
//           }
//           else{
//               console.log("count: ",maxValuePerPage);
//               console.log("total count: ",total_count);
//               console.log("current page: ",page);
//               console.log("pages: ",pages);
//               //console.log("products: ", finalProductsArr);
//               response.json({"count": current_page_count-1,"per_page": maxValuePerPage,"total_count": total_count, "total_pages": pages,"current_page": page,"products": finalProductsArr});
//           }
//         };
//         getValue();
//       }
//     }
//   });
//
// }
