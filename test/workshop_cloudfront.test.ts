import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WorkshopCloudfrontStack } from '../lib/workshop_cloudfront-stack';
import { devParameter } from '../parameter';

test('Snapshot Test', () => {
  const app = new cdk.App();
  const stack = new WorkshopCloudfrontStack(app, "WorkshopCloudfrontStack", {
    mediaSecretValue: devParameter.mediaSecretValue,
    restApiKeyValue: devParameter.restApiKeyValue,
    publicKeyValue: devParameter.publicKeyValue,
    privateKeyValue: devParameter.privateKeyValue,
    cloudFrontKeypairId: devParameter.cloudFrontKeypairId,
    websiteDomain: devParameter.websiteDomain
  });
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

