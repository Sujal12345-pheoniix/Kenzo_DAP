/**
 * URL and trait condition evaluator for flow/step targeting.
 * @module core/conditions
 */

import type { IConditionEvaluator, IConfigService } from '@/core/interfaces';
import type { DisplayCondition, UrlRule } from '@/types';

export class ConditionEvaluator implements IConditionEvaluator {
  constructor(private readonly config: IConfigService) {}

  evaluateUrlRules(rules: UrlRule[]): boolean {
    if (!rules || rules.length === 0) return true;

    return rules.some((rule) => this.matchUrlRule(rule));
  }

  evaluateConditions(conditions: DisplayCondition[]): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((condition) => this.evaluateCondition(condition));
  }

  private matchUrlRule(rule: UrlRule): boolean {
    const rawTarget = rule.matchFullUrl ? window.location.href : window.location.pathname;
    const target = rule.matchFullUrl ? rawTarget : (rawTarget.replace(/\/+$/, '') || '/');
    const rawPattern = (rule.pattern || '').trim();
    const pattern = rule.matchFullUrl ? rawPattern : (rawPattern ? rawPattern.replace(/\/+$/, '') : '');

    // Wildcard or empty pattern matches any route
    if (pattern === '*' || pattern === 'all' || !pattern) return true;

    // Root path '/' matching
    if (pattern === '/' || pattern === '') {
      if (rule.type === 'exact') {
        return target === '/' || target === '/index.html' || target === '/sandbox.html' || target === '';
      }
      // In 'contains', 'startsWith' or default mode, '/' acts as universal/global fallback
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
    const config = this.config.isReady() ? this.config.get() : null;

    switch (condition.field) {
      case 'url':
        return this.evaluateUrlCondition(condition);
      case 'trait': {
        if (!config || !condition.traitKey) return false;
        const traitValue = config.userTraits[condition.traitKey];
        return this.compare(traitValue, condition.operator, condition.value);
      }
      case 'role': {
        if (!config) return false;
        const role = config.userTraits['role'] || config.userTraits['userRole'];
        return this.compare(role, condition.operator, condition.value);
      }
      case 'plan': {
        if (!config) return false;
        const plan = config.userTraits['plan'] || config.userTraits['accountPlan'];
        return this.compare(plan, condition.operator, condition.value);
      }
      case 'device': {
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        const device = isMobile ? 'mobile' : 'desktop';
        return this.compare(device, condition.operator, condition.value);
      }
      case 'user': {
        if (!config) return false;
        return this.compare(config.userId, condition.operator, condition.value);
      }
      case 'custom':
        return true;
      default:
        return true;
    }
  }

  private evaluateUrlCondition(condition: DisplayCondition): boolean {
    const url = window.location.href;
    return this.compare(url, condition.operator, condition.value);
  }

  private compare(
    actual: unknown,
    operator: DisplayCondition['operator'],
    expected?: string | number | boolean,
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return typeof actual === 'string' && typeof expected === 'string'
          ? actual.includes(expected)
          : false;
      case 'regex':
        return typeof actual === 'string' && typeof expected === 'string'
          ? new RegExp(expected).test(actual)
          : false;
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'not_exists':
        return actual === undefined || actual === null;
      default:
        return false;
    }
  }
}
