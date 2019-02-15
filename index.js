const express = require('express')
    ,fs = require('fs')
    ,path = require('path')
    ,https = require('https')
    ,util = require('util')
    ,config = require('config')
    // ,token=require('./utils/tokenHandler')
    // ,auth = require('./routes/auth')
    ,logger = require('./utils/logger')
    ,bodyParser = require('body-parser')
    ,methodOverride = require('method-override');

var dbg = require('debug')('main');
let app, srvPort, cfg;

let dflt404Handler = function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  res.send({
      message: "Specified URL not found",
      error: "Not_Found"
  });
};

let dfltErrHandler = function(err, req, res, next) {
  let curEnv = app.get('env');
  console.log(util.format('running in %s env', curEnv));
  dbg('Err handers(): ', req);
  res.status(err.status || 500);
  logger.error("Encounter error: "+err.message);
};

const dfltHandlers = {
  err404:dflt404Handler
  , errMisc:dfltErrHandler
};

let validateRestCfg = function (restCfg) {
  // TODO: add validation for rest config
  return null;
};

let validateSvcCfg = function (restCfg) {
  // TODO: add validation for svc configuration
  return null;
};

let loadAppCfg = function (appCfg) {
  let err = null;
  if (null == appCfg) {
    appCfg = './config/wcsCfg.js';
  }
  dbg('loadAppCfg(): Using Server Config:', appCfg);
  let cfgStat = fs.statSync(appCfg);
  do {
    /* if (!cfgStat.isFile()){
      err = 'no application config';
      break;
    }*/
    cfg = config.get('srv');

    dbg('loadAppCfg(): cfg=',cfg);
    if ('restful' in cfg) {
      err = validateRestCfg (cfg.restful);
    }
    else {
      err = 'no valid Rest Server config';
    }
    if (err) {
      break;
    }
    if ('svcSet' in cfg) {
      err = validateSvcCfg (cfg.svcSet);
    }
    else {
      err = 'no valid service config';
    }
  }while(false);
  return err;
};

let validateOneItem = function (funcSet, itemName, itemType) {
  if (itemName in funcSet) {
    if ('function' == typeof funcSet[itemName]) {
      dbg('Found ',itemName, ' as ', itemType);
      return null;
    }
  }
  return util.format('Missing %s as %s', itemName, itemType);
}

let validateHandlers = function(funcSet) {
  let totErr = "";
  try{
    Object.keys(dfltHandlers).forEach(function(hKey){
      err = validateOneItem(funcSet, hKey, typeof dfltHandlers[key]);
      if (err) {
        dbg("validateHandlers(): ", err);
        totErr += err + '\n';
      }
    });
    if (0==totErr.length) {
      return null;
    }
    else {
      return totErr;
    }
  }catch(e) {
    totErr = util.format("invalid handler set, %s", funcSet);
    dbg("validateHandlers(): ", totErr);
    return totErr;
  }
};

exports.createAppSrv = function (app_handlers, cb, appCfg = null, wpSrvCfg=null) {
  if (null == wpSrvCfg) {
    wpSrvCfg = '../../config/wpSvcCfg';
  }

  let err = loadAppCfg(appCfg);
  if (err) {
    cb(err, appCfg);
  }

  let restHandlers = dfltHandlers;

  if (null == validateHandlers(app_handlers)) {
    dbg('createAppSrv(): using custom app handlers');
    restHandlers = app_handlers;
  }

  let svcCfg = cfg.svcSet;

  app = express();
  // CORS (Cross-Origin Resource Sharing) headers to support Cross-site HTTP requests
  app.all('*', function(req, res, next) {
      res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Access-Control-Allow-Headers,X-Requested-With");
      next();
  });

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
      extended: true
  }));
  app.use(methodOverride());      // simulate DELETE and PUT
  // app.use('/auth', auth);
  dbg('svcCfg', svcCfg, Object.keys(svcCfg));
  Object.keys(svcCfg).forEach(function(key) {
    let svc = svcCfg[key];
    let svcEP = '/' + key;
    let svcModLoc = './' + path.join(svc.svcPath,key);
    let rteModLoc = './' + path.join(svc.routePath,key);
    dbg(util.format('Set %s, EP=%s, rte@%s, svc@%s', key,svcEP, rteModLoc,svcModLoc));
    const svcRte = require( rteModLoc );
    app.use(svcEP, svcRte);
    let svcInst = require( svcModLoc );
    svcInst.init(wpSrvCfg, svc.setting, svc.errEnum, function(){
      dbg(key,' init: done')
      logger.info(key + ' Initialized');
    });
  })
  app.use(function(req, res, next) {
    logger.debug("req.body="+JSON.stringify(req.body));
    var contentType = req.headers['content-type'];
    //in app.js, only verify token for the request with "application/json" content-type.
    //for other type of request (e.g. multipart/form-data), verify token after the request is parsed. 
    if(contentType === 'application/json'){
        token.verify(req.body.token, req.body.apiKey, function(err, fromToken){
            if (err){
                var resp={};
                resp.status=err;
                res.status(200).send(resp);
            }else{
                if ('brand' in req.body && fromToken.brand != 'allBrands' && fromToken.brand != req.body.brand) {
                    console.log("app.use(), " + JSON.stringify(fromToken));
                    usrms.authorizedBrand(fromToken.username, req.body.brand, function(err){
                        if (err) {
                            var resp={};
                            resp.status = err;
                            res.status(200).send(resp);
                        } else {
                            //req.body.brand = fromToken.brand;
                            delete fromToken.brand;
                            Object.keys(fromToken).forEach(function(key){
                              req.body[key] = fromToken[key];
                            });
                            delete req.body.token;
                            next();      
                        }
                    });
                } else {
                    //req.body.brand = fromToken.brand;
                    delete fromToken.brand;
                    Object.keys(fromToken).forEach(function(key){
                        req.body[key] = fromToken[key];
                    });
                    delete req.body.token;
                    next();
                }
            }
        });
      } else {
          next();
      } 
  });
  // catch 404 and forward to error handler
  app.use(restHandlers.err404);

  /* error handlers */

  /* development error handler
   will print stacktrace
   */
  app.use(restHandlers.err404);
  app.use(restHandlers.errMisc);

  cb(null);
  return null;
};

exports.runAppSrv = function(srvStartup) {
  let restCfg = cfg.restful;
  let srvPort = restCfg.port;
  if (true == restCfg.fSecure) {
    let srvCert=restCfg.cert;
    dbg('Starting HTTPS at ', srvPort);
    https.createServer({
      key: fs.readFileSync(path.join(srvCert.path, srvCert.keyfile)),
      cert: fs.readFileSync(path.join(srvCert.path, srvCert.certfile))
    }, app).listen(srvPort, srvStartup);
  }
  else {
    dbg('Starting HTTP at ', srvPort);
    app.listen(srvPort, srvStartup);
  }
};


