import { IMPORT_COLUMNS } from "../constants/studentImport.js";
import {
  formatAdmissionNumber,
  getAdmissionNumberPrefix,
  getHighestAdmissionSequence,
  parseAdmissionSequence,
} from "../utils/generateAdmissionNumber.js";
import { ImportError } from "../utils/importError.js";
import { parseSpreadsheet } from "../utils/parseSpreadsheet.js";
import { validateStudentRecord } from "../utils/validateStudent.js";
import {
  createStudentsService,
  findStudentsByUniqueFieldsService,
} from "./student.service.js";

// Database access is injectable so the import logic can be tested without Supabase.
const defaultDeps = {
  findExistingStudents: findStudentsByUniqueFieldsService,
  getHighestAdmissionSequence,
  insertStudents: createStudentsService,
};

// Unique student columns. Compared case-insensitively, so "A@x.com" and
// "a@x.com" count as the same student.
const UNIQUE_FIELDS = [
  { field: "email", label: "Email" },
  { field: "application_number", label: "Application number" },
  { field: "admission_number", label: "Admission number" },
];

const MAX_ROW_REFERENCES = 5;

const matchKey = (value) => value.toLowerCase();

const describeRows = (rowNumbers) => {
  const shown = rowNumbers.slice(0, MAX_ROW_REFERENCES).join(", ");
  const extra = rowNumbers.length - MAX_ROW_REFERENCES;
  const noun = rowNumbers.length === 1 ? "row" : "rows";

  return extra > 0 ? `${noun} ${shown} and ${extra} more` : `${noun} ${shown}`;
};

const pickStudentFields = (student) =>
  Object.fromEntries(IMPORT_COLUMNS.map(({ key }) => [key, student[key]]));

export const buildImportTemplateCsv = () =>
  // The BOM makes Excel open the file as UTF-8.
  `\uFEFF${IMPORT_COLUMNS.map((column) => column.key).join(",")}\r\n`;

const flagDuplicatesWithinFile = (rows) => {
  for (const { field, label } of UNIQUE_FIELDS) {
    const rowsByValue = new Map();

    for (const row of rows) {
      const value = row.data[field];
      if (!value) continue;

      const key = matchKey(value);
      rowsByValue.set(key, [...(rowsByValue.get(key) || []), row]);
    }

    for (const group of rowsByValue.values()) {
      if (group.length < 2) continue;

      for (const row of group) {
        const others = group.filter((other) => other !== row).map((other) => other.rowNumber);
        row.errors.push({
          field,
          type: "duplicate",
          message: `${label} "${row.data[field]}" is also used in ${describeRows(others)} of this file`,
        });
      }
    }
  }
};

const flagDuplicatesInDatabase = async (rows, deps) => {
  // Only look up values that passed validation; the database column may differ
  // in case, so each value is also checked in lower and upper case.
  const lookupValues = (field) => {
    const values = rows
      .filter(
        (row) =>
          row.data[field] &&
          !row.errors.some((e) => e.field === field && e.type === "validation")
      )
      .map((row) => row.data[field]);

    return [...new Set(values.flatMap((v) => [v, v.toLowerCase(), v.toUpperCase()]))];
  };

  const { data: existing, error } = await deps.findExistingStudents({
    emails: lookupValues("email"),
    applicationNumbers: lookupValues("application_number"),
    admissionNumbers: lookupValues("admission_number"),
  });

  if (error) {
    console.error("Import duplicate lookup error:", error);
    throw new ImportError(
      "Could not check the file against existing students. Please try again.",
      502
    );
  }

  for (const { field, label } of UNIQUE_FIELDS) {
    const existingValues = new Set(
      existing.map((student) => student[field]).filter(Boolean).map(matchKey)
    );

    for (const row of rows) {
      const value = row.data[field];

      if (value && existingValues.has(matchKey(value))) {
        row.errors.push({
          field,
          type: "duplicate",
          message: `${label} "${value}" already belongs to an existing student`,
        });
      }
    }
  }
};

