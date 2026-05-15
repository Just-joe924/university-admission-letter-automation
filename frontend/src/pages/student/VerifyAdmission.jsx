import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { verifyStudent } from "../../services/studentApi";

/**
 * VerifyAdmission Page
 * ─────────────────────
 * Allows a student to verify their admission by entering their
 * registered email and application number.
 *
 * On success → navigates to /admission-success with student data.
 * On failure → shows the error message returned by the backend.
 */
export default function VerifyAdmission() {
  const navigate = useNavigate();

  // Form field values
  const [email, setEmail] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");

  // UI state
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!applicationNumber.trim()) {
      newErrors.applicationNumber = "Application number is required.";
    } else if (!/^APP\d+$/i.test(applicationNumber.trim())) {
      newErrors.applicationNumber =
        "Application number must follow the format: APP2025001.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit Handler ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setLoading(true);
    try {
      const data = await verifyStudent({
        email: email.trim().toLowerCase(),
        application_number: applicationNumber.trim().toUpperCase(),
      });

      navigate("/admission-success", { state: { student: data.student } });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Reusable field component ─────────────────────────────────────────────────
  const Field = ({ id, label, type = "text", value, onChange, placeholder, error, mono = false }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5 text-primary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={loading}
        autoComplete={type === "email" ? "email" : "off"}
        className={[
          "w-full px-4 py-3 rounded-lg text-sm outline-none transition-all",
          "bg-input-background text-foreground placeholder:text-muted-foreground",
          "border focus:border-primary focus:bg-card focus:ring-3 focus:ring-accent",
          error ? "border-destructive bg-destructive/5" : "border-border",
          mono ? "font-mono tracking-wider" : "",
          loading ? "opacity-60 cursor-not-allowed" : "",
        ].join(" ")}
      />
      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-primary">

      {/* ── Header ── */}
      <header className="py-5 px-6 flex items-center justify-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground font-bold bg-white/15 border border-white/30">
            ⚜
          </div>
          <span
            className="text-primary-foreground font-semibold tracking-widest text-sm uppercase"
            style={{ fontFamily: "Georgia, serif" }}
          >
            University Admissions Portal
          </span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Decorative divider */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="h-px flex-1 max-w-16 bg-accent/40" />
            <span
              className="text-accent-foreground/40 text-xs tracking-widest uppercase"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Admission Verification
            </span>
            <div className="h-px flex-1 max-w-16 bg-accent/40" />
          </div>

          {/* ── Card ── */}
          <div className="bg-card rounded-2xl p-8 shadow-2xl">

            {/* Card heading */}
            <div className="mb-7 text-center">
              <h1
                className="text-2xl font-bold text-primary mb-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Verify Your Admission
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your registered email and application number to confirm your admission status.
              </p>
            </div>

            {/* ── Server Error Alert ── */}
            {serverError && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg text-sm bg-destructive/8 border border-destructive/20 text-destructive">
                <span className="mt-0.5 text-base leading-none">⚠</span>
                <span>{serverError}</span>
              </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Field
                id="email"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="e.g. john.doe@example.com"
                error={errors.email}
              />

              <Field
                id="applicationNumber"
                label="Application Number"
                value={applicationNumber}
                onChange={(e) => {
                  setApplicationNumber(e.target.value);
                  if (errors.applicationNumber)
                    setErrors((prev) => ({ ...prev, applicationNumber: "" }));
                }}
                placeholder="e.g. APP2025001"
                error={errors.applicationNumber}
                mono
              />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-lg font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-secondary disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  "Verify Admission Status"
                )}
              </button>
            </form>

            {/* Footer note */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              Having trouble?{" "}
              <a
                href="mailto:admissions@university.edu"
                className="underline hover:text-foreground transition-colors"
              >
                Contact the Admissions Office
              </a>
            </p>
          </div>

          {/* Bottom tagline */}
          <p
            className="text-center text-primary-foreground/30 text-xs mt-6 tracking-wider uppercase"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Securing futures through education
          </p>
        </div>
      </main>
    </div>
  );
}