import type { CapabilityRule, ApprovalLevel, OrbitObjectType } from '@orbitos/core-types';

export interface CheckParams {
  accessor: {
    type: 'app' | 'agent' | 'user_role';
    id: string;
  };
  scope: string;
  targetObjectType: OrbitObjectType;
  targetObjectId?: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
}

export interface CheckResult {
  allowed: boolean;
  approvalLevel: ApprovalLevel;
  reason?: string;
  matchedRuleId?: string;
}

export interface CapabilityEngine {
  grant(rule: CapabilityRule): Promise<CapabilityRule>;
  revoke(ruleId: string): Promise<boolean>;
  list(): Promise<CapabilityRule[]>;
  check(params: CheckParams): Promise<CheckResult>;
}

export function createCapabilityEngine(): CapabilityEngine {
  const rules = new Map<string, CapabilityRule>();

  return {
    async grant(rule: CapabilityRule): Promise<CapabilityRule> {
      rules.set(rule.ruleId, rule);
      return rule;
    },

    async revoke(ruleId: string): Promise<boolean> {
      return rules.delete(ruleId);
    },

    async list(): Promise<CapabilityRule[]> {
      return Array.from(rules.values());
    },

    async check(params: CheckParams): Promise<CheckResult> {
      const now = Date.now();

      // 1. Scan for matching explicitly blocked rules first (denies immediately)
      for (const rule of rules.values()) {
        if (rule.accessor.type !== params.accessor.type || rule.accessor.id !== params.accessor.id) {
          continue;
        }
        if (rule.permittedScope !== params.scope) {
          continue;
        }
        if (rule.targetObjectType !== 'all' && rule.targetObjectType !== params.targetObjectType) {
          continue;
        }
        if (
          rule.targetObjectIdConstraint !== undefined &&
          rule.targetObjectIdConstraint !== params.targetObjectId
        ) {
          continue;
        }
        if (!rule.permittedActions.includes(params.action)) {
          continue;
        }
        if (rule.expiresAt !== undefined && rule.expiresAt < now) {
          continue; // Blocked rule has expired, ignore it
        }
        if (rule.approvalLevel === 'blocked') {
          return {
            allowed: false,
            approvalLevel: 'blocked',
            reason: 'Explicitly blocked by capability rule.',
            matchedRuleId: rule.ruleId
          };
        }
      }

      // 2. Scan for matching active allow rules
      let matchedRule: CapabilityRule | null = null;
      for (const rule of rules.values()) {
        if (rule.accessor.type !== params.accessor.type || rule.accessor.id !== params.accessor.id) {
          continue;
        }
        if (rule.permittedScope !== params.scope) {
          continue;
        }
        if (rule.targetObjectType !== 'all' && rule.targetObjectType !== params.targetObjectType) {
          continue;
        }
        if (
          rule.targetObjectIdConstraint !== undefined &&
          rule.targetObjectIdConstraint !== params.targetObjectId
        ) {
          continue;
        }
        if (!rule.permittedActions.includes(params.action)) {
          continue;
        }
        if (rule.expiresAt !== undefined && rule.expiresAt < now) {
          continue; // Rule has expired, ignore it
        }

        matchedRule = rule;
        break;
      }

      if (!matchedRule) {
        return {
          allowed: false,
          approvalLevel: 'blocked',
          reason: 'No matching capability rule found. Access denied by default.'
        };
      }

      return {
        allowed: true,
        approvalLevel: matchedRule.approvalLevel,
        matchedRuleId: matchedRule.ruleId
      };
    }
  };
}
