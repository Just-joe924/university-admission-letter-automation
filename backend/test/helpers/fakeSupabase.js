// A small in-memory stand-in for the Supabase REST API, so the real services
// and controllers can be tested without a database. It supports the subset of
// PostgREST the app uses: filters, ordering, offset/limit paging, exact counts,
// single-object responses, inserts and updates.
//
// Inserted students get admission numbers the way the database trigger does, so
// responses look realistic; this does NOT prove concurrency safety (see
// admissionNumberMigration.test.js for that).
import { randomUUID } from "node:crypto";

const jsonResponse = (status, body, headers = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const notAcceptable = () =>
  jsonResponse(406, {
    code: "PGRST116",
    message: "JSON object requested, multiple (or no) rows returned",
  });

const headerValue = (headers, name) => {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";

  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key]) : "";
};

const parseList = (raw) =>
  raw
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(",")
    .map((value) => value.replace(/^"|"$/g, ""));

const likePattern = (raw) =>
  new RegExp(
    `^${raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[*%]/g, ".*")}$`,
    "i"
  );

const matches = (value, filter) => {
  const separator = filter.indexOf(".");
  const operator = filter.slice(0, separator);
  const raw = filter.slice(separator + 1);
  const text = value === null || value === undefined ? null : String(value);

  switch (operator) {
    case "eq":
      return text === raw;
    case "neq":
      return text !== raw;
    case "gt":
      return text !== null && text > raw;
    case "gte":
      return text !== null && text >= raw;
    case "lt":
      return text !== null && text < raw;
    case "lte":
      return text !== null && text <= raw;
    case "in":
      return text !== null && parseList(raw).includes(text);
    case "like":
    case "ilike":
      return text !== null && likePattern(raw).test(text);
    case "is":
      return raw === "null" ? value === null || value === undefined : text === raw;
    default:
      throw new Error(`fakeSupabase: unsupported filter "${filter}"`);
  }
};

const RESERVED_PARAMS = new Set(["select", "order", "limit", "offset", "columns", "on_conflict"]);

const applyFilters = (rows, url) =>
  rows.filter((row) =>
    [...url.searchParams.entries()].every(
      ([key, filter]) => RESERVED_PARAMS.has(key) || matches(row[key], filter)
    )
  );

const applyOrder = (rows, url) => {
  const order = url.searchParams.get("order");
  if (!order) return rows;

  const [column, direction = "asc"] = order.split(".");
  const descending = direction.startsWith("desc");

  return [...rows].sort((a, b) => {
    const left = a[column] ?? "";
    const right = b[column] ?? "";
    if (left === right) return 0;
    return (left > right ? 1 : -1) * (descending ? -1 : 1);
  });
};

export const admissionConflict = {
  status: 409,
  body: {
    code: "23505",
    details: "Key (admission_number)=(ADM/2026/00007) already exists.",
    message: 'duplicate key value violates unique constraint "students_admission_number_key"',
  },
};

export const emailConflict = {
  status: 409,
  body: {
    code: "23505",
    details: "Key (email)=(student1@example.com) already exists.",
    message: 'duplicate key value violates unique constraint "students_email_key"',
  },
};

export const deadlock = {
  status: 500,
  body: { code: "40P01", details: null, message: "deadlock detected" },
};

const TABLE_DEFAULTS = {
  student_imports: {
    status: "previewed",
    total_rows: 0,
    valid_rows: 0,
    invalid_rows: 0,
    duplicate_rows: 0,
    imported_rows: 0,
    failed_rows: 0,
    completed_at: null,
    error_summary: null,
    metadata: null,
  },
  student_import_rows: {},
  admins: {},
};

export const createFakeSupabase = ({
  ready = true,
  failInserts = [],
  tables = {},
} = {}) => {
  const state = {
    requests: [],
    counters: new Map(),
    tables: {
      students: [],
      student_imports: [],
      student_import_rows: [],
      admins: [],
      ...tables,
    },
  };

  // Kept for tests written against the students-only fake.
  Object.defineProperty(state, "students", {
    get: () => state.tables.students,
    enumerable: true,
  });

  const failures = [...failInserts];
  let nextStudentId = state.tables.students.length + 1;

  const withDefaults = (table, row) => {
    const base = {
      id: randomUUID(),
      created_at: new Date().toISOString(),
      ...(TABLE_DEFAULTS[table] ?? {}),
      ...row,
    };

    if (table !== "students") return base;

    const year =
      Number(String(row.session ?? "").split("/")[0]) || new Date().getFullYear();
    const next = (state.counters.get(year) || 0) + 1;
    state.counters.set(year, next);

    return {
      ...base,
      id: `student-${nextStudentId++}`,
      // Assigned by the database trigger, never by the caller.
      admission_number: `ADM/${year}/${String(next).padStart(5, "0")}`,
    };
  };

  const handler = async (url, init = {}) => {
    const method = init.method || "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    state.requests.push({ method, path: url.pathname, search: url.search, body });

    if (url.pathname === "/rest/v1/rpc/admission_numbering_ready") {
      return ready
        ? jsonResponse(200, true)
        : jsonResponse(404, {
            code: "PGRST202",
            message: "Could not find the function public.admission_numbering_ready",
          });
    }

    const table = url.pathname.replace("/rest/v1/", "");
    const rows = state.tables[table];

    if (!rows) {
      return jsonResponse(404, { message: `No fake table for ${method} ${url.pathname}` });
    }

    const prefer = headerValue(init.headers, "prefer");
    const wantsObject = headerValue(init.headers, "accept").includes("vnd.pgrst.object");
    const wantsRepresentation = prefer.includes("return=representation");

    if (method === "POST") {
      const failure = table === "students" ? failures.shift() : undefined;
      if (failure) return jsonResponse(failure.status, failure.body);

      const inserted = (Array.isArray(body) ? body : [body]).map((row) =>
        withDefaults(table, row)
      );
      rows.push(...inserted);

      if (!wantsRepresentation) return jsonResponse(201, undefined);
      if (wantsObject) {
        return inserted.length === 1 ? jsonResponse(201, inserted[0]) : notAcceptable();
      }
      return jsonResponse(201, inserted);
    }

    if (method === "PATCH") {
      const affected = applyFilters(rows, url);
      for (const row of affected) Object.assign(row, body);

      if (!wantsRepresentation) return jsonResponse(200, undefined);
      if (wantsObject) {
        return affected.length === 1 ? jsonResponse(200, affected[0]) : notAcceptable();
      }
      return jsonResponse(200, affected);
    }

    if (method === "GET") {
      const filtered = applyOrder(applyFilters(rows, url), url);
      const offset = Number(url.searchParams.get("offset")) || 0;
      const limit = url.searchParams.get("limit");
      const page = filtered.slice(
        offset,
        limit ? offset + Number(limit) : undefined
      );

      if (wantsObject) {
        return page.length === 1 ? jsonResponse(200, page[0]) : notAcceptable();
      }

      const headers = prefer.includes("count=exact")
        ? {
            "Content-Range": `${offset}-${Math.max(offset, offset + page.length - 1)}/${filtered.length}`,
          }
        : {};

      return jsonResponse(200, page, headers);
    }

    return jsonResponse(404, { message: `No fake for ${method} ${url.pathname}` });
  };

  return { handler, state };
};

// Students-only wrapper used by the student creation tests.
export const createFakeStudentsApi = ({ ready, failInserts, students = [] } = {}) =>
  createFakeSupabase({ ready, failInserts, tables: { students: [...students] } });
