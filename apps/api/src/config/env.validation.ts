type EnvRecord = Record<string, unknown>;

function requireString(
  config: EnvRecord,
  key: string,
  errors: string[],
): string | undefined {
  const value = config[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  errors.push(`${key} is required`);
  return undefined;
}

function requirePositiveInteger(
  config: EnvRecord,
  key: string,
  errors: string[],
): number | undefined {
  const raw = config[key];
  const value = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);

  if (Number.isFinite(value) && value > 0) {
    return value;
  }

  errors.push(`${key} must be a positive integer`);
  return undefined;
}

function parseBoolean(
  config: EnvRecord,
  key: string,
  defaultValue: boolean,
  errors: string[],
): boolean {
  const value = config[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  errors.push(`${key} must be "true" or "false"`);
  return defaultValue;
}

export function validateEnv(config: EnvRecord): EnvRecord {
  const errors: string[] = [];
  const nodeEnv =
    typeof config.NODE_ENV === 'string' && config.NODE_ENV.length > 0
      ? config.NODE_ENV
      : 'development';
  const isTest = nodeEnv === 'test';
  const logLevel =
    typeof config.LOG_LEVEL === 'string' && config.LOG_LEVEL.length > 0
      ? config.LOG_LEVEL
      : 'info';

  requirePositiveInteger(config, 'PORT', errors);
  requireString(config, 'DATABASE_URL', errors);

  if (!isTest) {
    requireString(config, 'APP_URL', errors);
    requireString(config, 'CORS_ORIGINS', errors);
    requireString(config, 'JWT_ACCESS_SECRET', errors);
    requireString(config, 'JWT_REFRESH_SECRET', errors);
  }

  if (!['error', 'warn', 'log', 'debug', 'verbose'].includes(logLevel)) {
    errors.push(
      'LOG_LEVEL must be one of: error, warn, log, debug, verbose',
    );
  }

  const llmEnabled = parseBoolean(
    config,
    'LLM_COACHING_ENABLED',
    false,
    errors,
  );
  if (llmEnabled) {
    const provider =
      typeof config.LLM_PROVIDER === 'string' && config.LLM_PROVIDER.length > 0
        ? config.LLM_PROVIDER
        : 'openrouter';

    if (provider !== 'openrouter') {
      errors.push(`LLM_PROVIDER "${provider}" is not supported`);
    }

    requirePositiveInteger(config, 'LLM_TIMEOUT_MS', errors);
    requireString(config, 'OPENROUTER_API_KEY', errors);
    requireString(config, 'OPENROUTER_BASE_URL', errors);
  }

  const mailHost =
    typeof config.MAIL_HOST === 'string' && config.MAIL_HOST.trim().length > 0;
  const mailUser =
    typeof config.MAIL_USER === 'string' && config.MAIL_USER.trim().length > 0;
  const mailPassword =
    typeof config.MAIL_PASSWORD === 'string' &&
    config.MAIL_PASSWORD.trim().length > 0;

  if (!isTest && nodeEnv !== 'development' && (mailHost || mailUser || mailPassword)) {
    if (!mailHost || !mailUser || !mailPassword) {
      errors.push(
        'MAIL_HOST, MAIL_USER, and MAIL_PASSWORD must all be set together outside development',
      );
    }

    requireString(config, 'MAIL_FROM', errors);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return config;
}
