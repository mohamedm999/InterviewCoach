import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogMetadata {
  action: string;
  entityType: string;
}

export const AuditLog = (action: string, entityType: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, entityType } as AuditLogMetadata);
