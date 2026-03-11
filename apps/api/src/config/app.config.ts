export default () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'InterviewCoach',
  appUrl: process.env.APP_URL || 'http://localhost:3001',

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
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Email
  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM || 'noreply@interviewcoach.app',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
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
