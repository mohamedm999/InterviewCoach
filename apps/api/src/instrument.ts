import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import appConfig from './config/app.config';

const config = appConfig();
const nodeEnv = config.nodeEnv;

// Initialize Sentry as early as possible
Sentry.init({
  dsn: config.sentry.dsn,
  environment: nodeEnv,

  // Performance Monitoring
  tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,

  // Profiling
  profilesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
  integrations: [nodeProfilingIntegration()],

  // Send structured logs to Sentry
  enableLogs: true,

  // Send default PII data (IP addresses, etc.)
  sendDefaultPii: true,

  // Release tracking (optional)
  release: process.env.npm_package_version,
});
