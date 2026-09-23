import type { CheckDefinition } from './types';
import { checkCompleteness } from './completeness';
import { checkDuplicates } from './duplicates';
import { checkTypeConsistency } from './typeConsistency';
import { checkOutliers } from './outliers';
import { checkValueConsistency } from './valueConsistency';
import { checkPatternConformity } from './patternConformity';
import { checkNegativeValues } from './negativeValues';
import { checkUniqueKey } from './uniqueKey';

export const ALL_CHECKS: CheckDefinition[] = [
  {
    name: 'Completeness',
    description: 'Find null/empty values',
    run: checkCompleteness,
  },
  {
    name: 'Duplicates',
    description: 'Find duplicate rows',
    run: checkDuplicates,
  },
  {
    name: 'Type Consistency',
    description: 'Find mixed types per column',
    run: checkTypeConsistency,
  },
  {
    name: 'Outliers',
    description: 'Find statistical outliers',
    run: checkOutliers,
  },
  {
    name: 'Value Consistency',
    description: 'Find typos in categories',
    run: checkValueConsistency,
  },
  {
    name: 'Pattern Conformity',
    description: 'Find format violations',
    run: checkPatternConformity,
  },
  {
    name: 'Negative Values',
    description: 'Find unexpected negatives',
    run: checkNegativeValues,
  },
  {
    name: 'Unique Key',
    description: 'Verify ID columns are unique',
    run: checkUniqueKey,
  },
];
