import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { verifyPublic, publicFiles } from '../scripts/verify-public.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = {};
runInNewContext(readFileSync(resolve(root, 'site/static/quote-core.js'), 'utf8'), context);
const quote = overrides => context.QuotellumMath.quote({ materials: '100', hours: '4', hourly_rate: '25', overhead: '20', other_cost: '0', target_margin_percent: '30', fee_percent: '0', refund_percent: '0', fixed_fee: '0', acquisition: '0', support: '0', ...overrides });
test('default free quote independently matches $220 cost / 70% retained fraction', () => {
  const result = quote(); assert.equal(result.price_cents, 31429); assert.equal(result.delivery_cost_cents, 22000); assert.equal(result.contribution_cents, 9429); assert.equal(result.fee_cents, 0);
});
test('target margin is a revenue percentage, not a markup on cost', () => {
  const result = quote({ materials: '100', hours: '0', overhead: '0', target_margin_percent: '50' }); assert.equal(result.price_cents, 20000); assert.equal(result.contribution_cents, 10000); assert.equal(result.margin, 0.5);
});
test('half-cent labor rounds to the nearest USD cent without floating-point multiplication', () => {
  const result = quote({ materials: '0', hours: '0.005', hourly_rate: '1', overhead: '0', target_margin_percent: '0' }); assert.equal(result.price_cents, 1); assert.equal(result.labor_cents, 1); assert.equal(result.delivery_cost_cents, 1);
});
test('zero delivery and revenue produce no invented margin', () => {
  const result = quote({ materials: '0', hours: '0', overhead: '0' }); assert.equal(result.price_cents, 0); assert.equal(result.margin, null);
});
test('invalid non-finite, negative and excessive precision inputs are rejected', () => {
  for (const materials of ['-1', 'NaN', 'Infinity', '0.001', '1e9', '']) assert.throws(() => quote({ materials }));
  assert.throws(() => quote({ hours: '0.00001' })); assert.throws(() => quote({ target_margin_percent: '100' }));
});
test('only reviewed free assets and the disabled local-only controller are in the repository', () => {
  const result = verifyPublic(root); assert.equal(result.publicAssets, 8); assert.equal(result.files, 16);
});
test('local HTML asset links and anchors resolve; sample route maps to the reviewed workbook', () => {
  const html = readFileSync(resolve(root, 'site/index.html'), 'utf8');
  for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (link.startsWith('mailto:')) { assert.equal(link, 'mailto:quotellum.service@gmail.com'); continue; }
    if (link.startsWith('#')) { assert.ok(html.includes('id="' + link.slice(1) + '"')); continue; }
    assert.ok(link === '/' || link === '/sample' || publicFiles.includes(link.slice(1)), 'Unapproved link: ' + link);
  }
  assert.match(readFileSync(resolve(root, 'site/_redirects'), 'utf8'), /^\uFEFF?\/sample \/Quotellum-Quick-Quote\.xlsx 200\s*$/);
  assert.equal((html.match(/<form\b/g) || []).length, 1);
});
test('CI checks are read-only and cannot deploy this draft', () => {
  const workflow = readFileSync(resolve(root, '.github/workflows/public-ci.yml'), 'utf8'); assert.match(workflow, /contents: read/); assert.match(workflow, /timeout-minutes: 5/);
  assert.doesNotMatch(workflow, /secrets\.|deploy|write|pull_request_target|workflow_run/);
  for (const [, ref] of workflow.matchAll(/uses:\s*([^\s#]+)/g)) assert.match(ref, /@[a-f0-9]{40}$/);
});
