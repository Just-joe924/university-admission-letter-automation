import { supabase } from "../config/supabase.js";
import { IMPORT_ROW_INSERT_CHUNK_SIZE } from "../constants/importStatus.js";

const ROW_COLUMNS =
  "row_number, status, student_id, application_number, email, row_data, errors";

export const createImportRowsService = async (rows) => {
  for (let i = 0; i < rows.length; i += IMPORT_ROW_INSERT_CHUNK_SIZE) {
    const { error } = await supabase
      .from("student_import_rows")
      .insert(rows.slice(i, i + IMPORT_ROW_INSERT_CHUNK_SIZE));

    if (error) return { error };
  }

  return { error: null };
};

export const listImportRowsService = async ({ importId, statuses, page, pageSize }) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("student_import_rows")
    .select(ROW_COLUMNS, { count: "exact" })
    .eq("import_id", importId)
    .order("row_number", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (statuses?.length) query = query.in("status", statuses);

  const { data, error, count } = await query;

  return { data, error, count };
};

// Rows for a downloaded error report, built from stored results only: the
// original spreadsheet is never needed again.
export const getImportRowsForReportService = async ({ importId, statuses, limit }) =>
  supabase
    .from("student_import_rows")
    .select(ROW_COLUMNS)
    .eq("import_id", importId)
    .in("status", statuses)
    .order("row_number", { ascending: true })
    .limit(limit);
