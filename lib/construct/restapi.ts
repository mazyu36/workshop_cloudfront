import { Construct } from 'constructs';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';

export interface RestApiConstructProps {
  assetId: string;
  restApiKeyValue: string;
  privateKeyValue: string;
  cloudFrontKeypairId: string;
  websiteDomain: string;
}

export class RestApiConstruct extends Construct {
  public readonly restApi: apigateway.RestApi;
  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id);

    // --------- Lambda ----------
    const echoFunction = new lambda.Function(this, 'EchoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'returns incoming request object',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lib/lambda/echo/')
    })

    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'emulates login function',
      handler: 'index.handler',
      environment: {
        'cookieName': 'cloudfront-workshopSessionId',
        'userName': 'admin',
        'password': 'testadmin'

      },
      code: lambda.Code.fromAsset('./lib/lambda/login/')
    })

    const logoutFunction = new lambda.Function(this, 'LogoutFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'emluates logout (remove cookie)',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lib/lambda/logout/')
    })


    const sessionValueFunction = new lambda.Function(this, 'SessionValueFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'return session ID or anonymous session',
      handler: 'index.handler',
      environment: {
        'cookieName': 'cloudfront-workshopSessionId',
      },
      code: lambda.Code.fromAsset('./lib/lambda/sessionvalue/')
    })


    const getPlayUrlFunction = new lambda.Function(this, 'GetPlayUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'read the play url of mediapackage VOD',
      handler: 'index.handler',
      environment: {
        'assetId': props.assetId
      },
      code: lambda.Code.fromAsset('./lib/lambda/getplayurl/')
    })

    getPlayUrlFunction.addToRolePolicy(new iam.PolicyStatement({
      resources: [`arn:aws:mediapackage-vod:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`],
      actions: ['mediapackage-vod:List*']
    }))

    getPlayUrlFunction.addToRolePolicy(new iam.PolicyStatement({
      resources: [
        `arn:aws:mediapackage-vod:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:assets/*`,
        `arn:aws:mediapackage-vod:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:packaging-configurations/*`,
        `arn:aws:mediapackage-vod:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:packaging-groups/*`
      ],
      actions: ['mediapackage-vod:Describe*']
    }))



    const fleFunction = new lambda.Function(this, 'FleFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'shows incoming POST body as it is',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lib/lambda/fle/')
    })


    const staleObjectFunction = new lambda.Function(this, 'StaleObjectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'returns 200 OK or 5xx error based on the env variable',
      handler: 'index.handler',
      environment: {
        'statusCode': '200',
      },
      code: lambda.Code.fromAsset('./lib/lambda/staleobject/')
    })

    // ワークショップの 'Private access control - Signed cookie'で追加
    const getSignedCookieFunction = new lambda.Function(this, 'GetSignedCookieFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      description: 'sets cookie for cloudfront private content',
      handler: 'index.handler',
      environment: {
        'cloudFrontPrivateKey': props.privateKeyValue,
        'sessionDuration': '86400',
        'cloudFrontKeypairId': props.cloudFrontKeypairId,
        'websiteDomain': props.websiteDomain
      },
      code: lambda.Code.fromAsset('./lib/lambda/getsignedcookie/')
    })


    // --------- API Gateway ----------
    const api = new apigateway.RestApi(this, 'RestApi', {
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL]
      },
      deployOptions: {
        stageName: 'api'
      }
    })
    this.restApi = api

    // ワークショップの'Origin access control'で追加
    // APIキーを生成
    const apiKey = api.addApiKey('APIKey', {
      value: props.restApiKeyValue
    })
    //使用量プランを追加
    api.addUsagePlan('CloudFront-Workshop-Api-Key', {
      apiStages: [
        { stage: api.deploymentStage }
      ]
    }).addApiKey(apiKey)


    const echo = api.root.addResource('echo')
    echo.addMethod("GET", new apigateway.LambdaIntegration(echoFunction), {
      authorizationType: apigateway.AuthorizationType.NONE,
      apiKeyRequired: true // ワークショップの'Origin access control'で追加
    })

    const login = api.root.addResource('login')
    login.addMethod("POST", new apigateway.LambdaIntegration(loginFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })

    const logout = api.root.addResource('logout')
    logout.addMethod("GET", new apigateway.LambdaIntegration(logoutFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })


    const getplayurl = api.root.addResource('getplayurl')
    getplayurl.addMethod("GET", new apigateway.LambdaIntegration(getPlayUrlFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })

    const sessionvalue = api.root.addResource('sessionvalue')
    sessionvalue.addMethod("GET", new apigateway.LambdaIntegration(sessionValueFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })

    const getsignedcookie = api.root.addResource('getsignedcookie')
    getsignedcookie.addMethod("GET", new apigateway.LambdaIntegration(getSignedCookieFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })


    const fle = api.root.addResource('fle')
    fle.addMethod("POST", new apigateway.LambdaIntegration(fleFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })

    const stale = api.root.addResource('teststaleobject')
    stale.addMethod("GET", new apigateway.LambdaIntegration(staleObjectFunction), {
      authorizationType: apigateway.AuthorizationType.NONE
    })

  }
}