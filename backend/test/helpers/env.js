// Imported first by every test: points the Supabase client at a dummy project
// so tests can never read or write real data. dotenv does not override these.
export const FAKE_SUPABASE_URL = "http://127.0.0.1:9";

process.env.SUPABASE_URL = FAKE_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.DOTENV_CONFIG_QUIET = "true";

// Requests to the dummy project go to a swappable in-memory handler; anything
// else (e.g. servers started by a test) uses the real fetch.
const realFetch = globalThis.fetch;
let supabaseHandler = null;

export const setSupabaseHandler = (handler) => {
  supabaseHandler = handler;
};

globalThis.fetch = async (input, init) => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (!url.startsWith(FAKE_SUPABASE_URL)) {
    return realFetch(input, init);
  }

  if (!supabaseHandler) {
    throw new Error(`Unexpected Supabase request in a test: ${init?.method || "GET"} ${url}`);
  }

  return supabaseHandler(new URL(url), init);
};
