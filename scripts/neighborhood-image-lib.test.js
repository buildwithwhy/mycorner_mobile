const test = require('node:test');
const assert = require('node:assert');
const {
  slugifyName,
  normalizeForMatch,
  parsePromptLibrary,
  loadNeighborhoods,
  assignAssetNames,
} = require('./lib/neighborhood-image-lib.js');

const FIXTURE_PROMPTS = [
  'NEIGHBORHOOD IMAGE GENERATION PROMPTS',
  '=====================================',
  '',
  '=====================================',
  'LONDON NEIGHBORHOODS (2)',
  '=====================================',
  '',
  '--- 1. Soho ---',
  'Highlights: Dining, Nightlife',
  '',
  'Soft watercolor illustration, no text. A cozy street with warm lights.',
  '',
  '--- 2. Elephant & Castle ---',
  'Highlights: Market',
  '',
  'Soft watercolor illustration, no text. A market scene',
  'with colorful stalls and happy shoppers.',
  '',
  '=====================================',
  'NEW YORK NEIGHBORHOODS (1)',
  '=====================================',
  '',
  '--- 3. SoHo ---',
  'Highlights: Shopping',
  '',
  'Soft watercolor illustration, no text. Cast-iron facades.',
  '',
  '=====================================',
  'END OF PROMPTS',
  '=====================================',
  'Tips for generation: square, 1024x1024.',
].join('\n');

test('slugifyName matches existing asset conventions', () => {
  assert.equal(slugifyName('Notting Hill'), 'notting-hill');
  assert.equal(slugifyName("Hell's Kitchen"), 'hells-kitchen');
  assert.equal(slugifyName('Elephant & Castle'), 'elephant-and-castle');
  assert.equal(slugifyName('St. George'), 'st-george');
});

test('normalizeForMatch collapses case, punctuation, and ampersands', () => {
  assert.equal(normalizeForMatch('SoHo'), normalizeForMatch('Soho'));
  assert.equal(normalizeForMatch('Elephant & Castle'), normalizeForMatch('Elephant and Castle'));
  assert.equal(normalizeForMatch("St John's Wood"), normalizeForMatch('St. Johns Wood'));
});

test('parsePromptLibrary scopes prompts by city and skips Highlights', () => {
  const entries = parsePromptLibrary(FIXTURE_PROMPTS);
  assert.equal(entries.length, 3);
  assert.deepEqual(entries[0], {
    cityId: 'london',
    name: 'Soho',
    prompt: 'Soft watercolor illustration, no text. A cozy street with warm lights.',
  });
  assert.equal(entries[1].cityId, 'london');
  assert.equal(entries[1].prompt, 'Soft watercolor illustration, no text. A market scene with colorful stalls and happy shoppers.');
  assert.equal(entries[2].cityId, 'new-york');
  assert.equal(entries[2].name, 'SoHo');
  // Highlights metadata and trailing tips must never leak into prompts
  assert.ok(entries.every((e) => !/Highlights|Tips for generation/.test(e.prompt)));
  // A punctuation-free key must resolve for both same-named cities
  const byKey = (city, name) =>
    entries.find((e) => e.cityId === city && normalizeForMatch(e.name) === normalizeForMatch(name));
  assert.ok(byKey('london', 'Soho'));
  assert.ok(byKey('new-york', 'SoHo'));
});

const FAKE_NEIGHBORHOODS = [
  { id: '1', name: 'Soho', cityId: 'london' },
  { id: '2', name: 'Elephant & Castle', cityId: 'london' },
  { id: '71', name: 'Chelsea', cityId: 'london' },
  { id: 'ny-4', name: 'SoHo', cityId: 'new-york' },
  { id: 'ny-6', name: 'Chelsea', cityId: 'new-york' },
];

test('assignAssetNames keeps bare slug when unique', () => {
  const names = assignAssetNames(FAKE_NEIGHBORHOODS, {});
  assert.equal(names.get('2'), 'elephant-and-castle');
});

test('assignAssetNames resolves collisions via the committed wiring map, then city suffix', () => {
  // The committed map assigns soho.webp to ny-4; London Soho is the newcomer.
  const names = assignAssetNames(FAKE_NEIGHBORHOODS, { 'ny-4': 'soho' });
  assert.equal(names.get('ny-4'), 'soho');
  assert.equal(names.get('1'), 'soho-london');
  // Chelsea collides but the committed map claims neither: both get city
  // suffixes, keeping the two assets distinct.
  const fresh = assignAssetNames(FAKE_NEIGHBORHOODS, {});
  assert.equal(fresh.get('ny-6'), 'chelsea-new-york');
  assert.notEqual(fresh.get('ny-6'), fresh.get('71'));
  assert.equal(fresh.get('71'), 'chelsea-london');
});

test('loadNeighborhoods parses the bundled data files (126 neighborhoods)', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const nbs = loadNeighborhoods((p) => fs.readFileSync(path.join(root, p), 'utf8'));
  assert.equal(nbs.length, 126);
  assert.ok(nbs.every((nb) => nb.id && nb.name && nb.cityId));
  // Escaped-quote and ampersand names survive parsing
  assert.ok(nbs.some((nb) => nb.name.includes('Shepherd')));
  assert.ok(nbs.some((nb) => nb.name.includes('Elephant')));
});
