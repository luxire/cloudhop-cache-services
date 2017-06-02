'use strict';
var redis =  require('redis');
var constantFilePath =  path.resolve(process.cwd(), 'config', 'constant.js');
var env = require(constantFilePath);
var client = redis.createClient(env.redisConf);
var lodash = require('lodash');
