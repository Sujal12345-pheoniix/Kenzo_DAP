/**
 * Universal JSON Rule Tree Evaluator (URL, user attributes, enterprise attributes, device, segments).
 * Supports nested AND/OR groups and operators (equals, contains, startsWith, regex, in, gt, lt, exists, not_exists).
 * @module core/conditions
 */

import type { IConditionEvaluator, IConfigService } from '@/core/interfaces';
import type { DisplayCondition, UrlRule } from '@/types';

export interface RuleConditionNode {
  type?: 'url' | 'userAttr' | 'enterpriseAttr' | 'device' | 'customJs' | 'trait' | 'role' | 'plan' | 'user' | string;
  field?: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'startsWith' | 'regex' | 'in' | 'gt' | 'lt' | 'exists' | 'not_exists';
  value?: any;
  traitKey?: string;
}

export interface RuleGroupNode {
  op: 'AND' | 'OR';
  conditions: (RuleConditionNode | RuleGroupNode)[];
}

export type SegmentationRule = RuleGroupNode | RuleConditionNode | DisplayCondition[];

export class ConditionEvaluator implements IConditionEvaluator {
  constructor(private readonly config: IConfigService) {}

  /**
   * Evaluate a generic JSON rule tree or legacy conditions against current SDK context.
   */
  evaluate(ruleTree?: SegmentationRule | null, customContext?: Record<string, any>): boolean {
    if (!ruleTree) return true;

    // Handle legacy array of DisplayCondition
    if (Array.isArray(ruleTree)) {
      return this.evaluateConditions(ruleTree as DisplayCondition[]);
    }

    const context = this.buildContext(customContext);

    // Group Node
    if ('op' in ruleTree && Array.isArray((ruleTree as RuleGroupNode).conditions)) {
      const group = ruleTree as RuleGroupNode;
      if (group.conditions.length === 0) return true;

      if (group.op === 'OR') {
        return group.conditions.some((child) => this.evaluate(child as SegmentationRule, customContext));
      }
      return group.conditions.every((child) => this.evaluate(child as SegmentationRule, customContext));
    }

    // Single Condition Node
    if ('operator' in ruleTree) {
      return this.evaluateSingleNode(ruleTree as RuleConditionNode, context);
    }

    return true;
  }

  evaluateUrlRules(rules: UrlRule[]): boolean {
    if (!rules || rules.length === 0) return true;
    return rules.some((rule) => this.matchUrlRule(rule));
  }

  evaluateConditions(conditions: DisplayCondition[]): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((condition) => this.evaluateCondition(condition));
  }

  private buildContext(customContext?: Record<string, any>): Record<string, any> {
    const config = this.config.isReady() ? this.config.get() : null;
    const traits = config?.userTraits || {};
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);

    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      userId: config?.userId || '',
      device: isMobile ? 'mobile' : 'desktop',
      userAttr: traits,
      enterpriseAttr: traits,
      traits: traits,
      role: traits['role'] || traits['userRole'] || '',
      plan: traits['plan'] || traits['accountPlan'] || '',
      ...customContext,
    };
  }

  private evaluateSingleNode(node: RuleConditionNode, context: Record<string, any>): boolean {
    const fieldKey = node.field || node.traitKey || node.type || 'url';
    
    let actualValue: any;
    if (fieldKey in context) {
      actualValue = context[fieldKey];
    } else if (context.traits && fieldKey in context.traits) {
      actualValue = context.traits[fieldKey];
    } else if (node.type === 'url') {
      actualValue = context.url;
    } else if (node.type === 'device') {
      actualValue = context.device;
    }

    return this.compare(actualValue, node.operator, node.value);
  }

  private matchUrlRule(rule: UrlRule): boolean {
    const rawTarget = typeof window !== 'undefined' 
      ? (rule.matchFullUrl ? window.location.href : window.location.pathname)
      : '';
    const target = rule.matchFullUrl ? rawTarget : (rawTarget.replace(/\/+$/, '') || '/');
    const rawPattern = (rule.pattern || '').trim();
    const pattern = rule.matchFullUrl ? rawPattern : (rawPattern ? rawPattern.replace(/\/+$/, '') : '');

    if (pattern === '*' || pattern === 'all' || !pattern) return true;

    if (pattern === '/' || pattern === '') {
      if (rule.type === 'exact') {
        return target === '/' || target === '/index.html' || target === '/sandbox.html' || target === '';
      }
      return target.startsWith('/');
    }

    switch (rule.type) {
      case 'exact':
        return target === pattern;
      case 'contains':
        return target.includes(pattern);
      case 'startsWith':
        return target.startsWith(pattern);
      case 'regex':
        try {
          return new RegExp(pattern).test(target);
        } catch {
          return false;
        }
      default:
        return target.includes(pattern);
    }
  }

  private evaluateCondition(condition: DisplayCondition): boolean {
    const context = this.buildContext();
    const key = condition.traitKey || condition.field;
    let actual: any = context[key];
    if (actual === undefined && context.traits) {
      actual = context.traits[key];
    }
    return this.compare(actual, condition.operator, condition.value);
  }

  private compare(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return String(actual) === String(expected);
      case 'not_equals':
        return String(actual) !== String(expected);
      case 'contains':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.toLowerCase().includes(expected.toLowerCase())
          : false;
      case 'startsWith':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.toLowerCase().startsWith(expected.toLowerCase())
          : false;
      case 'regex':
        try {
          return new RegExp(String(expected), 'i').test(String(actual));
        } catch {
          return false;
        }
      case 'in':
        if (Array.isArray(expected)) {
          return expected.includes(actual);
        }
        if (typeof expected === 'string') {
          return expected.split(',').map(s => s.trim()).includes(String(actual));
        }
        return false;
      case 'gt':
        return Number(actual) > Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'exists':
        return actual !== undefined && actual !== null && actual !== '';
      case 'not_exists':
        return actual === undefined || actual === null || actual === '';
      default:
        return false;
    }
  }
}
