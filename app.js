let cntSrv = require('./index');

try{
    cntSrv.createAppSrv(null, function(err){
        if (err) {
            console.log('failed to create app server, err=', err);
            process.exit();
        }
        console.log('app srv created');
        setTimeout(cntSrv.runAppSrv, 100, function(){
            console.log('app server started')
        });
    });
}catch(e) {
    console.log('Exception in server start:', e);
}