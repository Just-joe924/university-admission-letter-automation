import { supabase } from "../config/supabase.js";
import { IMPORT_STATUSES } from "../constants/importStatus.js";

// Columns returned for the history list (no error details or file metadata).
const SUMMARY_COLUMNS =
  "id, original_filename, file_type, status, total_rows, valid_rows, invalid_rows, duplicate_rows, imported_rows, failed_rows, admin_id, admin_name, created_at, completed_at";

const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, admin_auth_user_id, error_summary, metadata`;

// Filename search is a plain text filter; strip anything that could change the
// meaning of the PostgREST pattern.
const safeSearchTerm = (search) => String(search).replace(/[^\w .-]/g, "").trim();

export const createImportRecordService = async (record) =>
  supabase.from("student_imports").insert([record]).select(DETAIL_COLUMNS).single();

// Atomically claims a previewed import for this admin: the conditional UPDATE
// succeeds for exactly one request, so the same preview can't be imported
// twice (a double click, a retry, or two tabs).
export const claimPreviewedImportService = async ({ importId, adminAuthUserId }) =>
  supabase
    .from("student_imports")
    .update({ status: IMPORT_STATUSES.PROCESSING })
    .eq("id", importId)
    .eq("status", IMPORT_STATUSES.PREVIEWED)
    .eq("admin_auth_user_id", adminAuthUserId)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

// Only ever called with fields built by the backend, never with client input.
export const updateImportRecordService = async (importId, updates) =>
  supabase
    .from("student_imports")
    .update(updates)
    .eq("id", importId)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

export const getImportRecordService = async (importId, { adminAuthUserId } = {}) => {
  let query = supabase.from("student_imports").select(DETAIL_COLUMNS).eq("id", importId);

  if (adminAuthUserId) query = query.eq("admin_auth_user_id", adminAuthUserId);

  return query.maybeSingle();
};

export const listImportRecordsService = async ({
  page,
  pageSize,
  status,
  search,
  from,
  to,
  adminAuthUserId,
}) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("student_imports")
    .select(SUMMARY_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Previews that were never submitted are noise; they are only listed when
  // asked for by status.
  if (status) query = query.eq("status", status);
  else query = query.neq("status", IMPORT_STATUSES.PREVIEWED);

  if (adminAuthUserId) query = query.eq("admin_auth_user_id", adminAuthUserId);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const term = search ? safeSearchTerm(search) : "";
  if (term) query = query.ilike("original_filename", `%${term}%`);

  const { data, error, count } = await query;

  return { data, error, count };
};
