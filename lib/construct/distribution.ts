import { Construct } from 'constructs';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_s3_deployment as s3deploy } from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_cloudfront_origins as origins } from 'aws-cdk-lib';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';

export interface DistributionConstructProps {
  videoOriginDomain: string
  mediaSecret: secretsmanager.Secret
  restApi: apigateway.RestApi
  restApiKeyValue: string
  publicKeyValue: string
}

export class DistributionConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DistributionConstructProps) {
    super(scope, id);

    // CloudFrontのログ出力用バケット
    const logBucket = new s3.Bucket(this, 'LoginBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
    })

    // オリジン（S3）を作成
    const originBucket = new s3.Bucket(this, 'OriginBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    const s3Origin = new origins.S3Origin(originBucket)

    // オリジン（API GW）を作成
    const apiOrigin = new origins.RestApiOrigin(props.restApi, {
      originPath: '',
      // ワークショップの'Origin access control' で追加
      customHeaders: {
        'X-API-Key': props.restApiKeyValue
      }
    })

    // オリジン（Elemental Media Package）を作成
    const videoOrigin = new origins.HttpOrigin(cdk.Fn.select(2, cdk.Fn.split("/", props.videoOriginDomain)), {
      // ワークショップの'Origin access control' で追加
      customHeaders: {
        'X-MediaPackage-CDNIdentifier': props.mediaSecret.secretValueFromJson('MediaPackageCDNIdentifier').unsafeUnwrap()
      }
    })

    // オリジンリクエストポリシーを作成
    const forwardCfHeaderCookie = new cloudfront.OriginRequestPolicy(this, 'Forward-CF-header-cookie', {
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('CloudFront-Viewer-Country'),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
    })

    // キャッシュポリシーを作成
    const ttl5to15CachePolicy = new cloudfront.CachePolicy(this, 'TestCachePolicy', {
      comment: 'Set customized TTL of 5 to 15 seconds',
      minTtl: cdk.Duration.seconds(5),
      maxTtl: cdk.Duration.seconds(15),
      defaultTtl: cdk.Duration.seconds(10)
    })

    // ワークショップの 'Private access control - Signed cookie'で追加
    const publicKey = props.publicKeyValue;
    const pubKey = new cloudfront.PublicKey(this, 'CloudFront-Workshop-Public-Key', {
      encodedKey: publicKey,
    });

    const keyGroup = new cloudfront.KeyGroup(this, 'CloudFront-Workshop-Key-Group', {
      items: [
        pubKey,
      ],
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Improve Your Architecture With Amazon CloudFront',
      enabled: true,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: s3Origin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED // 'Static Contents' で追加
      },
      logBucket: logBucket,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      geoRestriction: cloudfront.GeoRestriction.allowlist('JP'), // 'Client access control - CloudFront geo restriction' で追加
      additionalBehaviors: {
        // ワークショップの 'Controlling TTL from CloudFront' で追加
        ['/api/sessionvalue']: {
          origin: apiOrigin,
          cachePolicy: new cloudfront.CachePolicy(this, 'Session-Cookie-In-Key', {
            comment: `Cookie 'cloudfront-workshopSessionId' added in cache key`,
            minTtl: cdk.Duration.seconds(30),
            maxTtl: cdk.Duration.seconds(30),
            defaultTtl: cdk.Duration.seconds(30),
            cookieBehavior: cloudfront.CacheCookieBehavior.allowList('cloudfront-workshopSessionId')
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          originRequestPolicy: forwardCfHeaderCookie,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS
        },
        // ワークショップの 'Stale contents' で追加
        ['/api/teststaleobject']: {
          origin: apiOrigin,
          cachePolicy: ttl5to15CachePolicy,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS
        },
        ['/api/*']: {
          origin: apiOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          originRequestPolicy: forwardCfHeaderCookie,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS
        },
        ['/out/*']: {
          origin: videoOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
          trustedKeyGroups: [keyGroup]  // ワークショップの 'Private access control - Signed cookie'で追加
        },
        // ワークショップの 'Controlling TTL from CloudFront' で追加
        ['/test/cache.test']: {
          origin: s3Origin,
          cachePolicy: ttl5to15CachePolicy
        },
      },
      // ワークショップの 'Custom error page' で追加
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(30),
        }
      ]
    })


    // WebコンテンツをS3にデプロイ
    new s3deploy.BucketDeployment(this, 'WebsiteDeploy', {
      sources: [s3deploy.Source.asset("./lib/origin_contents")],
      destinationBucket: originBucket,
      distribution: distribution,
      distributionPaths: ["/*"],
    })



    // ------- ワークショップの 'Origin failover' で追加 -----
    // failover用のオリジンを作成
    const failoverBucket = new s3.Bucket(this, 'FailoverBucket', {
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    const failoverOrigin = new origins.S3Origin(failoverBucket)

    // 403, 404の時はfailoverが行われるようオリジングループを設定
    const originGroup = new origins.OriginGroup({
      primaryOrigin: s3Origin,
      fallbackOrigin: failoverOrigin,
      fallbackStatusCodes: [403, 404]
    })

    // ビヘイビアを追加し、/test/failover.txtへのアクセス時にfailoverが行われるよう設定
    distribution.addBehavior('/test/failover.txt', originGroup, {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
    })

    // failover用コンテンツをデプロイ
    new s3deploy.BucketDeployment(this, 'FailoverDeploy', {
      sources: [s3deploy.Source.asset("./lib/failover_contents")],
      destinationBucket: failoverBucket,
      distribution: distribution,
      distributionPaths: ["/*"],
    })
  }
}