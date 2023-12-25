#!/usr/bin / env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WorkshopCloudfrontStack } from '../lib/workshop_cloudfront-stack';
import { devParameter } from '../parameter';

const app = new cdk.App();
new WorkshopCloudfrontStack(app, 'WorkshopCloudfrontStack', {
  mediaSecretValue: devParameter.mediaSecretValue,
  restApiKeyValue: devParameter.restApiKeyValue,
  publicKeyValue: devParameter.publicKeyValue,
  privateKeyValue: devParameter.privateKeyValue,
  cloudFrontKeypairId: devParameter.cloudFrontKeypairId,
  websiteDomain: devParameter.websiteDomain
});