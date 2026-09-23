#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Seeded PRNG
// ---------------------------------------------------------------------------
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ---------------------------------------------------------------------------
// Lookup data
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Sarah','James','Maria','David','Jennifer','Michael','Lisa','Robert',
  'Emily','Daniel','Jessica','William','Amanda','Joseph','Elizabeth',
  'Richard','Ashley','Thomas','Michelle','Charles','Nicole','Christopher',
  'Laura','Matthew','Stephanie'
];

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson',
  'Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson',
  'White','Harris'
];

const SCHOOLS = [
  'Lincoln Elementary','Washington Middle','Jefferson High',
  'Roosevelt Elementary','Adams Middle','Kennedy High'
];

const GRADE_LEVELS = ['K','1','2','3','4','5','6','7','8','9','10','11','12'];

const DISTRICTS = ['Northern','Southern','Eastern','Western'];

const SUBJECTS = [
  'math','science','reading','art','music','history','English','PE'
];

const COMMENT_TEMPLATES = [
  'The teachers at {school} are wonderful',
  'My child loves the {subject} curriculum',
  'Great improvement in lesson quality this year',
  'Communication could be better',
  'Very satisfied with the education quality',
  'The facilities need some updates',
  'Excellent teaching staff and resources',
  'My child has grown so much this year',
  'Would love to see more after-school programs',
  'Overall a positive experience for our family'
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

function randInt(min, max, rand) {
  return min + Math.floor(rand() * (max - min + 1));
}

function generateName(rand) {
  return pick(FIRST_NAMES, rand) + ' ' + pick(LAST_NAMES, rand);
}

function generateDate2026(rand) {
  const month = randInt(1, 12, rand);
  const day = randInt(1, 28, rand); // keep it simple, max 28
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `2026-${mm}-${dd}`;
}

function generateDateMMDDYYYY(rand) {
  const month = randInt(1, 12, rand);
  const day = randInt(1, 28, rand);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${mm}/${dd}/2026`;
}

function generateComment(rand) {
  let tpl = pick(COMMENT_TEMPLATES, rand);
  tpl = tpl.replace('{school}', pick(SCHOOLS, rand));
  tpl = tpl.replace('{subject}', pick(SUBJECTS, rand));
  return tpl;
}

function escapeCSV(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// ---------------------------------------------------------------------------
// CSV header
// ---------------------------------------------------------------------------
const HEADER = [
  'response_id','timestamp','parent_name','school_name','grade_level',
  'district','teacher_rating','content_rating','lesson_quality_rating',
  'facility_rating','safety_rating','communication_rating',
  'overall_satisfaction','would_recommend','comments'
];

// ---------------------------------------------------------------------------
// Generate clean row
// ---------------------------------------------------------------------------
function generateCleanRow(id, rand) {
  return {
    response_id: id,
    timestamp: generateDate2026(rand),
    parent_name: generateName(rand),
    school_name: pick(SCHOOLS, rand),
    grade_level: pick(GRADE_LEVELS, rand),
    district: pick(DISTRICTS, rand),
    teacher_rating: randInt(1, 5, rand),
    content_rating: randInt(1, 5, rand),
    lesson_quality_rating: randInt(1, 5, rand),
    facility_rating: randInt(1, 5, rand),
    safety_rating: randInt(1, 5, rand),
    communication_rating: randInt(1, 5, rand),
    overall_satisfaction: randInt(1, 5, rand),
    would_recommend: rand() < 0.5 ? 'Yes' : 'No',
    comments: generateComment(rand)
  };
}

function rowToCSV(row) {
  return HEADER.map(h => escapeCSV(row[h])).join(',');
}

// ---------------------------------------------------------------------------
// Generate POST-TEST (clean) file
// ---------------------------------------------------------------------------
function generatePostTest() {
  const rand = seededRandom(42);
  const lines = [HEADER.join(',')];

  for (let i = 1; i <= 10000; i++) {
    const row = generateCleanRow(i, rand);
    lines.push(rowToCSV(row));
  }

  const outPath = path.join(__dirname, '..', 'demo', 'survey_post_test.csv');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${outPath}  (${lines.length} lines: 1 header + ${lines.length - 1} data rows)`);
}

// ---------------------------------------------------------------------------
// Generate PRE-TEST (dirty) file
// ---------------------------------------------------------------------------
function generatePreTest() {
  const rand = seededRandom(99);

  // Build 10000 clean rows, then inject exactly 3 subtle issues (2 records each)
  const rows = [];
  for (let i = 1; i <= 10000; i++) {
    rows.push(generateCleanRow(i, rand));
  }

  // -----------------------------------------------------------------------
  // FAIL 1: COMPLETENESS — 2 null values
  //   Row 42:   parent_name is empty
  //   Row 8817: district is empty
  // -----------------------------------------------------------------------
  rows[41].parent_name = '';
  rows[8816].district = '';

  // -----------------------------------------------------------------------
  // FAIL 2: VALUE CONSISTENCY — 2 typos
  //   Row 1500: "Lincolm Elementary" (should be "Lincoln Elementary")
  //   Row 7203: "Kenndy High" (should be "Kennedy High")
  // -----------------------------------------------------------------------
  rows[1499].school_name = 'Lincolm Elementary';
  rows[7202].school_name = 'Kenndy High';

  // -----------------------------------------------------------------------
  // FAIL 3: TYPE CONSISTENCY — 2 mixed-type values
  //   Row 3001: teacher_rating = "five" (string in numeric column)
  //   Row 6500: facility_rating = "N/A" (string in numeric column)
  // -----------------------------------------------------------------------
  rows[3000].teacher_rating = 'five';
  rows[6499].facility_rating = 'N/A';

  // -----------------------------------------------------------------------
  // PASS: Duplicates       — no duplicate rows (all unique)
  // PASS: Outliers         — all ratings within 1-5 (no extreme values)
  // PASS: Pattern Conform  — all timestamps YYYY-MM-DD
  // PASS: Negative Values  — all ratings >= 0
  // PASS: Unique Key       — all response_ids unique
  // -----------------------------------------------------------------------

  // Build CSV
  const lines = [HEADER.join(',')];
  for (let i = 0; i < 10000; i++) {
    lines.push(rowToCSV(rows[i]));
  }

  const outPath = path.join(__dirname, '..', 'demo', 'survey_pre_test.csv');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${outPath}  (${lines.length} lines: 1 header + ${lines.length - 1} data rows)`);
  console.log('  FAIL: Completeness (2 records), Value Consistency (2 records), Type Consistency (2 records)');
  console.log('  PASS: Duplicates, Outliers, Pattern Conformity, Negative Values, Unique Key');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('Generating demo data...\n');
generatePreTest();
generatePostTest();
console.log('\nDone.');
