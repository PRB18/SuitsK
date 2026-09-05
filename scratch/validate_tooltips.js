const fs = require('fs');
const schema = fs.readFileSync('public/js/schema.js', 'utf8');
const cs = fs.readFileSync('public/js/screens/configuratorScreen.js', 'utf8');
const checks = [
  ['TOOLTIP_DESCRIPTIONS export', schema.includes('export const TOOLTIP_DESCRIPTIONS')],
  ['Peak entry', schema.includes("'Peak':")],
  ['Milanese by hand entry', schema.includes("'Milanese by hand':")],
  ['HS3 entry', schema.includes("'HS3':")],
  ['Barchetta entry', schema.includes("'Barchetta':")],
  ['LB Hook Square entry', schema.includes("'LB Hook Square':")],
  ['Gurkha Wrap Waistband entry', schema.includes("'Gurkha Wrap Waistband':")],
  ['configuratorScreen imports TOOLTIP_DESCRIPTIONS', cs.includes('TOOLTIP_DESCRIPTIONS')],
  ['showTooltip fn exists', cs.includes('function showTooltip')],
  ['mouseenter listener', cs.includes('mouseenter')],
  ['data-tooltip attr on cards', cs.includes('data-tooltip')],
  ['focus listener for keyboard', cs.includes("'focus'")],
  ['keyboard Enter/Space handler', cs.includes("'Enter'")],
];
checks.forEach(([name, result]) => console.log((result ? 'OK  ' : 'FAIL') + name));
const tipCount = (schema.match(/^  '[^']+': '/gm) || []).length;
console.log('\nTOOLTIP entries counted:', tipCount);
