exports.handler = (event, context, callback) => {
    
    console.log(event);

    let body = {};
    body.Method = event.requestContext.httpMethod;
    body.Path = event.requestContext.path;
    body.headers = event.headers;
    body.Time = event.requestContext.requestTimeEpoch;


    var response = {
        "statusCode": 200,
        "headers": {
          "Content-Type": "application/json"
        },
        "isBase64Encoded": false,
        "body": JSON.stringify(body),
    };
    callback(null, response);

};
