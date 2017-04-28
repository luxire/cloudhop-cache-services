'use strict';
var redis =  require('redis');
var client = redis.createClient();
var lodash = require('lodash');
var http = require('request');
var constants = require('../../config/constant');
var product_search = require('../../search/products');


var MyEventEmitter = require('events').EventEmitter;

var input_params = ['id', 'name', 'taxonomy', 'color', 'weave_type', 'pattern', 'transparency', 'wrinkle_resistance', 'season', 'brand', 'no_of_color', 'material_and_weave_type'];
var color_mapping = {
    'white': "white,cream,yellow",
    'pink': "pink,purple,violet",
    'blue': "blue,navy",
    'black': "grey,black",
    'brown': "brown,tan",
    'green': "green",
    'orange': "orange,red"
}



exports.products = function(req, res){
    var myEventEmitter = new MyEventEmitter();
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
            multiple_scan[key] = val.toLowerCase().split(',');
            val = "*";
        }
        return val.toLowerCase().trim();
    };

    var request   = req.body;
    multiple_scan = {};
    var request_string = "";
    for(var i in input_params){
        if(request[input_params[i]]){
            if(input_params[i] === 'color'){
                var required_colors = request[input_params[i]].split(',');                
                request[input_params[i]] = "";
                for(var color in required_colors){
                    if(color< required_colors.length-1){
                        request[input_params[i]] = request[input_params[i]] + color_mapping[required_colors[color]] + ',';
                    }
                    else{
                        request[input_params[i]] = request[input_params[i]] + color_mapping[required_colors[color]] ;
                    }
                }
            }
            else if(input_params[i] === 'no_of_color' && request[input_params[i]].indexOf('+') !== -1){
                var required_no = request[input_params[i]].split(',');
                request[input_params[i]] = "";
                for (var count in required_no){
                    if(required_no[count].indexOf('+') != -1){
                        required_no.splice(count, 1);
                        required_no = required_no.concat([4,5,6,7,8,9,10]);
                    }
                }
                request[input_params[i]] = required_no.join(',');
            }            
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
    var per_page = parseInt(request["per_page"]) || 15;
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
                // console.log('response', response_object.length);

                response.json(response_object);
            });
            fetchProduct(0, productIds, products);
        }
        else{
            // console.log('response', response_object);
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
                // console.log('computed array for intersection', output_multi_arr);
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
               console.log('multi scan', multiple_scan);
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


exports.sync = function(req, res){
    console.log("timestamp @received", Date.now(), "body", req.body);
    var product_ids = JSON.parse(req.body).ids;//expecting array of ids
    http.get({
       uri:  constants.spree.host+constants.spree.products+'?per_page='+product_ids.length+'&ids='+product_ids.toString()
    }, function(err, response, body){
        if(err){
            console.log(err);
            res.status(500).send(error.syscall);
        }
        else{
            console.log("timestamp @product fetched", Date.now())
            var products = JSON.parse(body).products;
            for(var i=0;i<products.length;i++){
                product_search.updateIndex(products[i]);
            };
            res.status(200).send("Sync in progress..");
        }
    });
    
};
