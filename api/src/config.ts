import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const serverConfig = {
  get port() { return parseInt(process.env.PORT || '4000', 10); },
  get jwtSecret() { return process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-mode-only-secret' : 'finathon-ledgersense-jwt-session-secret-2026-production'); },
  get databaseUrl() { return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || ''; },
  get novaApiKey() { return process.env.NOVA_API_KEY || ''; },
  get novaBaseUrl() { return process.env.NOVA_BASE_URL || 'https://www.aczen.in/nova-api/v1'; },
  get adminUsername() { return process.env.ADMIN_USERNAME || 'admin'; },
  get adminPassword() { return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'test' ? 'admin123' : 'Admin@Ledger2026!'); },
  get demoMerchantId() { return process.env.DEMO_MERCHANT_ID || 'm_demo_finathon'; },
  get redisUrl() { return process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL || ''; },
  get awsRegion() { return process.env.AWS_REGION || 'us-east-1'; },
  get s3Bucket() { return process.env.S3_BUCKET_NAME || 'finathon-ledgersense-artifacts'; },
  get dynamoTable() { return process.env.DYNAMODB_TABLE_NAME || 'finathon-reconcile-locks'; },
  get bedrockModelId() { return process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0'; },
  get novaMode() {
    return (process.env.NODE_ENV === 'production' && process.env.NOVA_MODE === 'demo')
      ? 'unconfigured'
      : (process.env.NOVA_MODE || 'unconfigured');
  },
};

export const config = serverConfig;

