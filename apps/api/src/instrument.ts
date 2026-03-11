import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry as early as possible
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [nodeProfilingIntegration()],
  
  // Send structured logs to Sentry
  enableLogs: true,
  
  // Send default PII data (IP addresses, etc.)
  sendDefaultPii: true,
  
  // Release tracking (optional)
  release: process.env.npm_package_version,
});
