exports.cfg = {
    /* number of received stat reports before submitting to stat Server */
    "reportInterval": 3
    /* max number of retry in case of errors during submit */
    ,"reportRetryMax": 2
    /* info of the restful interface of stat server */
    ,"statSrv":{
        "host":"restful.sample.com"
        ,"port":10000
        ,"cntPath":"/wpcnt/record"
        ,"fSSL":true
    }
};
