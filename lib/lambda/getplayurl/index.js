const { MediaPackageVod } = require("@aws-sdk/client-mediapackage-vod");

exports.handler = async (event) => {
  const mp = new MediaPackageVod({});
  let response = {
    headers: { "content-type": "application/json" },
    isBase64Encoded: false,
  };

  try {
    const data = await mp.describeAsset({ Id: process.env.assetId });
    let url = data.EgressEndpoints[0].Url;
    let path = url.replace(/https\:\/\/.*\.amazonaws\.com/, "");
    response.statusCode = 200;
    response.body = JSON.stringify({ result: path });
  } catch (err) {
    response.statusCode = 500;
    response.body = JSON.stringify({ result: "Playback URL not found!" });
  }

  return response;
};
