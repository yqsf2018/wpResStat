let fs = require('fs');
let util = require('util');
let dbg = require('debug')('wca');
let rest = require('node-rest-client');
let crypto = require('crypto');

const restOptions = {
    connection: {
        rejectUnauthorized: false,
        headers: {
            "Content-Type": "application/json"
        }
    },
    requestConfig: {
        timeout: 6000,
        // noDelay: true,
        // keepAlive: true,
        // keepAliveDelay: 1000
    },
    responseConfig: {
        timeout: 6000
    }
};

let Client = rest.Client;

//let rc = new Client(restOptions);

let cntInterval = 5;
let reportRetryMax = 3;
// let statSvr = 'https://stat.tinoq.com/wpcnt/record';
let statSvr = 'https://localhost:3090/wpcnt/record';
let numCnt = 0;

let arg_post_req = {
    headers: { 
        "Content-Type": "application/json"
    }
    ,data: {
        count:0
        ,apiType: ""// "face-api-count"
        ,apiVendor:""
        ,apiCaller:""
        ,recYear:2018
        ,recMonth:11
        ,recDay:23
    }
};

let cntrSet ={};

exports.init = function( cb = null, cfgFile = '../config/wcaCfg.js') {
    /* load configuration */
    let stat = fs.statSync(cfgFile);
    if (!stat.isFile()) {
        dbg('use default values, as no config file', cfg);
    }
    else {
        try {
            let wca = require(cfgFile);
            cntInterval = wca.cfg.cntInterval;
            reportRetryMax = wca.cfg.reportRetryMax;
            dbg('wca.init(): cntInterval=',cntInterval,',reportRetryMax=',reportRetryMax);
            cb(null);
        }
        catch (e) {
            dbg('erro load config file:', cfgFile, 'err =', e);
            cb('err loading cfg', e);
            return;
        }
    }
    /* catch up previous missed reports if any */

};

let reportCnt = function(cntr, cb) {
    let post_req = {
        headers: { 
            "Content-Type": "application/json"
        }
        ,data: {
            count:cntr.countData
            ,apiType:cntr.apiType       // "face-api-count"
            ,apiVendor:cntr.apiVendor  // "sensetime"
            ,apiCaller:cntr.apiCaller
            ,recYear:cntr.recYear
            ,recMonth:cntr.recMonth
            ,recDay:cntr.recDay
            ,overWrite:cntr.fOvWr
        }
    };
    console.log('post_req=', post_req);
    let rc = new Client(restOptions);
    rc.post(statSvr, post_req, function (ret, response) {
        if('None' == ret.status) {
            cb(null, post_req.data.count);
        }
        else {
            cb(ret.status, post_req.data.count, ret.detail);
        }
    });
};

const rptCntProm = util.promisify(reportCnt);

exports.regCounter = function(apiName, apiVendor, apiCaller) {
    let b4Hash = util.format('%s-%s-%s', apiName, apiVendor, apiCaller);
    let cntrToken = crypto.createHash('md5').update(b4Hash).digest("hex");
    cntrSet[cntrToken] = {
        numCnt:0
        ,total:0
        ,countData:0
        ,apiType:apiName       // "face-api-count"
        ,apiVendor:apiVendor  // "sensetime"
        ,apiCaller:apiCaller
        ,recYear:0
        ,recMonth:0
        ,recDay:0
    };
    return cntrToken;
};

exports.count = function(cntrToken, cb, count = 1, fAcc = true, dateStr = null) {
    let ret = {
        err:null
        ,curCnt:0
    }
    dbg('count():', cntrToken, count, fAcc, dateStr);
    if (!(cntrToken in cntrSet)) {
        ret.err = 'Non-exist counter';
        if (cb) {    
            cb(ret);
        }
        return ret.err;
    }
    else {
        let cntr = cntrSet[cntrToken];
        
        if(true == fAcc) {
            cntr.total += count;
            cntr.numCnt++;
            if (cntr.numCnt < cntInterval) {
                cb(null, cntr.total, cntr.numCnt);
                return;
            }
            else {
                cntr.countData = cntr.total;
                // cntr.numCnt = 0;
                // cntr.total = 0;
            }
        }
        else {
            cntr.countData = count;
        }
        
        /* start report */
        if('string' != typeof dateStr) {
            let d = new Date();
            dateStr = d.toISOString().split('T')[0];  // 2019-02-08
        }
        let d3 = dateStr.split('-');
        if (d3.length != 3) {
            let d = new Date();
            dateStr = d.toISOString().split('T')[0];  // 2019-02-08
            d3 = dateStr.split('-');
        }
        cntr.recYear = parseInt(d3[0]);
        cntr.recMonth = parseInt(d3[1]);
        cntr.recDay = parseInt(d3[2]);
        cntr.fOvWr = fAcc?"True":"False";
        rptCntProm(cntr).then((cnt) => {
            dbg('reported r_cnt=', cnt);
            err = null;
            cntr.total = 0;
            cb(err, cnt, cntr.numCnt);
            if(fAcc){
                cntr.numCnt = 0;
            }
        }).catch((e, cnt, msg) => {
            console.log('Error in count reporting, e=', e, ',cnt=', cnt, 'msg=', msg);
            cb(e, cnt, msg);
            if(fAcc){
                cntr.numCnt = 0;
            }
        });
        
    }
};
