let dbg = require('debug')('wpCntSvc');
let fs = require('fs');
let config = require('config');
let util = require('util');
let extend = Object.assign;
let WPAPI = require( 'wpapi' );
let RSVP = require('rsvp');
let striptags = require('striptags');
let jwtCli = require('./wp-jwt-auth');

// let jwt = require('wordpress-jwt-auth');

let errEnum, svcCfg, wpCfg;

let wp = null; 
let cntCache = {};
const infoTag = ['Count Type', 'Vendor', 'CalledBy', 'RecordDate'];

let updateWpHandle = function (wpSrv, initCB) {
   let wpSvc = config.get('wpSvc');
    jwtCli.updateAuthToken(wpSvc.site, wpSvc.user, wpSvc.password
    , function(err, respData){
        if (err) {
            console.log("Failed to acquire auth token, err=", respData);
            process.exit(-1);
        }
        else {
            jwtCli.validateAuthToken(wpSvc.site, respData.token
            , function(err){
                if (err) {
                    console.log("Failed to acquire auth token, err=", respData);
                    process.exit(-1);
                }
                else {
                    console.log('Acquired Auth Token.');
                    wp = new WPAPI({ endpoint: wpSvc.ep});
                    wp.setHeaders( 'Authorization', 'Bearer ' + respData.token );
                    initCB();  
                }
            });
        }
    });
};

exports.init = function (wpSrv, cfg_svc, cfg_errenum, initCB) {
    dbg("wpCnt.init():");
    svcCfg = cfg_svc;
    errEnum = cfg_errenum;
    updateWpHandle(wpSrv, initCB);
};

exports.getErrEnum = function () {
    return errEnum;
}

exports.getVer = function (req) {
    dbg('gerVer:',wpCfg.ver);
    return wpCfg.ver;
};

let getWpId = function(req, recCB) {
    let recCnt = req.count;
    let apiType = req.apiType;
    let apiVendor = req.apiVendor;
    let apiCaller = req.apiCaller;
    let recYear = util.format('year-%d', req.recYear);
    let recMonth = util.format('month-%d', req.recMonth);
    let recDay = req.recDay;
    let fOvWr = svcCfg.updateOption;
    if ("overWrite" in req) {
        fOvWr = (req.overWrite=="True")?"REP":"ACC";
    }
    
    dbg('getWpId(): arg=', apiType, apiVendor, recYear, recMonth);

    let categoryIDs = [];
    let tagIDs = [];
    let infoSet = [];
    let title = '';
    
    RSVP.hash({
      categories: wp.categories().slug( apiType )
      ,tags1:wp.tags().slug(apiVendor)
      ,tags2:wp.tags().slug(apiCaller)
      ,tags3:wp.tags().slug(recMonth)
      ,tags4:wp.tags().slug(recYear)
    }).then(function( results ) {
        dbg('getWpId(): results=', results);
        // Combine & map .slug() results into arrays of IDs by taxonomy
        
        categoryIDs = results.categories
            .map(function( cat ) { return cat.id; });
        infoSet.push(results.categories[0].name);
        title += infoSet[0];
        let i = 1;
        while (true) {
            dbg("Tag scan:",i);
            let tagKey = util.format('tags%d', i);
            if (tagKey in results) {
                dbg("Acquire ", tagKey);
                let tags = results[tagKey].map(function( tag ) { return tag.id; });
                infoSet.push(results[tagKey][0].name);
                title += '-' + results[tagKey][0].name;
                dbg("tags=", tags);
                tagIDs = tagIDs.concat(tags);
                i++;
            }
            else {
                dbg(tagKey, " not in results");
                break;
            }
        }
        dbg("tagIDs=", tagIDs, 'title=', title);
        let posts = wp.posts().slug(title.toLowerCase());
        return posts;
    }).then(function(posts) {
        let target = {};
        if (0==posts.length) {
            target.title = title;
            target.cats = categoryIDs;
            target.tags = tagIDs;
            target.infoSet = infoSet;
            target.posts = [];
        } 
        else {
            target.infoSet = infoSet;
            target.posts = posts;
        }
        // dbg('getWpId(): posts=',posts);
        // dbg('getWpId(): recCB=',recCB);
        record2Post(target, recDay, recCnt, fOvWr, recCB);
    }).catch(function(e){
        console.log('getWpId(): e=', e);
    });
};

/*
 *  text:
 *     Day:Count
 *     1:123
 *     2:234
 *      ...
 *  cntJson:
 *   {
 *      keyName: "Day"   
 *      valName: "Count"
 *      [
 *       {1:123}
 *       ,{2:234}
 *      ...
 *     ]
 *  }
 */

let wpText2Json = function (str, lineSep, itemSep) {
    let cntJson = {
        keyName:svcCfg.indexCol
        ,valName:svcCfg.ValueCol
        ,items:[]
    };
    dbg('wpText2Json(): cntJson=', cntJson);
    let rows = striptags(str).split(lineSep);
    while('#' == rows[0][0]){
        rows.shift();
    }
    let tokens = rows[0].trim().split(itemSep);
    let skipKeys = [];
    skipKeys.push(svcCfg.sumKey);
    cntJson.keyName = tokens[0];
    cntJson.valName = tokens[1];
    for (let i=1;i<rows.length;i++) {
        let onerow = rows[i].trim();
        dbg("wpText2Json():rows=", onerow);
        if (onerow.length>0){
            tokens = onerow.split(itemSep);
            dbg("wpText2Json():tokens=", tokens);
            if ( -1 == skipKeys.indexOf(tokens[0])) {
                cntJson.items = wpCntappend(cntJson.items, parseInt(tokens[0])
                    , parseInt(tokens[1]), 'REP');
            }
        }
    }
    return cntJson;
};

