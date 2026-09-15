import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { DEPARTMENT_COURSES } from "../src/constants/departments.js";

const frontendConstants = new URL(
  "../../frontend/src/constants/departments.js",
  import.meta.url
);

test(
  "backend department list matches the Add Student form's list",
  { skip: !existsSync(frontendConstants) && "frontend source not available" },
  async () => {
    const { DEPARTMENT_COURSES: frontend } = await import(frontendConstants.href);

    assert.deepEqual(DEPARTMENT_COURSES, frontend);
  }
);
