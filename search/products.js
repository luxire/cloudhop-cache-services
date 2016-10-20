'use strict';
var redis = require('redis');
var client = redis.createClient();
var colors = require('./colors');
console.log('colors', colors)
client.on('connect', function(){
   console.log('Connected to redis:for:search');
 });
 var format_to_store = function(val){
   if((val == null) || (val == undefined)){
     val = '';
   }
   else if((typeof val == 'boolean') || (typeof val == 'number')){
     val = val.toString();
   }
   return val.toLowerCase().trim();
 };
 
 var search_properties = {
   filter: {     //object with key as filter name and value as its source
     'id': 'id',
     'name': 'name',
     'taxonomy': 'taxons.permalink', // for array of objects,
     'color': 'luxire_product.product_color', //for attr in objects
     'weave_type': 'luxire_product.product_weave_type',
     'pattern': 'luxire_product.pattern',
     'transparency': 'luxire_product.transparency',
     'wrinkle_resistance': 'luxire_product.wrinkle_resistance',
     'season': 'luxire_product.suitable_climates',
     'brand': 'luxire_product.mill',
     'no_of_color': 'luxire_product.no_of_color'    
   },
   range: {
     
   },
   sort: {
     
   }
 };
 
 var process_value_to_store = function(product, attribute){
   if(attribute.indexOf('.') === -1){
     if (typeof product[attribute] === 'string'){
       return format_to_store(product[attribute]);
     }
     else if (typeof product[attribute] === 'number'){
       return format_to_store(product[attribute].toString());
     }
   }
   else{
     var properties = attribute.split('.');
     if(product[properties[0]] instanceof Array){
       var taxon_string = "";
       for(var i=0; i< product[properties[0]].length; i++){
         if(i != product[properties[0]].length-1){
            taxon_string += product[properties[0]][i][properties[1]];
         }
         else{
            taxon_string += product[properties[0]][i][properties[1]] + ":";
         }
       }
       return format_to_store(taxon_string);  //handling taxonomies

     }
     else if(product[properties[0]] instanceof Object){
       return format_to_store(product[properties[0]][properties[1]]);
     }
   };
 };
 function process_color_to_store(product, attribute){
   var color_string = "";
   var product_colors = product.luxire_product.product_color.split(',');
   for(var i=0;i<product_colors.length;i++){
     color_string = color_string + colors.variants[product_colors[i].toLowerCase().trim()] + ":";
     console.log('creating color var ', product_colors[i].toLowerCase().trim());
   }
   return color_string;
 }
 
 
 
 exports.createIndex = function(product){
   
   var key_to_store = "";
   for(var key in search_properties.filter){
     if(key !== 'color'){
       key_to_store += key+"::" + process_value_to_store(product, search_properties.filter[key]) + ":-:";
     }
     else{
       key_to_store += key+"::" + process_color_to_store(product, search_properties.filter[key]) + ":-:";
     }
     
   };
  //  console.log('key to store', key_to_store);
    client.zadd("productSearch", product.id, key_to_store, function(err, res){
      if(res === 0){
        console.log('create product index for', product.name, "with id",product.id, "resulted in err", err);
      }      
    });
    function store_currency(curr, val, id){
      console.log('store currency', curr, val, id)
      client.zadd("productPrice."+curr+'.index', parseFloat(val.split(",").join("")).toFixed(2), id, function(err, res){
        console.log("val to display", curr, val.split(",").join(""));
        if(err){
          console.log('create product currency index for', id,  "resulted in err", err);
        }      
      });
    };
    for(var curr in product.master.prices){
      console.log('curr', curr, 'val', product.master.prices[curr])
      switch(curr){
        case "INR" : store_currency("INR", product.master.prices["INR"].split("\u20B9")[1], product.id);
                     break;
        case "USD" : store_currency("USD", product.master.prices["USD"].split("$")[1], product.id);
                     break;
        case "EUR" : store_currency("EUR", product.master.prices["EUR"].split('\u20AC')[1], product.id);
                     break;
        case "AUD" : store_currency("AUD", product.master.prices["AUD"].split("$")[1], product.id);
                     break;
        case "SGD" : store_currency("SGD", product.master.prices["SGD"].split("$")[1], product.id);
                     break;
        case "NOK" : store_currency("NOK", product.master.prices["NOK"].split(" kr")[0], product.id);
                     break;
        case "DKK" : store_currency("DKK", product.master.prices["DKK"].split(" kr")[0], product.id);
                     break;
        case "SEK" : store_currency("SEK", product.master.prices["SEK"].split(" kr")[0], product.id);
                     break;
        case "CHF" : store_currency("CHF", product.master.prices["CHF"].split("CHF")[1], product.id);
                     break;
        case "GBP" : store_currency("GBP", product.master.prices["GBP"].split("\u00a3")[1], product.id);
                     break;
        case "CAD" : store_currency("CAD", product.master.prices["CAD"].split("$")[1], product.id);
                     break;
        
      }
    }
 };