let json2wpText = function (cntJson, lineSep, itemSep) {
    let str = util.format("%s%s%s", cntJson.keyName, itemSep, cntJson.valName);
    /* sort data with ascending date */
    cntJson.items.sort(function(a,b){
        return a.day - b.day;
    });
    let totalCnt = 0;
    cntJson.items.forEach(function(c){
        totalCnt += c.cnt;
        str += util.format("%s%d%s%d", lineSep, c.day, itemSep ,c.cnt);
    });
    str += util.format("%s%s%s%d", lineSep, svcCfg.sumKey
            , itemSep ,totalCnt);
    str += lineSep;
    return str;
};

let wpCntTranslate = function (dir, data) {
    let pageText, jsonData;
    let lineSep = svcCfg.lineSep;
    let tokenSep = svcCfg.tokenSep;
    if ( (0==dir) && ('string' == typeof data) ) {   /* Text2Json */
        return wpText2Json(data,lineSep,tokenSep);
    }
    else {  /* Json2Text */
        return json2wpText(data,lineSep,tokenSep);
    }
};

let wpCntappend = function(arr0, d, c, opt) {
    let arr1 = arr0;
    let fNew = true;
    if ( ('number' == typeof c) && ('number' == typeof d) ) {
        arr1.forEach(function(i){
            if ( fNew && (d == i.day) ) {
                dbg('replace ', i, ' with ', d, c);
                if ('REP' == opt) {
                    i.cnt = c;
                }
                else if ('ACC' == opt){
                    i.cnt += c;
                }
                else {
                    dbg('unknow update option', opt);
                }
                fNew = false;
            }
        });
        if (fNew){
            arr1.push({day:d, cnt:c});
        }
    }
    else {
        console.log('Error in data type: cnt = %s, day = %s', typeof c, typeof d, c, d);
    }
    return arr1;
}

let prepareForeText = function (infoSet) {
    let ft = '# ' + infoTag[0] + ': ' + infoSet[0] + '\n';
    for (let i = 1;i<infoTag.length;i++) {
        if ('RecordDate' == infoTag[i]) {
            ft += util.format('# %s: %s-%s\n',infoTag[i],infoSet[i],infoSet[i+1]);
        }
        else {
            ft += util.format('# %s: %s\n',infoTag[i],infoSet[i]);
        }
    }
    return ft;
}

let record2Post = function (target, recDay, recCnt, fOvWr, recCB) {
    // dbg("record2Post(): target=", target, recDay, recCnt, recCB);
    if ( Array.isArray(target.posts) && (target.posts.length>0) ){
        // if (0==posts.length) { /* update exising post */
            let thePost = target.posts[0];
            dbg('striping tags:',striptags(thePost.content.rendered) );
            let postJson = wpCntTranslate(0,thePost.content.rendered);
            dbg('postJson_old=', postJson);
            postJson.items = wpCntappend(postJson.items, recDay, recCnt, fOvWr);
            dbg('postJson_new=', postJson);
            thePost.content = prepareForeText(target.infoSet) + wpCntTranslate(1,postJson);
            dbg('thePost_new=', thePost);
            wp.posts().id(thePost.id).create(thePost)
                .then(function(response) {
                    console.log("Update response:", response);
                    // dbg("response type:", typeof response);
                    recCB(errEnum.ERR_NONE, response);
                })
                .catch(function(e){
                    console.log("Update error:", e);
                    dbg("error type:", typeof e);
                    recCB(errEnum.ERR_WP, e);
                });
        /*}
        else {
            console.log("Error: found duplicat posts:", posts);
            dbg("dup posts:", posts);
            recCB(errEnum.ERR_DUPLICATE, posts[0]);
        }*/
    } 
    else {  /* create a new post */
        let thePost = {
            title:target.title
            ,categories: target.cats
            ,tags: target.tags
            ,status: 'publish'
        }
        dbg('create post with ', thePost, 'and infoSet:', target.infoSet);

        let postJson = {
            keyName:"Day"
            ,valName:"Count"
            ,items:[]
        };
        postJson.items = wpCntappend(postJson.items, recDay, recCnt, 'ACC');
        thePost.content = prepareForeText(target.infoSet) + wpCntTranslate(1,postJson);
        dbg('postJson = ', postJson);
        dbg('new post = ', thePost);
        wp.posts().create(thePost)
        .then(function(response){
            console.log("Create response:", response);
            // dbg("response type:", typeof response);
            recCB(errEnum.ERR_NONE, response);
        })
        .catch(function(e){
            console.log("Create error:", e);
            dbg("error type:", typeof e);
            recCB(errEnum.ERR_WP, e);
        });
    }
};

/* assume category, tags are there */

exports.register = function(req, regCB) {
    dbg('wpcnt.register(): recv req=', req);
};

exports.record = function(req, recCB) {
    dbg('wpcnt.record(): recv req=', req);

    if( ('count' in req) && ('apiType' in req) && ('apiVendor' in req)
         && ('apiCaller' in req) && ('recYear' in req) && ('recMonth' in req)
          && ('recDay' in req) ){
        getWpId(req, recCB); /* getWpId */
    }
    else {
        setTimeout(recCB, 500, errEnum.ERR_INV_REQ, req);
    }
};
