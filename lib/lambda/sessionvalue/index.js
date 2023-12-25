exports.handler = async (event, context, callback) => {
    
    let response = {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "isBase64Encoded": false
    };
    
    var headerCookie = event.headers.Cookie?event.headers.Cookie:event.headers.cookie;
    var sessionvalue = null;
    headerCookie && headerCookie.split(';').forEach((cookie) => {
        if(cookie.split('=').shift().trim() == process.env.cookieName) {
            var cookiestring = cookie.replace(cookie.split('=').shift().trim()+'=','');
            var cookievalue = Buffer(cookiestring,'base64').toString().split('||');
            sessionvalue = 'Session ID:' + cookievalue[0] + ' Login Time:' + cookievalue[1];
        }
    });
    
    if(sessionvalue) {
        response.body = "{\"result\":\""+sessionvalue+"\"}";
    } 
    else { // anonymous
        response.body = "{\"result\":\"Anonymous session\"}";
    }
    callback(null,response);
};