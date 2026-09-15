// A small in-memory stand-in for the Supabase REST API, used to test the real
// services and controllers without a database. It numbers inserted students
// the way the database trigger does, so responses look realistic; it does NOT
// prove concurrency safety (see admissionNumberMigration.test.js for that).

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

export const createFakeStudentsApi = ({
  ready = true,
  failInserts = [],
  students = [],
} = {}) => {
  const state = {
    requests: [],
    students: [...students],
    counters: new Map(),
  };
  const failures = [...failInserts];
  let nextId = state.students.length + 1;

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

    if (url.pathname !== "/rest/v1/students") {
      return jsonResponse(404, { message: `No fake for ${method} ${url.pathname}` });
    }

    if (method === "POST") {
      const failure = failures.shift();
      if (failure) return jsonResponse(failure.status, failure.body);

      const saved = (Array.isArray(body) ? body : [body]).map((row) => {
        const year = Number(String(row.session ?? "").split("/")[0]) || new Date().getFullYear();
        const next = (state.counters.get(year) || 0) + 1;
        state.counters.set(year, next);

        return {
          id: `student-${nextId++}`,
          ...row,
          admission_number: `ADM/${year}/${String(next).padStart(5, "0")}`,
        };
      });

      state.students.push(...saved);
      return jsonResponse(201, saved);
    }

    const idFilter = url.searchParams.get("id");

    if (method === "GET" && idFilter) {
      const student = state.students.find((s) => `eq.${s.id}` === idFilter);
      return student
        ? jsonResponse(200, student)
        : jsonResponse(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
    }

    if (method === "GET") {
      return jsonResponse(200, []);
    }

    if (method === "PATCH" && idFilter) {
      const student = state.students.find((s) => `eq.${s.id}` === idFilter);
      if (!student) return jsonResponse(200, []);

      Object.assign(student, body);
      return jsonResponse(200, [student]);
    }

    return jsonResponse(404, { message: `No fake for ${method} ${url.pathname}` });
  };

  return { handler, state };
};
