'use strict';
var redis =  require('redis');
var client = redis.createClient();
var lodash = require('lodash');
var MyEventEmitter = require('events').EventEmitter;
var myEventEmitter = new MyEventEmitter();
var input_params = ['id', 'name', 'taxonomy', 'color', 'weave_type', 'pattern', 'transparency', 'wrinkle_resistance', 'season', 'brand'];




exports.products = function(req, res){
    var multiple_scan = {};
    var output_multi_arr = {};
    var temp1 = [];
    var temp2 = [];
    var id = "";
    var query_string = "";
    
    var process_input_request = function(key, val){
        if((val == null) || (val == undefined)){
        val = '';
        }
        else if((typeof val == 'boolean') || (typeof val == 'number')){
            val = val.toString();
        }
        if(val.indexOf(',') !== -1){
            multiple_scan[key] = val.split(',');
            val = "*";
        }
        return val.toLowerCase().trim();
    };

    var request   = req.body;
    multiple_scan = {};
    console.log('req body', req.body);
    var request_string = "";
    for(var i in input_params){
        if(request[input_params[i]]){
            request_string += input_params[i] + "::*" + process_input_request(input_params[i], request[input_params[i]]) + "*:-:";
        }
        else{
           request_string += input_params[i] + "::*:-:";
        }
    };
    console.log('req string', request_string);

    var currency = request.currency ? request.currency.toUpperCase() : "USD";
    var page = parseInt(request["page"]) || 1; 
    var price_start = parseInt(request["price_start"]) || 0;
    var price_end = parseInt(request["price_end"]) || 10000000000000;
    var sort = request.sort || "asc";

    // var page = parseInt(req.query.q["page"]) || 1;
    // var name_cont = req.query.q["name_cont"] || '';
    // var taxonomy = req.query.q["taxonomy"] || '*';
    var per_page = 15;
    var response = res;
    var response_object = {
        count: 0,
        total_count: 0,
        per_page: per_page,
        current_page: page,
        pages: 0,
        taxonomies: {},
        products: [],
        currency: currency
    };
    var taxonomies = {};
    var products_union = [];
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };   
    var fetchProduct = function (index, productIds, products){
        if(index < productIds.length){
            client.get("products:"+productIds[index], function(error, reply){//productDescription to have product type
                var taxon = ""; 
                if(error){
                    console.log("getting error when retrieving the product by get products by id: ",err);
                }else{
                    index++;
                    if(reply != null ){
                        reply = JSON.parse(reply);
                        products.push(reply);                        
                    }
                    fetchProduct(index, productIds, products);
                }
            })
        }
        else{
           myEventEmitter.emit('fetched-products', products);
        }
    };
    
    var compute_response = function(redis_res){
        var productIds = [];
        var products = [];
        response_object.total_count = redis_res.length;
        response_object.pages = (response_object.total_count % per_page) == 0 ? (response_object.total_count / per_page) : parseInt(response_object.total_count / per_page)+1;
        var start = (page-1)*(per_page);
        var end = (page*per_page) -1;
        for(var i = start;i<=end&&redis_res[i];i++){
            productIds.push(redis_res[i]);
            response_object.count++;
        };
        
        if(productIds.length){
            myEventEmitter.once('fetched-products',function(products){
                response_object.products = products;
                response_object.taxonomies = taxonomies;
                console.log('response', response_object.length);

                response.json(response_object);
            });
            fetchProduct(0, productIds, products);
        }
        else{
            console.log('response', response_object);
            response.json(response_object);
        }
    };
    function get_val_from_product_string(product_string, key){
       return product_string.split(key+"::")[1].split(":-:")[0].split("*").join(""); 
    };
    function set_val_from_product_string(product_string, key, val){
        var str_split = product_string.split(key+"::");
       return str_split[0]+key+"::*"+val.trim()+"*:-:"+str_split[1].split(":-:")[1];
    };
    function count_taxonomies(product_string){
        var product_split_arr = get_val_from_product_string(product_string, "taxonomy").split(":");
        var taxon = "";
        for(var m=0;m<product_split_arr.length;m++){
            if(product_split_arr[m]){
                taxon =  capitalizeFirstLetter(product_split_arr[m].split('/')[0]);
                if(taxonomies[taxon]){
                taxonomies[taxon]++;  
                }
                else{
                    taxonomies[taxon] = 1;  
                }
            }
        };
    };
    
    if(sort === "asc"){
        client.zrangebyscore("productPrice."+currency+".index", price_start, price_end, function(err, res){
            if(res && res.length){
                output_multi_arr["sort"] = res;
            }
        });
    }
    else if(sort === "desc"){
        client.zrevrangebyscore("productPrice."+currency+".index", price_end, price_start, function(err, res){
            if(res && res.length){
                output_multi_arr["sort"] = res;
            }
        });
    }
    function compute_intersection(output_multi_arr){
        var intersection_result = [];
        intersection_result = output_multi_arr["sort"];
        delete output_multi_arr["sort"];
        for(var property in output_multi_arr){
            intersection_result = lodash.intersection(intersection_result, output_multi_arr[property])                        
        }
        return intersection_result;
    };
    function compute_multi_scan(attr, property, query_string){
        client.zscan("productSearch", "0", "count", "10000000", "match", query_string, function(err, res){
            if(res && res[1] && res[1].length){
                for(var j=0;j<res[1].length;j=j+2){
                    id = get_val_from_product_string(res[1][j], "id");
                    output_multi_arr[attr].push(id);
                };
            }
            multiple_scan[attr].splice(multiple_scan[attr].indexOf(property), 1);
            if(!multiple_scan[attr].length){
                delete  multiple_scan[attr];
            }
            if(!Object.keys(multiple_scan).length){
                console.log('computed array for intersection', output_multi_arr); 
                compute_response(compute_intersection(output_multi_arr));
            }                        
        });
    }
    
    
    
    client.zscan("productSearch", "0", "count", "10000000", "match", request_string, function(err, res){
        if(err){
            console.log("err", err);
        }
        else{
            if(res && res[1].length){
                for(var j=0;j<res[1].length;j=j+2){
                    if(request["name"] && request["name"] !== "*"){//counting taxonomies only for product search
                        count_taxonomies(res[1][j]);    
                    }
                    products_union.push(get_val_from_product_string(res[1][j], "id"));
                };
            }
           if(Object.keys(multiple_scan).length){
                output_multi_arr["base"] = products_union;
                for(var i in multiple_scan){
                    output_multi_arr[i] = [];
                    for(var prop in multiple_scan[i]){
                        query_string = set_val_from_product_string(request_string, i, multiple_scan[i][prop]);
                        compute_multi_scan(i, multiple_scan[i][prop], query_string);
                    }                                                
                }
            }
            else{
                compute_response(lodash.intersection(output_multi_arr["sort"],products_union));
            }
    
        }
    });

};