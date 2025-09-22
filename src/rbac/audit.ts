import { eventStore } from '../events/store';
import { getCurrentUser, type Role } from './roles';

export interface AuditEvent {
  action: string;
  resource: string;
  details?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuditEventPayload extends AuditEvent {
  userId: string;
  userRole: Role;
  userName: string;
  timestamp: number;
}

/**
 * Audit logger for business owner actions
 * Creates audit.logged events for compliance and security tracking
 */
export class AuditLogger {
  
  /**
   * Log a business owner action for audit purposes
   */
  log(auditEvent: AuditEvent): void {
    const user = getCurrentUser();
    if (!user) {
      console.warn('Audit log attempted without authenticated user');
      return;
    }

    const payload: AuditEventPayload = {
      ...auditEvent,
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      ipAddress: 'client-side' // In real app, get from server
    };

    try {
      // Create audit event with idempotency key based on user, action, and timestamp
      const idempotencyKey = `audit:${user.id}:${auditEvent.action}:${payload.timestamp}`;
      
      eventStore.append('audit.logged', payload, {
        key: idempotencyKey,
        params: { userId: user.id, action: auditEvent.action, timestamp: payload.timestamp },
        aggregate: { id: user.id, type: 'user' }
      });

      console.log(`[AUDIT] ${user.role} ${user.name} performed action: ${auditEvent.action} on ${auditEvent.resource}`);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // In production, this should alert/fail gracefully
    }
  }

  /**
   * Log feature flag changes
   */
  logFeatureFlagChange(flagName: string, previousValue: boolean, newValue: boolean, scope: 'global' | 'user' = 'user') {
    this.log({
      action: 'feature_flag_change',
      resource: `feature_flags.${flagName}`,
      details: { scope, flagName },
      previousValue,
      newValue
    });
  }

  /**
   * Log oversell policy changes
   */
  logOversellPolicyChange(previousPolicy: string, newPolicy: string, scope: 'global' | 'user' = 'user') {
    this.log({
      action: 'oversell_policy_change',
      resource: 'inventory.oversell_policy',
      details: { scope },
      previousValue: previousPolicy,
      newValue: newPolicy
    });
  }

  /**
   * Log replication configuration changes
   */
  logReplicationAction(action: 'start' | 'stop' | 'configure', details: Record<string, any> = {}) {
    this.log({
      action: `replication_${action}`,
      resource: 'system.replication',
      details
    });
  }

  /**
   * Log role changes
   */
  logRoleChange(targetUserId: string, targetUserName: string, previousRole: Role, newRole: Role) {
    this.log({
      action: 'user_role_change',
      resource: `users.${targetUserId}`,
      details: { targetUserId, targetUserName },
      previousValue: previousRole,
      newValue: newRole
    });
  }

  /**
   * Log system configuration changes
   */
  logSystemConfigChange(configKey: string, previousValue: any, newValue: any) {
    this.log({
      action: 'system_config_change',
      resource: `system.config.${configKey}`,
      details: { configKey },
      previousValue,
      newValue
    });
  }

  /**
   * Log configuration export
   */
  logConfigExport(exportType: 'settings' | 'flags' | 'full_backup', details: Record<string, any> = {}) {
    this.log({
      action: 'config_export',
      resource: `system.export.${exportType}`,
      details
    });
  }

  /**
   * Log configuration import
   */
  logConfigImport(importType: 'settings' | 'flags' | 'full_restore', details: Record<string, any> = {}) {
    this.log({
      action: 'config_import',
      resource: `system.import.${importType}`,
      details
    });
  }

  /**
   * Log security-related actions
   */
  logSecurityAction(action: string, resource: string, details: Record<string, any> = {}) {
    this.log({
      action: `security_${action}`,
      resource: `security.${resource}`,
      details
    });
  }

  /**
   * Get audit trail for a specific user or resource
   */
  getAuditTrail(filters: {
    userId?: string;
    resource?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}) {
    const allEvents = eventStore.getAll();
    
    return allEvents
      .filter(event => event.type === 'audit.logged')
      .filter(event => {
        const payload = event.payload as AuditEventPayload;
        
        if (filters.userId && payload.userId !== filters.userId) return false;
        if (filters.resource && !payload.resource.includes(filters.resource)) return false;
        if (filters.action && payload.action !== filters.action) return false;
        if (filters.fromDate && event.at < filters.fromDate.getTime()) return false;
        if (filters.toDate && event.at > filters.toDate.getTime()) return false;
        
        return true;
      })
      .sort((a, b) => b.at - a.at); // Most recent first
  }

  /**
   * Get audit summary statistics
   */
  getAuditSummary(fromDate?: Date, toDate?: Date) {
    const trail = this.getAuditTrail({
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate })
    });
    const actionCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const resourceCounts = new Map<string, number>();

    for (const event of trail) {
      const payload = event.payload as AuditEventPayload;
      
      // Count by action
      actionCounts.set(payload.action, (actionCounts.get(payload.action) || 0) + 1);
      
      // Count by user
      const userKey = `${payload.userName} (${payload.userRole})`;
      userCounts.set(userKey, (userCounts.get(userKey) || 0) + 1);
      
      // Count by resource
      resourceCounts.set(payload.resource, (resourceCounts.get(payload.resource) || 0) + 1);
    }

    return {
      totalEvents: trail.length,
      dateRange: { fromDate, toDate },
      topActions: Array.from(actionCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topUsers: Array.from(userCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      topResources: Array.from(resourceCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
    };
  }
}

// Singleton audit logger instance
export const auditLogger = new AuditLogger();
