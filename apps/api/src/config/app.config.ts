function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Invalid boolean value "${value}" in environment configuration`);
}

function parseInteger(
  value: string | undefined,
  defaultValue: number,
  field: string,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${field} value "${value}" in environment configuration`);
  }

  return parsed;
}

function parseLlmProvider(value: string | undefined): 'openrouter' {
  const provider = value || 'openrouter';
  if (provider !== 'openrouter') {
    throw new Error(`Unsupported LLM_PROVIDER "${provider}"`);
  }

  return provider;
}

export default () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'InterviewCoach',
  appUrl:
    process.env.APP_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : undefined),

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },

  // CORS
  cors: {
    origins:
      process.env.CORS_ORIGINS?.split(',') ||
      (process.env.NODE_ENV === 'development'
        ? ['http://localhost:3001']
        : undefined),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Email
  mail: {
    mailtrapToken: process.env.MAILTRAP_TOKEN,
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from:
      process.env.MAIL_FROM ||
      (process.env.NODE_ENV === 'development'
        ? 'noreply@interviewcoach.app'
        : undefined),
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // LLM Coaching (MANDATORY for analysis creation)
  llm: {
    enabled: parseBoolean(process.env.LLM_COACHING_ENABLED, true), // Enabled by default
    provider: parseLlmProvider(process.env.LLM_PROVIDER),
    model: process.env.LLM_MODEL || 'openai/gpt-4o-mini',
    timeoutMs: parseInteger(
      process.env.LLM_TIMEOUT_MS,
      30000, // Increased timeout for coaching generation
      'LLM_TIMEOUT_MS',
    ),
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    },
  },

  // Sentry
  sentry: {
    dsn: process.env.SENTRY_DSN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },

  // Swagger
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || 'api/docs',
  },

  // Rate Limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '1048576', 10),
    destination: process.env.UPLOAD_DEST || './uploads',
  },
});
