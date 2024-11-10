import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NestedStack, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BlockPublicAccess, BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { CloudFrontWebDistribution, OriginAccessIdentity, CloudFrontAllowedMethods, CloudFrontAllowedCachedMethods } from 'aws-cdk-lib/aws-cloudfront';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { CICDStack } from './cicd-stack';

export class VolcanicLightningInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const APP_NAME = 'volcanic-lightning'

    const historyTable = new Table(this, `${APP_NAME}-table`, {
      tableName: `${APP_NAME}-history`,
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      timeToLiveAttribute: 'TTL'
    });

    const spaHostingBucket = new Bucket(this, `${APP_NAME}-hosting-bucket`, {
      bucketName: `${APP_NAME}-hosting-bucket`,
      websiteIndexDocument: 'index.html',
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const originAccessIdentity = new OriginAccessIdentity(this, `${id}-OriginAccessIdentity`);
    const appCdn = new CloudFrontWebDistribution(this, `${id}-WebsiteDistribution`, {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: spaHostingBucket,
            originAccessIdentity,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              allowedMethods: CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              cachedMethods: CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
              forwardedValues: {
                queryString: false,
                cookies: {
                  forward: 'none',
                },
              },
            },
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 403,
          responseCode: 200,
          responsePagePath: '/index.html',
          errorCachingMinTtl: 60,
        },
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: '/index.html',
          errorCachingMinTtl: 60,
        },
      ],
    });

    const githubSecret = new Secret(this, 'github-auth-secret', {
        secretName: 'github/oauth/secret'
    })

    new CICDStack(this, 'volcanic-lightning-cicd-stack', {
        spaHostingBucket,
        appName: APP_NAME,
        appCdn,
        githubSecretName: githubSecret.secretName
    })
  }
}
