let util = require('util');
let wca = require('../client/wpCntAgent');

let wcaToken;
let countCB = function (err, rst1, rst2) {
    console.log('countCB():', err, rst1, rst2);
    if (err) {
        if ('Exception' == err){
            console.log('countCB(), exception=', rst1, 'cntr=', rst2);
        }
        else {
            console.log('countCB(), err=', err, 'totCnt=', rst1, 'numCnt=', rst2);    
        }
    }
    else {
        console.log('countCB(), succ','totCnt=', rst1, 'numCnt=', rst2);
    }
    let cnt = Math.floor(Math.random() * 100) + 1;
    let fAcc = (Math.random()>0.6);
    let dateStr = null;
    if (Math.random()>0.5) {
        let day = Math.floor(Math.random() * 30) + 1;
        dateStr = util.format('2019-01-%d', day);
    }
    console.log('Next: Cnt=', cnt, ',fAcc=', fAcc, ',Date=', dateStr);
    setTimeout(wca.count, 1000, wcaToken, countCB, cnt, fAcc, dateStr);
}

wca.init(function(err, extra){
    if (err) {
        console.log('wca init failed, e=', err, ',extraInfo=', extra);
    }
    else {
        wcaToken = wca.regCounter('face-api-count', 'sensetime', 'wca-tester');
        console.log('wcaToken=', wcaToken);
        setTimeout(wca.count, 3000, wcaToken, countCB);
    }
});