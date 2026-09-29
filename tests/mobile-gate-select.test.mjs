import assert from 'node:assert/strict';
import test from 'node:test';
import { mobileVerdict, selectMobileCases } from '../scripts/lib/mobile-gate-select.mjs';

const caseIds = ['button', 'tabs', 'motion-settings'];
const registryNames = ['button', 'tabs', 'slider'];

test('mobile_gate_passes_when_no_selected_id_has_a_case', () => {
  const selection = selectMobileCases({ ids: 'slider', caseIds, registryNames });
  assert.deepEqual(selection.run, []);
  const verdict = mobileVerdict({ selection, records: [] });
  assert.equal(verdict.status, 'PASS');
  assert.match(verdict.note, /no mobile case for the selected ids: slider/);
  assert.deepEqual(selectMobileCases({ ids: 'button,slider', caseIds, registryNames }).run, ['button']);
});

test('mobile_gate_rejects_unknown_id', () => {
  assert.ok(selectMobileCases({ ids: 'button,sliderr', caseIds, registryNames }).error);
  assert.equal(selectMobileCases({ ids: 'motion-settings', caseIds, registryNames }).error, undefined);
});

test('mobile_gate_without_ids_and_no_cases_still_fails', () => {
  const selection = selectMobileCases({ ids: undefined, caseIds: [], registryNames });
  assert.equal(mobileVerdict({ selection, records: [] }).status, 'FAIL');
  const all = selectMobileCases({ ids: undefined, caseIds, registryNames });
  assert.equal(mobileVerdict({ selection: all, records: [{ status: 'PASS' }, { status: 'FAIL' }] }).status, 'FAIL');
  assert.equal(mobileVerdict({ selection: all, records: [{ status: 'PASS' }] }).status, 'PASS');
});
