var express = require('express');
var router = express.Router();
let config = require('config');
let dbg = require('debug')('wpCntRte');
let wpcnt = require('../services/wpcnt/wpcnt');
let errEnum = config.get('srv.svcSet.wpcnt.errEnum');

/* GET home page. */
router.get('/', function(req, res, next) {
  dbg('wpcnt/');
  res.render('index', { title: 'Express' });
});

router.get('/ver', function(req, res){
    dbg('wpcnt/ver');
    let verStr = wpcnt.getVer(req);
    let resp = {
        status:errEnum.ERR_NONE,
        detail:"Unknown"
    };
    if ( ('string' == typeof verStr) && (verStr.length>0) ) {
        resp.detail = verStr;   
    }
    res.status(200).send(resp);
});

router.post('/record', function(req, res){
    dbg('wpcnt/record, req.body=', req.body);
    wpcnt.record(req.body, function(err, wp_resp){
        dbg('record CB, err=', ',wp_resp=', wp_resp);
        let resp = {
            status:err,
            detail:wp_resp
        };
        let httpStatus = 500;
        if ( errEnum.ERR_NONE == err ) {
            httpStatus = 200;
        }
        else if ( errEnum.ERR_DUPLICATE == err ) {
            httpStatus = 400;
        }
        res.status(httpStatus).send(resp);
    });
});

module.exports = router;
