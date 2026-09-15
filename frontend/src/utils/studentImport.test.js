import assert from "node:assert/strict";
import { test } from "node:test";

import {
  IMPORT_MAX_FILE_SIZE_BYTES,
  canImportPreview,
  formatFileSize,
  getImportFileError,
} from "./studentImport.js";

const cleanPreview = () => ({
  canImport: true,
  summary: { totalRows: 2, validRows: 2, invalidRows: 0, duplicateRows: 0 },
  rows: [
    { rowNumber: 2, status: "valid", errors: [] },
    { rowNumber: 3, status: "valid", errors: [] },
  ],
});

test("import is enabled for a clean preview", () => {
  assert.equal(canImportPreview(cleanPreview()), true);
});

test("import stays disabled when there is no preview", () => {
  assert.equal(canImportPreview(null), false);
  assert.equal(canImportPreview(undefined), false);
});

test("import stays disabled when the preview contains errors", () => {
  const withErrors = cleanPreview();
  withErrors.canImport = false;
  withErrors.summary = { totalRows: 2, validRows: 1, invalidRows: 1, duplicateRows: 1 };
  withErrors.rows[1] = {
    rowNumber: 3,
    status: "duplicate",
    errors: [{ field: "email", type: "duplicate", message: "Duplicate" }],
  };

  assert.equal(canImportPreview(withErrors), false);
});

test("import stays disabled if any row has errors even when canImport is true", () => {
  const inconsistent = cleanPreview();
  inconsistent.rows[0].errors = [{ field: "email", message: "Bad" }];

  assert.equal(canImportPreview(inconsistent), false);
});

test("import stays disabled for an empty preview", () => {
  assert.equal(
    canImportPreview({ canImport: true, summary: { totalRows: 0, invalidRows: 0 }, rows: [] }),
    false
  );
});

test("file checks reject unsupported, empty and oversized files", () => {
  assert.match(getImportFileError({ name: "list.pdf", size: 10 }), /Unsupported file type/);
  assert.match(getImportFileError({ name: "list.csv", size: 0 }), /empty/);
  assert.match(
    getImportFileError({ name: "list.xlsx", size: IMPORT_MAX_FILE_SIZE_BYTES + 1 }),
    /too large/
  );
  assert.equal(getImportFileError({ name: "LIST.XLS", size: 2048 }), "");
});

test("file sizes are human readable", () => {
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(2048), "2.0 KB");
  assert.equal(formatFileSize(IMPORT_MAX_FILE_SIZE_BYTES), "5.0 MB");
});
