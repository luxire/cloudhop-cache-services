'use strict';

var alpha_url = "https://test.store.luxire.com";
var beta_url = "https://luxire-store.cloudhop.in/";
console.log('host is ',  process.env.NODE_REDIS_HOST);
module.exports = {
  spree: {
    host: process.env.NODE_ENV === 'production' ? beta_url : alpha_url, //Spree store-Host Url for prod
    products: '/api/products',
    customerProducts: '/customized_taxons/get_taxon_details.json'
  },
  redisConf: {
    host: process.env.NODE_REDIS_HOST // The redis's server ip
  }
}
