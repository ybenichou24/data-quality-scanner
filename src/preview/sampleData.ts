import type { LoadedTable, ColumnInfo } from '../engine/types';

function seededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const SCHOOLS = [
  'Lincoln Elementary', 'Washington Middle', 'Jefferson High',
  'Roosevelt Elementary', 'Adams Middle', 'Kennedy High',
];
const DISTRICTS = ['Northern', 'Southern', 'Eastern', 'Western'];
const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const FIRST_NAMES = ['Sarah', 'James', 'Maria', 'David', 'Jennifer', 'Michael', 'Lisa', 'Robert', 'Emily', 'Daniel'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const COMMENTS = [
  'The teachers are wonderful',
  'My child loves the curriculum',
  'Great improvement in lesson quality this year',
  'Communication could be better',
  'Very satisfied with the education quality',
  'The facilities need some updates',
  'Excellent teaching staff and resources',
  'My child has grown so much this year',
  'Would love to see more after-school programs',
  'Overall a positive experience for our family',
];

const COLUMNS: ColumnInfo[] = [
  { name: 'response_id', dataType: 'integer', role: 'dimension' },
  { name: 'timestamp', dataType: 'string', role: 'dimension' },
  { name: 'parent_name', dataType: 'string', role: 'dimension' },
  { name: 'school_name', dataType: 'string', role: 'dimension' },
  { name: 'grade_level', dataType: 'string', role: 'dimension' },
  { name: 'district', dataType: 'string', role: 'dimension' },
  { name: 'teacher_rating', dataType: 'integer', role: 'measure' },
  { name: 'content_rating', dataType: 'integer', role: 'measure' },
  { name: 'lesson_quality_rating', dataType: 'integer', role: 'measure' },
  { name: 'facility_rating', dataType: 'integer', role: 'measure' },
  { name: 'safety_rating', dataType: 'integer', role: 'measure' },
  { name: 'communication_rating', dataType: 'integer', role: 'measure' },
  { name: 'overall_satisfaction', dataType: 'integer', role: 'measure' },
  { name: 'would_recommend', dataType: 'string', role: 'dimension' },
  { name: 'comments', dataType: 'string', role: 'dimension' },
];

function generateCleanRows(seed: number, count: number) {
  const rand = seededRandom(seed);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  const rows: (string | number | boolean | null)[][] = [];
  for (let i = 0; i < count; i++) {
    const id = i + 1;
    const month = String(randInt(1, 9)).padStart(2, '0');
    const day = String(randInt(1, 28)).padStart(2, '0');
    rows.push([
      id, `2026-${month}-${day}`,
      `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      pick(SCHOOLS), pick(GRADES), pick(DISTRICTS),
      randInt(1, 5), randInt(1, 5), randInt(1, 5), randInt(1, 5),
      randInt(1, 5), randInt(1, 5), randInt(1, 5),
      rand() > 0.3 ? 'Yes' : 'No', pick(COMMENTS),
    ]);
  }
  return rows;
}

export function generatePreTestData(): LoadedTable {
  const rows = generateCleanRows(42, 500);

  // Inject 6 issues — 3 checks fail, 2 records each
  rows[41][2] = null;                     // Completeness: parent_name null
  rows[398][5] = null;                    // Completeness: district null
  rows[99][3] = 'Lincolm Elementary';     // Value Consistency: typo
  rows[350][3] = 'Kenndy High';          // Value Consistency: typo
  rows[200][6] = 'five';                  // Type Consistency: string in numeric col
  rows[420][9] = 'N/A';                   // Type Consistency: string in numeric col

  return {
    datasourceName: 'Survey Pre-Test',
    tableName: 'survey_pre_test',
    columns: [...COLUMNS],
    rows,
  };
}

export function generatePostTestData(): LoadedTable {
  return {
    datasourceName: 'Survey Post-Test',
    tableName: 'survey_post_test',
    columns: [...COLUMNS],
    rows: generateCleanRows(99, 500),
  };
}

export const PREVIEW_DATASETS = [
  { name: 'Survey Pre-Test', generate: generatePreTestData },
  { name: 'Survey Post-Test', generate: generatePostTestData },
];
