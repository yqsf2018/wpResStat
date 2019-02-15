const path = require('path');
const config = require('config');
var winston = require('winston');
winston.emitErrs = true;
let logCfg = config.get("logCfg");

//var datetime = new Date();
var datetime = new Date().toISOString().replace(/-|:|\..+/g, '').replace('T', '_');
var fileName = path.join(logCfg.path ,datetime+'.log');

var logger = new winston.Logger({
    transports: [
        new winston.transports.File({
            level: 'debug',
            filename: fileName,
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

logger.info("Logger initialized!");

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.debug(message);
    }
};
