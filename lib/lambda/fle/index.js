exports.handler = (event, context, callback) => {
    const qs = require('querystring');
    let body = qs.parse(event.body);

    let response = {
        "statusCode": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "isBase64Encoded": false,
        "body": JSON.stringify(body)
    };
    callback(null, response);
};