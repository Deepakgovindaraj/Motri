import { env } from './env';

export interface CloudStorageConfig {
  isConfigured: boolean;
  accountId: string;
  bucketName: string;
  publicUrl: string;
  endpoint: string;
}

export const cloudStorageConfig: CloudStorageConfig = {
  isConfigured: Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY),
  accountId: env.R2_ACCOUNT_ID,
  bucketName: env.R2_BUCKET_NAME,
  publicUrl: env.R2_PUBLIC_URL,
  endpoint: env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '',
};