// Parses and fully validates a spreadsheet WITHOUT writing anything.
export const buildImportPreview = async (buffer, fileName, deps = defaultDeps) => {
  const { rows: parsedRows, skippedEmptyRows, ignoredColumns } = parseSpreadsheet(
    buffer,
    fileName
  );

  const rows = parsedRows.map(({ rowNumber, data }) => {
    const { errors, student } = validateStudentRecord(data);

    return {
      rowNumber,
      data: student,
      errors: errors.map((error) => ({ ...error, type: "validation" })),
    };
  });

  flagDuplicatesWithinFile(rows);
  await flagDuplicatesInDatabase(rows, deps);

  const previewRows = rows.map((row) => {
    const hasDuplicate = row.errors.some((error) => error.type === "duplicate");
    const hasInvalid = row.errors.some((error) => error.type === "validation");

    return {
      rowNumber: row.rowNumber,
      status: hasInvalid ? "invalid" : hasDuplicate ? "duplicate" : "valid",
      data: row.data,
      errors: row.errors,
    };
  });

  const invalidRows = previewRows.filter((row) => row.errors.length > 0).length;

  return {
    success: true,
    fileName,
    summary: {
      totalRows: previewRows.length,
      validRows: previewRows.length - invalidRows,
      invalidRows,
      duplicateRows: previewRows.filter((row) =>
        row.errors.some((error) => error.type === "duplicate")
      ).length,
      skippedEmptyRows,
    },
    ignoredColumns,
    rows: previewRows,
    canImport: previewRows.length > 0 && invalidRows === 0,
  };
};

// Gives rows without an admission number the next free numbers for their
// session, continuing after the highest number in the database AND any number
// supplied elsewhere in the same file.
const assignAdmissionNumbers = async (students, deps) => {
  const prefixes = new Set(
    students
      .filter((student) => !student.admission_number)
      .map((student) => getAdmissionNumberPrefix(student.session))
  );

  const nextSequence = new Map();

  for (const prefix of prefixes) {
    let highest;
    try {
      highest = await deps.getHighestAdmissionSequence(prefix);
    } catch (error) {
      console.error("Import admission number error:", error);
      throw new ImportError(
        "Could not generate admission numbers. No students were imported. Please try again.",
        502
      );
    }

    for (const student of students) {
      const sequence = parseAdmissionSequence(student.admission_number, prefix);
      if (!Number.isNaN(sequence) && sequence > highest) highest = sequence;
    }

    nextSequence.set(prefix, highest + 1);
  }

  for (const student of students) {
    if (student.admission_number) continue;

    const prefix = getAdmissionNumberPrefix(student.session);
    const sequence = nextSequence.get(prefix);

    student.admission_number = formatAdmissionNumber(prefix, sequence);
    nextSequence.set(prefix, sequence + 1);
  }
};

// Re-parses and re-validates the uploaded file (never trusting an earlier
// preview), then inserts every student in one all-or-nothing request.
export const importStudentsFromFile = async (buffer, fileName, deps = defaultDeps) => {
  const preview = await buildImportPreview(buffer, fileName, deps);

  if (!preview.canImport) {
    throw new ImportError(
      "The file has errors, so no students were imported. Fix the highlighted rows and upload it again.",
      422,
      preview
    );
  }

  const records = preview.rows.map((row) => ({
    rowNumber: row.rowNumber,
    student: pickStudentFields(row.data),
  }));

  // Same shape as the single-student form: blank admission numbers are generated.
  for (const record of records) {
    record.student.admission_number = record.student.admission_number || null;
  }

  await assignAdmissionNumbers(
    records.map((record) => record.student),
    deps
  );

  const { data, error } = await deps.insertStudents(
    records.map((record) => record.student)
  );

  if (error) {
    console.error("Bulk insert students error:", error);

    if (error.code === "23505") {
      throw new ImportError(
        "A student with one of these emails, application numbers or admission numbers was saved while the import was running. No students were imported. Preview the file again and retry.",
        409
      );
    }

    throw new ImportError(
      "Failed to save the students. No students were imported.",
      500
    );
  }

  const savedByApplicationNumber = new Map(
    (data || []).map((student) => [matchKey(student.application_number), student])
  );

  return {
    success: true,
    message: `${records.length} student${records.length === 1 ? "" : "s"} imported successfully.`,
    importedCount: records.length,
    students: records.map(({ rowNumber, student }) => {
      const saved = savedByApplicationNumber.get(matchKey(student.application_number));

      return {
        rowNumber,
        id: saved?.id ?? null,
        full_name: student.full_name,
        email: student.email,
        application_number: student.application_number,
        admission_number: saved?.admission_number ?? student.admission_number,
      };
    }),
  };
};
