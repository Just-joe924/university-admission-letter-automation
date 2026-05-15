import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * AdmissionSuccess Page
 * ──────────────────────
 * Displays the verified student's admission details in a structured card.
 * Data is received via React Router's location.state (passed from VerifyAdmission).
 *
 * If no student data is found in state, the user is redirected back to /student.
 */
export default function AdmissionSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  // Pull student from React Router state
  const student = location.state?.student;

  // Redirect guard: if no student data, send back to the verification page
  useEffect(() => {
    if (!student) {
      navigate("/student", { replace: true });
    }
  }, [student, navigate]);

  // Don't render anything while redirecting
  if (!student) return null;

  // ── DetailRow: reusable label/value display ──────────────────────────────────
  const DetailRow = ({ label, value, mono = false }) => (
    <div className="py-3.5 px-4 rounded-lg bg-muted">
      <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          "text-sm font-semibold text-primary",
          mono ? "font-mono tracking-wider" : "",
        ].join(" ")}
      >
        {value || "—"}
      </p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <header className="py-5 px-6 flex items-center justify-between bg-primary shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground font-bold bg-white/15 border border-white/25">
            ⚜
          </div>
          <span
            className="text-primary-foreground font-semibold text-sm tracking-widest uppercase"
            style={{ fontFamily: "Georgia, serif" }}
          >
            University Admissions Portal
          </span>
        </div>

        <button
          onClick={() => navigate("/")}
          className="text-primary-foreground/60 hover:text-primary-foreground text-xs tracking-wide transition-colors flex items-center gap-1.5"
        >
          <span>←</span> Home
        </button>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* ── Success Banner ── */}
          <div className="rounded-xl px-6 py-4 mb-6 flex items-center gap-4 bg-primary shadow-lg shadow-primary/25">
            {/* Checkmark circle */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white/15 border-2 border-white/40">
              <svg
                className="w-6 h-6 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h1
                className="text-primary-foreground font-bold text-lg"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Admission Verified
              </h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">
                Congratulations, {student.full_name.split(" ")[0]}! Your admission has been confirmed.
              </p>
            </div>

            {/* Verified badge */}
            <div className="ml-auto flex-shrink-0">
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-green-500 text-white">
                ✓ Verified
              </span>
            </div>
          </div>

          {/* ── Details Card ── */}
          <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">

            {/* Card top bar */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <div>
                <h2
                  className="font-bold text-base text-primary"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Admission Details
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Academic Session {student.session}
                </p>
              </div>
              {/* Mode of Entry badge */}
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent text-accent-foreground border border-secondary/20">
                {student.mode_of_entry}
              </span>
            </div>

            {/* Detail grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow label="Full Name" value={student.full_name} />
              <DetailRow label="Email Address" value={student.email} />
              <DetailRow label="Department" value={student.department} />
              <DetailRow label="Course of Study" value={student.course} />
              <DetailRow label="Admission Number" value={student.admission_number} mono />
              <DetailRow label="Application Number" value={student.application_number} mono />
            </div>

            {/* Email / status strip */}
            <div className="mx-6 mb-6 rounded-lg px-4 py-3 flex items-center gap-3 bg-green-50 border border-green-200">
              <svg
                className="w-4 h-4 flex-shrink-0 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-green-800">
                <span className="font-semibold">Verification complete. </span>
                {student.email_sent
                  ? "A confirmation email has been sent to your inbox."
                  : "Your admission record is confirmed in our system."}
              </p>
            </div>

            {/* ── Action Buttons ── */}
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">

              {/* Download Admission Letter */}
              <button
                disabled={!student.letter_generated}
                title={
                  !student.letter_generated
                    ? "Your admission letter is being generated. Check back soon."
                    : ""
                }
                className={[
                  "flex-1 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                  student.letter_generated
                    ? "bg-primary text-primary-foreground hover:bg-secondary shadow-md shadow-primary/25"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                ].join(" ")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {student.letter_generated ? "Download Admission Letter" : "Letter Not Yet Available"}
              </button>

              {/* Return to Homepage */}
              <button
                onClick={() => navigate("/")}
                className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                ← Return to Homepage
              </button>
            </div>

            {/* Explanatory note when letter isn't ready */}
            {!student.letter_generated && (
              <p className="text-center text-xs text-muted-foreground pb-5 px-6">
                📄 Your admission letter is being prepared. Please check back in 24–48 hours or contact the admissions office.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}