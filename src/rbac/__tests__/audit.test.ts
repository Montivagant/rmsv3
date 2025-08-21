import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogger } from '../audit';
import { eventStore } from '../../events/store';
import { setCurrentUser, type User, Role } from '../roles';

describe('AuditLogger', () => {
  const auditLogger = new AuditLogger();
  
  const testUser: User = {
    id: 'user-123',
    name: 'Test Admin',
    role: Role.ADMIN
  };
  
  beforeEach(() => {
    eventStore.reset();
    setCurrentUser(testUser);
  });
  
  it('should log admin actions as audit events', () => {
    auditLogger.log({
      action: 'feature_flag_change',
      resource: 'feature_flags.payments',
      previousValue: false,
      newValue: true,
      details: { scope: 'user' }
    });
    
    const events = eventStore.getAll();
    expect(events).toHaveLength(1);
    
    const auditEvent = events[0];
    expect(auditEvent.type).toBe('audit.logged');
    expect(auditEvent.payload).toMatchObject({
      action: 'feature_flag_change',
      resource: 'feature_flags.payments',
      userId: 'user-123',
      userRole: 'ADMIN',
      userName: 'Test Admin',
      previousValue: false,
      newValue: true,
      details: { scope: 'user' }
    });
    
    expect(auditEvent.payload.timestamp).toBeDefined();
    expect(auditEvent.payload.userAgent).toBeDefined();
  });
  
  it('should log feature flag changes', () => {
    auditLogger.logFeatureFlagChange('payments', false, true, 'user');
    
    const events = eventStore.getAll();
    expect(events).toHaveLength(1);
    
    const auditEvent = events[0];
    expect(auditEvent.payload).toMatchObject({
      action: 'feature_flag_change',
      resource: 'feature_flags.payments',
      previousValue: false,
      newValue: true,
      details: { scope: 'user', flagName: 'payments' }
    });
  });
  
  it('should log oversell policy changes', () => {
    auditLogger.logOversellPolicyChange('block', 'allow_negative_alert', 'global');
    
    const events = eventStore.getAll();
    expect(events).toHaveLength(1);
    
    const auditEvent = events[0];
    expect(auditEvent.payload).toMatchObject({
      action: 'oversell_policy_change',
      resource: 'inventory.oversell_policy',
      previousValue: 'block',
      newValue: 'allow_negative_alert',
      details: { scope: 'global' }
    });
  });
  
  it('should log replication actions', () => {
    auditLogger.logReplicationAction('start', { 
      baseUrl: 'http://localhost:5984',
      prefix: 'rmsv3_',
      branchId: 'main'
    });
    
    const events = eventStore.getAll();
    expect(events).toHaveLength(1);
    
    const auditEvent = events[0];
    expect(auditEvent.payload).toMatchObject({
      action: 'replication_start',
      resource: 'system.replication',
      details: {
        baseUrl: 'http://localhost:5984',
        prefix: 'rmsv3_',
        branchId: 'main'
      }
    });
  });
  
  it('should log role changes', () => {
    auditLogger.logRoleChange('target-user-456', 'John Doe', Role.STAFF, Role.ADMIN);
    
    const events = eventStore.getAll();
    expect(events).toHaveLength(1);
    
    const auditEvent = events[0];
    expect(auditEvent.payload).toMatchObject({
      action: 'user_role_change',
      resource: 'users.target-user-456',
      previousValue: 'STAFF',
      newValue: 'ADMIN',
      details: {
        targetUserId: 'target-user-456',
        targetUserName: 'John Doe'
      }
    });
  });
  
  it('should retrieve audit trail with filters', () => {
    // Create multiple audit events
    auditLogger.logFeatureFlagChange('payments', false, true);
    auditLogger.logFeatureFlagChange('loyalty', false, true);
    auditLogger.logOversellPolicyChange('block', 'allow_negative_alert');
    auditLogger.logReplicationAction('start', {});
    
    // Get all audit events
    const allAudit = auditLogger.getAuditTrail();
    expect(allAudit).toHaveLength(4);
    
    // Filter by action
    const flagChanges = auditLogger.getAuditTrail({ action: 'feature_flag_change' });
    expect(flagChanges).toHaveLength(2);
    
    // Filter by resource
    const replicationEvents = auditLogger.getAuditTrail({ resource: 'system.replication' });
    expect(replicationEvents).toHaveLength(1);
    
    // Filter by user
    const userEvents = auditLogger.getAuditTrail({ userId: 'user-123' });
    expect(userEvents).toHaveLength(4); // All events by this user
  });
  
  it('should generate audit summary statistics', () => {
    // Create test events
    auditLogger.logFeatureFlagChange('payments', false, true);
    auditLogger.logFeatureFlagChange('loyalty', false, true);
    auditLogger.logOversellPolicyChange('block', 'allow_negative_alert');
    
    const summary = auditLogger.getAuditSummary();
    
    expect(summary.totalEvents).toBe(3);
    expect(summary.topActions).toContainEqual(['feature_flag_change', 2]);
    expect(summary.topActions).toContainEqual(['oversell_policy_change', 1]);
    expect(summary.topUsers).toContainEqual(['Test Admin (ADMIN)', 3]);
  });
  
  it('should handle missing user gracefully', () => {
    setCurrentUser(null);
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    auditLogger.log({
      action: 'test_action',
      resource: 'test_resource'
    });
    
    expect(consoleSpy).toHaveBeenCalledWith('Audit log attempted without authenticated user');
    expect(eventStore.getAll()).toHaveLength(0);
    
    consoleSpy.mockRestore();
  });
  
  it('should create unique idempotency keys', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    auditLogger.log({
      action: 'test_action',
      resource: 'test_resource'
    });
    
    // Try to log the same action at the same timestamp - should dedupe
    auditLogger.log({
      action: 'test_action',
      resource: 'test_resource'
    });
    
    const events = eventStore.getAll();
    expect(events).toHaveLength(1); // Should be deduped
    
    vi.restoreAllMocks();
  });
});
