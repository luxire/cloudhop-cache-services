var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require('compression');

var routes = require('./routes/index');
var users = require('./routes/users');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compression());


// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));

// Increased the limit of JSON parse to 5mb. Done by Manish
app.use(bodyParser.json({limit: '5mb'}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
require('./route')(app);
//require('./createRedisIndex/weaveTypeIndex');
require('./createRedisIndex/storeProducts');
require('./createRedisIndex/productNameSearch');


//require('./createRedisIndex/transparencyIndex');
require('./createDynamicIndexing/dynamicIndexing');
require('./createDynamicIndexing/createCollection');





var server = require('http').createServer(app);
var cfg = {
 port: "9090",
 ip: "0.0.0.0"
}

server.listen(cfg.port, cfg.ip, function () {
  console.log('Express server listening on port :%d ', cfg.port, ' in ', app.get('env'), ' mode');
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


//module.exports = app;

// Expose app
exports = module.exports = app;
