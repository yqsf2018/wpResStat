let dbg = require('debug')('wp-jwt-auth');
let config = require('config');
let util = require('util');
let rest = require('node-rest-client');

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

let rc = new Client(restOptions);

exports.updateAuthToken = function (host, user, pswd, cb) {
    let arg_post_req = {
        headers: { 
            "Content-Type": "application/json"
        }
        ,data: {
            "username":user
            ,"password":pswd
        }
    };
    let cloudSvr = host + '/wp-json/jwt-auth/v1/token';
    rc.post(cloudSvr, arg_post_req, function (body, response) {
        dbg(util.format('code:%d,status:%s',response.statusCode,response.statusMessage));
        dbg('resp Body:',body);
        if ( (200 == response.statusCode) && ('token' in body) ) {
            cb(null, body);
        }
        else {
            cb(body.code, util.format('errCode=%d, errMsg=%s', body.data.status, body.message));
        }
    });
}

exports.validateAuthToken = function (host, authToken, cb) {
    var arg_post_req = {
        headers: { 
            "Authorization": "Bearer "+authToken
        }
        ,data: {
        }
    };
    let cloudSvr = host + '/wp-json/jwt-auth/v1/token/validate';
    rc.post(cloudSvr, arg_post_req, function (body, response) {
        dbg(util.format('code:%d,status:%s',response.statusCode,response.statusMessage));
        dbg('resp:',body);
        if ( (200 == response.statusCode) && ('jwt_auth_valid_token' == body.code) ){
            cb(null);
        }
        else {
            cb(body.code);
        }
    });
}

