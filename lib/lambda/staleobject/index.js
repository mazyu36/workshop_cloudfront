exports.handler = (event, context, callback) => {
    let body = {};
    if(process.env.statusCode=="200") {
        body.Method = event.requestContext.httpMethod;
        body.Path = event.requestContext.path;
        body.Time = event.requestContext.requestTimeEpoch;
        body.Result = "success";
    }
    else {
        body.Result = "error";
    }


    var response = {
        "statusCode": process.env.statusCode,
        "headers": {
          "Content-Type": "application/json"
        },
        "isBase64Encoded": false,
        "body": JSON.stringify(body),
    };
    callback(null, response);

};