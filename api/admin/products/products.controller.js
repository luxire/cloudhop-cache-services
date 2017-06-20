'use strict';
var redis =  require('redis');
var constantFilePath =  path.resolve(process.cwd(), 'config', 'constant.js');
var env = require(constantFilePath);
var client = redis.createClient(env.redisConf);
client.auth(process.env.NODE_REDIS_PASSWORD);
var lodash = require('lodash');
