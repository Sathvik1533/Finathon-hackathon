import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'finathon-secret-jwt-key-2026',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:Sathvik1533v@localhost:5432/postgres',
  novaApiKey: process.env.NOVA_API_KEY || '',
  novaBaseUrl: process.env.NOVA_BASE_URL || 'https://api.novapayments.example/v1',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  demoMerchantId: process.env.DEMO_MERCHANT_ID || 'm_demo_finathon',
  redisUrl: process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL || ''
};

