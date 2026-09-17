import { createHash } from "node:crypto";

import {
  IMPORT_ERROR_SUMMARY_LIMIT,
  IMPORT_ROW_STATUSES,
  IMPORT_STATUSES,
} from "../constants/importStatus.js";
import { IMPORT_COLUMNS } from "../constants/studentImport.js";
import { ImportError } from "../utils/importError.js";
import { getFileExtension, parseSpreadsheet } from "../utils/parseSpreadsheet.js";
import { validateStudentRecord } from "../utils/validateStudent.js";
import {
  claimPreviewedImportService,
  createImportRecordService,
  updateImportRecordService,
} from "./importHistory.service.js";
import { createImportRowsService } from "./importRow.service.js";
import {
  ADMISSION_NUMBERING_NOT_READY,
  createStudentsService,
  findStudentsByUniqueFieldsService,
  isAdmissionNumberConflict,
} from "./student.service.js";

// Database access is injectable so the import logic can be tested without Supabase.
const defaultDeps = {
  findExistingStudents: findStudentsByUniqueFieldsService,
  insertStudents: createStudentsService,
  createImportRecord: createImportRecordService,
  claimImport: claimPreviewedImportService,
  updateImport: updateImportRecordService,
  saveImportRows: createImportRowsService,
};

// Unique student columns supplied in the file. Compared case-insensitively, so
// "A@x.com" and "a@x.com" count as the same student. Admission numbers are not
// here: the database generates them during the insert.
const UNIQUE_FIELDS = [
  { field: "email", label: "Email" },
  { field: "application_number", label: "Application number" },
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
  `﻿${IMPORT_COLUMNS.map((column) => column.key).join(",")}\r\n`;

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

const hashBuffer = (buffer) => createHash("sha256").update(buffer).digest("hex");

const baseRecordFields = ({ admin, fileName, buffer, preview }) => ({
  admin_id: admin?.id ?? null,
  admin_auth_user_id: admin?.authUserId ?? null,
  admin_name: admin?.name ?? null,
  original_filename: fileName,
  file_type: getFileExtension(fileName).replace(".", "") || null,
  total_rows: preview.summary.totalRows,
  valid_rows: preview.summary.validRows,
  invalid_rows: preview.summary.invalidRows,
  duplicate_rows: preview.summary.duplicateRows,
  // The file itself is never stored: only its size and a fingerprint used to
  // confirm the confirmed import is the file that was previewed.
  metadata: {
    fileHash: hashBuffer(buffer),
    fileSize: buffer.length,
    skippedEmptyRows: preview.summary.skippedEmptyRows,
    ignoredColumns: preview.ignoredColumns,
  },
});

// Counts the distinct errors in a file so the history shows why it failed
// without storing every message twice.
const buildErrorSummary = ({ type, message, rows = [] }) => {
  const counts = new Map();

  for (const row of rows) {
    for (const error of row.errors || []) {
      const key = `${error.type || "validation"}|${error.message}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const topErrors = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, IMPORT_ERROR_SUMMARY_LIMIT)
    .map(([key, count]) => ({
      type: key.slice(0, key.indexOf("|")),
      message: key.slice(key.indexOf("|") + 1),
      count,
    }));

  return {
    type,
    message,
    distinctErrors: counts.size,
    topErrors,
    truncated: counts.size > topErrors.length,
  };
};

const buildRowRecords = ({ importId, previewRows, savedStudents }) =>
  previewRows.map((row) => {
    const saved = savedStudents?.get(matchKey(row.data.application_number || ""));

    if (saved) {
      return {
        import_id: importId,
        row_number: row.rowNumber,
        status: IMPORT_ROW_STATUSES.IMPORTED,
        student_id: saved.id ?? null,
        application_number: row.data.application_number || null,
        email: row.data.email || null,
        row_data: null,
        errors: null,
      };
    }

    const hasValidationError = row.errors.some((error) => error.type === "validation");
    const hasDuplicateError = row.errors.some((error) => error.type === "duplicate");
    const hasDatabaseError = row.errors.some((error) => error.type === "database");

    let status = IMPORT_ROW_STATUSES.SKIPPED;
    if (hasDatabaseError) status = IMPORT_ROW_STATUSES.FAILED;
    else if (hasValidationError) status = IMPORT_ROW_STATUSES.INVALID;
    else if (hasDuplicateError) status = IMPORT_ROW_STATUSES.DUPLICATE;

    return {
      import_id: importId,
      row_number: row.rowNumber,
      status,
      student_id: null,
      application_number: row.data.application_number || null,
      email: row.data.email || null,
      row_data: row.data,
      errors: row.errors.length ? row.errors : null,
    };
  });

const saveRowResults = async (record, rowRecords, deps) => {
  if (!record || rowRecords.length === 0) return true;

  const { error } = await deps.saveImportRows(rowRecords);

  if (error) {
    console.error("Save import row results error:", error);
    return false;
  }

  return true;
};

const finishImport = async (record, updates, deps) => {
  if (!record) return null;

  const { data, error } = await deps.updateImport(record.id, {
    ...updates,
    completed_at: new Date().toISOString(),
  });

  if (error) console.error("Update import history error:", error);

  return data;
};

// Validates a file and records the attempt, so a confirmed import can be tied
// back to exactly this preview. History failures never block a preview.
export const previewImportFile = async ({ buffer, fileName, admin }, deps = defaultDeps) => {
  const preview = await buildImportPreview(buffer, fileName, deps);

  const { data, error } = await deps.createImportRecord({
    ...baseRecordFields({ admin, fileName, buffer, preview }),
    status: IMPORT_STATUSES.PREVIEWED,
  });

  if (error) console.error("Create import history record error:", error);

  return { ...preview, importId: data?.id ?? null };
};

// Re-parses and re-validates the uploaded file (never trusting an earlier
// preview), then inserts every student in one all-or-nothing request while
// recording what happened in the import history.
export const importStudentsFromFile = async (
  { buffer, fileName, importId = null, admin },
  deps = defaultDeps
) => {
  let record = null;

  if (importId) {
    const { data, error } = await deps.claimImport({
      importId,
      adminAuthUserId: admin?.authUserId ?? null,
    });

    if (error) {
      console.error("Claim import error:", error);
      throw new ImportError("Could not start the import. Please try again.", 500);
    }

    // The conditional update matches only a previewed import belonging to this
    // admin, so a second submission of the same preview finds nothing.
    if (!data) {
      throw new ImportError(
        "This file has already been submitted. Open Import History to see what happened.",
        409
      );
    }

    record = data;

    if (record.metadata?.fileHash && record.metadata.fileHash !== hashBuffer(buffer)) {
      await finishImport(
        record,
        {
          status: IMPORT_STATUSES.FAILED,
          error_summary: {
            type: "file_mismatch",
            message: "The submitted file was not the file that was previewed.",
          },
        },
        deps
      );

      throw new ImportError(
        "The file changed after it was previewed, so nothing was imported. Preview the new file and try again.",
        409
      );
    }
  }

  let preview;
  try {
    preview = await buildImportPreview(buffer, fileName, deps);
  } catch (error) {
    await finishImport(
      record,
      {
        status: IMPORT_STATUSES.FAILED,
        error_summary: {
          type: "file",
          message: error instanceof ImportError ? error.message : "The file could not be read.",
        },
      },
      deps
    );

    throw error;
  }

  if (!record) {
    // An import submitted without a preview id (e.g. an older client).
    const { data, error } = await deps.createImportRecord({
      ...baseRecordFields({ admin, fileName, buffer, preview }),
      status: IMPORT_STATUSES.PROCESSING,
    });

    if (error) console.error("Create import history record error:", error);
    record = data ?? null;
  }

  const counts = {
    total_rows: preview.summary.totalRows,
    valid_rows: preview.summary.validRows,
    invalid_rows: preview.summary.invalidRows,
    duplicate_rows: preview.summary.duplicateRows,
  };

  if (!preview.canImport) {
    const rowsStored = await saveRowResults(
      record,
      buildRowRecords({ importId: record?.id, previewRows: preview.rows }),
      deps
    );

    await finishImport(
      record,
      {
        ...counts,
        imported_rows: 0,
        failed_rows: preview.summary.totalRows,
        status: IMPORT_STATUSES.FAILED,
        error_summary: buildErrorSummary({
          type: "validation",
          message: "The file has rows that could not be imported.",
          rows: preview.rows,
        }),
        metadata: { ...(record?.metadata ?? {}), rowResultsStored: rowsStored },
      },
      deps
    );

    throw new ImportError(
      "The file has errors, so no students were imported. Fix the highlighted rows and upload it again.",
      422,
      { ...preview, importId: record?.id ?? null }
    );
  }

  const records = preview.rows.map((row) => ({
    rowNumber: row.rowNumber,
    student: pickStudentFields(row.data),
  }));

  const { data, error } = await deps.insertStudents(
    records.map((record_) => record_.student)
  );

  if (error) {
    console.error("Bulk insert students error:", error);

    const failureMessage =
      error.code === ADMISSION_NUMBERING_NOT_READY
        ? "Admission numbers could not be generated."
        : error.message || "The database rejected the students.";

    const rowsStored = await saveRowResults(
      record,
      buildRowRecords({
        importId: record?.id,
        previewRows: preview.rows.map((row) => ({
          ...row,
          errors: [{ field: null, type: "database", message: failureMessage }],
        })),
      }),
      deps
    );

    await finishImport(
      record,
      {
        ...counts,
        imported_rows: 0,
        failed_rows: preview.summary.totalRows,
        status: IMPORT_STATUSES.FAILED,
        error_summary: {
          type: error.code === ADMISSION_NUMBERING_NOT_READY ? "configuration" : "database",
          message: failureMessage,
          code: error.code ?? null,
        },
        metadata: { ...(record?.metadata ?? {}), rowResultsStored: rowsStored },
      },
      deps
    );

    if (error.code === ADMISSION_NUMBERING_NOT_READY) {
      throw new ImportError(
        "Admission numbers can't be generated right now, so no students were imported. Please contact the system administrator.",
        503
      );
    }

    if (isAdmissionNumberConflict(error)) {
      throw new ImportError(
        "Could not assign unique admission numbers, so no students were imported. Please try again.",
        409
      );
    }

    if (error.code === "23505") {
      throw new ImportError(
        "A student with one of these emails or application numbers was saved while the import was running. No students were imported. Preview the file again and retry.",
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

  const rowsStored = await saveRowResults(
    record,
    buildRowRecords({
      importId: record?.id,
      previewRows: preview.rows,
      savedStudents: savedByApplicationNumber,
    }),
    deps
  );

  // The insert is all-or-nothing, so reaching this point means every row was saved.
  await finishImport(
    record,
    {
      ...counts,
      imported_rows: records.length,
      failed_rows: 0,
      status: IMPORT_STATUSES.COMPLETED,
      error_summary: null,
      metadata: { ...(record?.metadata ?? {}), rowResultsStored: rowsStored },
    },
    deps
  );

  return {
    success: true,
    message: `${records.length} student${records.length === 1 ? "" : "s"} imported successfully.`,
    importId: record?.id ?? null,
    importedCount: records.length,
    students: records.map(({ rowNumber, student }) => {
      const saved = savedByApplicationNumber.get(matchKey(student.application_number));

      return {
        rowNumber,
        id: saved?.id ?? null,
        full_name: student.full_name,
        email: student.email,
        application_number: student.application_number,
        admission_number: saved?.admission_number ?? null,
      };
    }),
  };
};
