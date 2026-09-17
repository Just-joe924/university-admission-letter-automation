import "./helpers/env.js";

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import express from "express";

import app from "../src/app.js";
import { IMPORT_MAX_FILE_SIZE_BYTES } from "../src/constants/studentImport.js";
import { uploadSpreadsheet } from "../src/middleware/upload.middleware.js";
import { csvBuffer, validStudent } from "./helpers/fixtures.js";

const uploadApp = express();
uploadApp.post("/upload", uploadSpreadsheet, (req, res) =>
  res.json({ name: req.file.originalname, size: req.file.size })
);

const listen = (application) =>
  new Promise((resolve) => {
    const server = application.listen(0, "127.0.0.1", () => resolve(server));
  });

let uploadServer;
let apiServer;

before(async () => {
  uploadServer = await listen(uploadApp);
  apiServer = await listen(app);
});

after(() => {
  uploadServer.close();
  apiServer.close();
});

const url = (server, path) => `http://127.0.0.1:${server.address().port}${path}`;

const postFile = (server, path, file) => {
  const form = new FormData();
  if (file) form.append("file", new Blob([file.content]), file.name);

  return fetch(url(server, path), { method: "POST", body: form });
};

test("upload accepts a CSV file in memory", async () => {
  const content = csvBuffer([validStudent(1)]);
  const response = await postFile(uploadServer, "/upload", { name: "students.csv", content });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { name: "students.csv", size: content.length });
});

test("upload rejects unsupported file types", async () => {
  const response = await postFile(uploadServer, "/upload", {
    name: "students.pdf",
    content: Buffer.from("%PDF-1.4"),
  });

  assert.equal(response.status, 415);
  assert.match((await response.json()).message, /Unsupported file type/);
});

test("upload rejects files larger than the limit", async () => {
  const response = await postFile(uploadServer, "/upload", {
    name: "students.csv",
    content: Buffer.alloc(IMPORT_MAX_FILE_SIZE_BYTES + 1, "a"),
  });

  assert.equal(response.status, 413);
  assert.match((await response.json()).message, /maximum size is 5 MB/);
});

test("upload rejects a request without a file", async () => {
  const response = await postFile(uploadServer, "/upload", null);

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /No file uploaded/);
});

test("bulk import endpoints require an admin token", async () => {
  const content = csvBuffer([validStudent(1)]);

  const responses = await Promise.all([
    fetch(url(apiServer, "/api/students/import/template")),
    postFile(apiServer, "/api/students/import/preview", { name: "s.csv", content }),
    postFile(apiServer, "/api/students/import", { name: "s.csv", content }),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, "No token provided");
  }
});

test("import history endpoints require an admin token", async () => {
  const importId = "11111111-1111-4111-8111-111111111111";

  const paths = [
    "/api/students/imports",
    `/api/students/imports/${importId}`,
    `/api/students/imports/${importId}/errors`,
    `/api/students/imports/${importId}/errors/download`,
  ];

  for (const path of paths) {
    const response = await fetch(url(apiServer, path));

    assert.equal(response.status, 401, path);
    assert.equal((await response.json()).message, "No token provided");
  }
});

test("the existing single-student route still validates before saving", async () => {
  const response = await fetch(url(apiServer, "/api/students"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: "Only a name" }),
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Required fields are missing");
});
