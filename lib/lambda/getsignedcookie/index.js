const { getSignedCookies } = require("@aws-sdk/cloudfront-signer");

exports.handler = async function (event, context) {
  let websiteDomain = process.env.websiteDomain;
  let cloudFrontKeypairId = process.env.cloudFrontKeypairId;
  let cloudFrontPrivateKey = process.env.cloudFrontPrivateKey;
  let sessionDuration = parseInt(process.env.sessionDuration, 10);

  const regex = / /gi;
  cloudFrontPrivateKey =
    "-----BEGIN PRIVATE KEY-----\n" +
    cloudFrontPrivateKey.replace(regex, "\n") +
    "\n-----END PRIVATE KEY-----";

  let policy = JSON.stringify({
    Statement: [
      {
        Resource: "http*://" + websiteDomain + "/*",
        Condition: {
          DateLessThan: {
            "AWS:EpochTime":
              Math.floor(new Date().getTime() / 1000) + sessionDuration,
          },
        },
      },
    ],
  });

  console.log("policy", policy);

  const signedCookies = getSignedCookies({
    url: "https://" + websiteDomain + "/",
    policy: policy,
    keyPairId: cloudFrontKeypairId,
    privateKey: cloudFrontPrivateKey,
  });

  let options = "; Path=/";
  let response = {
    statusCode: 200,
    multiValueHeaders: {
      "Set-Cookie": [
        "CloudFront-Policy=" + signedCookies["CloudFront-Policy"] + options,
        "CloudFront-Key-Pair-Id=" +
          signedCookies["CloudFront-Key-Pair-Id"] +
          options,
        "CloudFront-Signature=" +
          signedCookies["CloudFront-Signature"] +
          options,
      ],
    },
    body: '{"result":"successful"}',
  };

  return response;
};
