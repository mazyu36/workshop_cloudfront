import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApiConstruct } from './construct/restapi';
import { MediaConstruct } from './construct/media';
import { DistributionConstruct } from './construct/distribution';

export interface WorkshopCloudfrontStackProps extends cdk.StackProps {
  mediaSecretValue: string;
  restApiKeyValue: string;
  publicKeyValue: string;
  privateKeyValue: string;
  cloudFrontKeypairId: string;
  websiteDomain: string;
}

export class WorkshopCloudfrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WorkshopCloudfrontStackProps) {
    super(scope, id, props);

    const media = new MediaConstruct(this, 'MediaConstruct', {
      mediaSecretValue: props.mediaSecretValue
    })

    const restApi = new RestApiConstruct(this, 'RestApiConstruct', {
      assetId: media.assetId,
      restApiKeyValue: props.restApiKeyValue,
      privateKeyValue: props.privateKeyValue,
      cloudFrontKeypairId: props.cloudFrontKeypairId,
      websiteDomain: props.websiteDomain
    })

    new DistributionConstruct(this, 'DistributionConstruct', {
      videoOriginDomain: media.videoOriginDomain,
      mediaSecret: media.mediaSecret,
      restApi: restApi.restApi,
      restApiKeyValue: props.restApiKeyValue,
      publicKeyValue: props.publicKeyValue,
    })
  }
}
