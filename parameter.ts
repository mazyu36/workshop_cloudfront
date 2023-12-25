export interface AppParameter {
  restApiKeyValue: string;  // 20文字以上が条件
  mediaSecretValue: string; // 8文字以上の必要あり
  publicKeyValue: string;   // パブリックキーは全体を貼り付ける
  privateKeyValue: string;  // プライベートキーはBEGINとENDの行は除いたものを貼り付ける
  // 以下は循環参照対策。
  cloudFrontKeypairId: string;  // deploy後に生成されたCloudFrontのキーペアIDを設定
  websiteDomain: string;  // deploy後に生成されるCloudFrontのドメインを設定
}


export const devParameter: AppParameter = {
  restApiKeyValue: 'FAE13507-4FF2-4797-B90F-3328A83D1B3A',
  mediaSecretValue: 'C87201E8-12AB-4834-9843-08CD99E55F60',
  publicKeyValue:
    `-----BEGIN PUBLIC KEY-----
DUMMY
-----END PUBLIC KEY-----`,
  privateKeyValue: `DUMMY`,
  cloudFrontKeypairId: 'CLOUDFRONT_KEYPAIR_ID',
  websiteDomain: 'CLOUDFRONT_DOMAIN',

};