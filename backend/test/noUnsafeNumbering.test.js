// Guards against admission numbers being calculated in application code again.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)]
  );

const readSources = (dir, pattern) =>
  listFiles(dir)
    .filter((file) => pattern.test(file) && !file.endsWith(".test.js"))
    .map((file) => [file, readFileSync(file, "utf8")]);

const backendSrc = fileURLToPath(new URL("../src", import.meta.url));
const frontendSrc = fileURLToPath(new URL("../../frontend/src", import.meta.url));

test("the backend doesn't calculate admission numbers itself", () => {
  const sources = readSources(backendSrc, /\.js$/);

  for (const [file, source] of sources) {
    assert.doesNotMatch(source, /generateAdmissionNumber|getHighestAdmissionSequence/, file);
    assert.doesNotMatch(source, /["'`]ADM\//, file);
  }

  // Count queries are only for statistics and paging, never for numbering.
  const countQueries = sources
    .filter(([, source]) => /count:\s*"exact"/.test(source))
    .map(([file]) => basename(file))
    .sort();
  assert.deepEqual(countQueries, [
    "dashboard.service.js",
    "importHistory.service.js",
    "importRow.service.js",
  ]);

  for (const file of ["student.service.js", "studentImport.service.js"]) {
    const [, source] = sources.find(([path]) => path.endsWith(file));
    assert.doesNotMatch(source, /count:\s*"exact"/, file);
  }
});

test(
  "the frontend never generates or sends admission numbers",
  { skip: !existsSync(frontendSrc) && "frontend source not available" },
  () => {
    for (const [file, source] of readSources(frontendSrc, /\.jsx?$/)) {
      assert.doesNotMatch(source, /["'`]ADM\//, file);
    }

    const addStudentForm = readFileSync(join(frontendSrc, "pages/admin/AddStudents.jsx"), "utf8");
    assert.doesNotMatch(addStudentForm, /admission_number/);
  }
);
