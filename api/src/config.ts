import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
dotenv.config();

const productionSecret = (name: string, localValue: string): string => {
  const configured = process.env[name]?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be configured in the production environment`);
  }
  return localValue;
};

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: productionSecret('JWT_SECRET', randomBytes(32).toString('hex')),
  databaseUrl: productionSecret('DATABASE_URL', ''),
  novaApiKey: process.env.NOVA_API_KEY || '',
  novaBaseUrl: process.env.NOVA_BASE_URL || 'https://www.aczen.in/nova-api/v1',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  demoMerchantId: process.env.DEMO_MERCHANT_ID || 'm_demo_finathon',
  redisUrl: process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  s3Bucket: process.env.S3_BUCKET_NAME || 'finathon-ledgersense-artifacts',
  dynamoTable: process.env.DYNAMODB_TABLE_NAME || 'finathon-reconcile-locks',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0',
};
