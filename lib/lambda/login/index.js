exports.handler = async (event, context, callback) => {
    
    let response = {
        "headers": {"content-type": "application/json"},
        "isBase64Encoded": false
    };
    
    //check if logged in already
    var headerCookie = event.headers.Cookie?event.headers.Cookie:event.headers.cookie;
    var cookieFound = false;
    headerCookie && headerCookie.split(';').forEach((cookie) => {
        if(cookie.split('=').shift().trim() == process.env.cookieName) {
            cookieFound = true;
        }
    });
    
    if(cookieFound) {
        response.statusCode = 200;
        response.body = "{\"result\":\"already logged in\"}";
    } 
    else {
        const qs = require('querystring');
        const body = qs.parse(event.body);

        //check username and password
        if(body.username == process.env.userName && body.password == process.env.password) {
            response.statusCode = 200;
            const crypto = require('crypto');
            let sessionId = crypto.randomBytes(20).toString('hex');
            let cookieValue = Buffer.from(sessionId+'||'+Date()).toString('base64');
            let options = '; Path=/;'
            response.headers['set-cookie'] = process.env.cookieName +'=' + cookieValue + options;
            response.body ="{\"result\":\"successful\"}";
        } 
        else {
            response.statusCode = 403;
            response.body ="{\"result\":\"invalid username or password\"}";
        }
    }
    callback(null,response);
};
