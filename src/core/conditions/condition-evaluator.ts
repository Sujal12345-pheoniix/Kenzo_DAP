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
    const target = rule.matchFullUrl ? window.location.href : window.location.pathname;

    switch (rule.type) {
      case 'exact':
        return target === rule.pattern;
      case 'contains':
        return target.includes(rule.pattern);
      case 'startsWith':
        return target.startsWith(rule.pattern);
      case 'regex':
        try {
          return new RegExp(rule.pattern).test(target);
        } catch {
          return false;
        }
      default:
        return false;
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
      case 'custom':
        return true;
      default:
        return false;
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
