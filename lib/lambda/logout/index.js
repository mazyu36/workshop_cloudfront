exports.handler = async (event, context, callback) => {
    
    let response = {
        statusCode: 200,
        headers: {
            "content-type": "application/json",
            "set-cookie": process.env.cookieName+"=; Max-Age=0"
        },
        isBase64Encoded: false,
        body: "{\"result\":\"successfully logged out\"}"
    };

    callback(null,response);
};