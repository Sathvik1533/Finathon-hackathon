import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const serverConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-mode-only-secret' : ''),
  databaseUrl: process.env.DATABASE_URL || '',
  novaApiKey: process.env.NOVA_API_KEY || '',
  novaBaseUrl: process.env.NOVA_BASE_URL || 'https://www.aczen.in/nova-api/v1',
  adminUsername: process.env.ADMIN_USERNAME || (isProduction ? '' : 'admin'),
  adminPassword: process.env.ADMIN_PASSWORD || (isTest ? 'admin123' : ''),
  demoMerchantId: process.env.DEMO_MERCHANT_ID || 'm_demo_finathon',
  redisUrl: process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  s3Bucket: process.env.S3_BUCKET_NAME || 'finathon-ledgersense-artifacts',
  dynamoTable: process.env.DYNAMODB_TABLE_NAME || 'finathon-reconcile-locks',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0',
  novaMode: (process.env.NODE_ENV === 'production' && process.env.NOVA_MODE === 'demo')
    ? 'unconfigured'
    : (process.env.NOVA_MODE || 'unconfigured'),
};

export const config = serverConfig;

