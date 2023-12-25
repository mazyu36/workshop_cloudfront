import { Construct } from 'constructs';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_mediapackage as mediapackage } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_s3_deployment as s3deploy } from 'aws-cdk-lib';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';

export interface MediaConstructProps {
  mediaSecretValue: string;
}

export class MediaConstruct extends Construct {
  public readonly assetId: string;
  public readonly videoOriginDomain: string;
  public readonly mediaSecret: secretsmanager.Secret;
  constructor(scope: Construct, id: string, props: MediaConstructProps) {
    super(scope, id);

    // メディアコンテンツ格納用のS3バケットを作成してデプロイ
    const videoBucket = new s3.Bucket(this, 'VideoBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    const videoDeploy = new s3deploy.BucketDeployment(this, 'VideoBucketDeployment', {
      sources: [s3deploy.Source.asset("./lib/media_contents")],
      destinationBucket: videoBucket,
    })


    // メディアパッケージ用のロールを作成
    const s3PolicyDocument = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ['arn:aws:s3:::*/*'],
          actions: [
            's3:GetObject'
          ],
        }),
        new iam.PolicyStatement({
          resources: ['arn:aws:s3:::*'],
          actions: [
            's3:GetBucketRequestPayment',
            's3:ListBucket',
            's3:GetBucketLocation'
          ],
        }),
      ]
    })

    const mediaPackageRole = new iam.Role(this, 'MediaPackageRole', {
      assumedBy: new iam.ServicePrincipal('mediapackage.amazonaws.com'),
      inlinePolicies:
      {
        's3-access': s3PolicyDocument
      }
    })


    const mediaPackageSecretPolicyDocument = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ['*'],
          actions: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret',
            'secretsmanager:ListSecrets',
            'secretsmanager:ListSecretVersionIds'
          ],
        }),
        new iam.PolicyStatement({
          resources: ['*'],
          actions: [
            'iam:GetRole',
            'iam:PassRole'
          ],
        }),
      ]
    })

    const mediaPackageSecretReadRole = new iam.Role(this, 'MediaPackageSecretReadRole', {
      assumedBy: new iam.ServicePrincipal('mediapackage.amazonaws.com'),
      inlinePolicies:
      {
        'secretmanager-access': mediaPackageSecretPolicyDocument
      }
    })


    const mediaSecret = new secretsmanager.Secret(this, 'MediaSecret', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      secretObjectValue: {
        "MediaPackageCDNIdentifier": SecretValue.unsafePlainText(props.mediaSecretValue)
      }
    })
    this.mediaSecret = mediaSecret;


    // パッケージグループを作成
    const cfnPackagingGroup = new mediapackage.CfnPackagingGroup(this, 'PackagingGroup', {
      id: 'media-packaging-group',
      authorization: {
        cdnIdentifierSecret: mediaSecret.secretArn,
        secretsRoleArn: mediaPackageSecretReadRole.roleArn
      }
    });
    cfnPackagingGroup.node.addDependency(mediaSecret)
    this.videoOriginDomain = cfnPackagingGroup.attrDomainName


    const cfnPackagingConfiguration = new mediapackage.CfnPackagingConfiguration(this, 'PackagingConfiguration', {
      id: 'media-packagingconfiguration',
      packagingGroupId: cfnPackagingGroup.id,
      hlsPackage: {
        hlsManifests: [{
          manifestName: 'index',
        }],
        segmentDurationSeconds: 3
      }
    });
    cfnPackagingConfiguration.addDependency(cfnPackagingGroup)


    // アセットを作成
    const cfnAsset = new mediapackage.CfnAsset(this, 'MediaPackage', {
      id: 'media-package-asset',
      packagingGroupId: cfnPackagingGroup.id,
      sourceArn: `${videoBucket.bucketArn}/sample.smil`,
      sourceRoleArn: mediaPackageRole.roleArn
    });
    cfnAsset.addDependency(cfnPackagingGroup)
    cfnAsset.node.addDependency(mediaPackageRole)
    cfnAsset.node.addDependency(videoDeploy)

    this.assetId = cfnAsset.id


  }
}