// Imported first by every test: points the Supabase client at a dummy project
// so tests can never read or write real data. dotenv does not override these.
process.env.SUPABASE_URL = "http://127.0.0.1:9";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.DOTENV_CONFIG_QUIET = "true";
