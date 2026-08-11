import { describe, expect, it } from 'vitest';
import { ConditionEvaluator, RuleGroupNode } from './condition-evaluator';
import { ConfigService } from '@/core/config/config.service';
import { Logger } from '@/core/logger/logger';

describe('ConditionEvaluator JSON Rule Tree Interpreter', () => {
  const logger = new Logger();
  const config = new ConfigService(logger);
  config.init({
    apiKey: 'test-key',
    userId: 'usr_123',
    userTraits: {
      role: 'admin',
      plan: 'enterprise',
      loginCount: 15,
      department: 'engineering',
    },
  });
  const evaluator = new ConditionEvaluator(config);

  it('evaluates single condition nodes correctly', () => {
    expect(
      evaluator.evaluate({
        type: 'userAttr',
        field: 'role',
        operator: 'equals',
        value: 'admin',
      }),
    ).toBe(true);

    expect(
      evaluator.evaluate({
        type: 'userAttr',
        field: 'loginCount',
        operator: 'gt',
        value: 10,
      }),
    ).toBe(true);

    expect(
      evaluator.evaluate({
        type: 'userAttr',
        field: 'department',
        operator: 'in',
        value: ['product', 'engineering', 'design'],
      }),
    ).toBe(true);
  });

  it('evaluates nested AND / OR group nodes correctly', () => {
    const ruleTree: RuleGroupNode = {
      op: 'AND',
      conditions: [
        {
          type: 'userAttr',
          field: 'plan',
          operator: 'equals',
          value: 'enterprise',
        },
        {
          op: 'OR',
          conditions: [
            { type: 'userAttr', field: 'role', operator: 'equals', value: 'guest' },
            { type: 'userAttr', field: 'role', operator: 'equals', value: 'admin' },
          ],
        },
      ],
    };

    expect(evaluator.evaluate(ruleTree)).toBe(true);
  });
});
