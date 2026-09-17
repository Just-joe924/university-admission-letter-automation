import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildHistoryParams,
  canSubmitImport,
  getImportStatusMeta,
  hasImportErrors,
} from "./importHistory.js";

test("status badges cover every backend status", () => {
  for (const status of [
    "previewed",
    "processing",
    "completed",
    "completed_with_errors",
    "failed",
    "cancelled",
  ]) {
    assert.notEqual(getImportStatusMeta({ status }).label, status, status);
  }

  assert.equal(getImportStatusMeta({ status: "something-new" }).label, "something-new");
  assert.equal(getImportStatusMeta(null).label, "Unknown");
});

test("an interrupted import is shown as interrupted, not as importing", () => {
  assert.equal(
    getImportStatusMeta({ status: "processing", interrupted: true }).label,
    "Interrupted"
  );
  assert.equal(getImportStatusMeta({ status: "processing" }).label, "Importing");
});

test("the import button is only live for a clean, unsubmitted preview", () => {
  assert.equal(canSubmitImport({ importAllowed: true, busy: false, submitted: false }), true);
  assert.equal(canSubmitImport({ importAllowed: false, busy: false, submitted: false }), false);
  assert.equal(canSubmitImport({ importAllowed: true, busy: true, submitted: false }), false);
  assert.equal(canSubmitImport({ importAllowed: true, busy: false, submitted: true }), false);
  assert.equal(canSubmitImport(), false);
});

test("error reports are offered only when rows were not imported", () => {
  assert.equal(hasImportErrors({ failedRows: 0, invalidRows: 0, duplicateRows: 0 }), false);
  assert.equal(hasImportErrors({ failedRows: 2 }), true);
  assert.equal(hasImportErrors({ invalidRows: 1 }), true);
  assert.equal(hasImportErrors({ duplicateRows: 3 }), true);
  assert.equal(hasImportErrors(null), false);
});

test("empty filters are left out of the request", () => {
  assert.deepEqual(
    buildHistoryParams({ page: 2, pageSize: 20, status: "", search: "sept", from: null }),
    { page: 2, pageSize: 20, search: "sept" }
  );
  assert.deepEqual(buildHistoryParams(), {});
});
