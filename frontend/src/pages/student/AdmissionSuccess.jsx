import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleCheckBig,
  FileText,
  Download,
  Mail,
  UserRound,
} from "lucide-react";
import culLogo from "../../assets/images/cul_logo_rect.png";

/**
 * AdmissionSuccess Page
 * ──────────────────────
 * Matches the provided UI design exactly:
 * - White header with university branding
 * - Green "Verification Successful!" banner
 * - Admission Details card with 2-column label/value grid
 * - "Next Steps" action buttons section
 * - "← Return to Home" link
 */
export default function AdmissionSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const student = location.state?.student;

  // Redirect if no student data (e.g. direct URL access)
  useEffect(() => {
    if (!student) {
      navigate("/student", { replace: true });
    }
  }, [student, navigate]);

  if (!student) return null;

  // ── Reusable detail cell ─────────────────────────────────────────────────────
  const DetailCell = ({ label, value, mono = false, children }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {children ?? (
        <p className={["text-sm font-medium text-foreground", mono ? "font-mono" : ""].join(" ")}>
          {value || "—"}
        </p>
      )}
    </div>
  );

  // ── Reusable outlined action button ─────────────────────────────────────────
  const OutlineButton = ({ onClick, icon, children }) => (
    <button
      onClick={onClick}
      className="w-full py-3 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2"
    >
      {icon}
      {children}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Top Header (same as VerifyAdmission) ── */}
      <header className="bg-card border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="w-40 h-20 flex items-center justify-center flex-shrink-0">
            <img className = "w-full h-full" src= {culLogo}/>
        </div>
        <div>
          <p className="font-bold text-sm text-foreground leading-tight">
            Caleb University
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            Admission Verification Portal
          </p>
        </div>
      </header>

      {/* ── Page Body ── */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto">

          {/* ── Green Success Banner ── */}
          <div className="rounded-t-xl px-6 py-5 flex items-center gap-4 bg-green-500">
            {/* Circle checkmark */}
            <div className="w-16 h-16 rounded-md flex items-center justify-center flex-shrink-0 bg-white/20">
              <CircleCheckBig  className ="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">
                Verification Successful!
              </h1>
              <p className="text-white/80 text-sm mt-0.5">
                Your admission has been confirmed
              </p>
            </div>
          </div>

          {/* ── Admission Details Card ── */}
          <div className="bg-card px-6 rounded-b-xl border border-border shadow-lg overflow-hidden">

            {/* Card heading */}
            <div className="px-5 pb-4 pt-6 flex items-center gap-2">
              <UserRound className="w-5 h-5" />
              <h2 className="text-sm font-semibold text-foreground">Admission Details</h2>
            </div>

            {/* Detail rows — 2-column grid, each row separated by a border */}
            <div className="">

              {/* Row 1: Full Name | Mode of Entry */}
              <div className="grid grid-cols-2 px-5 py-1 gap-4">
                <DetailCell label="Full Name" value={student.full_name} />
                <DetailCell label="Mode of Entry">
                  {/* Pill badge */}
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground border border-secondary/20">
                    {student.mode_of_entry}
                  </span>
                </DetailCell>
              </div>

              {/* Row 2: Email Address | Application Number */}
              <div className="grid grid-cols-2 px-5 py-2 gap-4">
                <DetailCell label="Email Address" value={student.email} />
                <DetailCell label="Application Number" value={student.application_number} mono />
              </div>

              {/* Row 3: Department | Admission Number */}
              <div className="grid grid-cols-2 px-5 py-2 gap-4">
                <DetailCell label="Department" value={student.department} />
                <DetailCell label="Admission Number" value={student.admission_number} mono />
              </div>

              {/* Row 4: Course of Study | Academic Session */}
              <div className="grid grid-cols-2 px-5 pt-2 pb-6 gap-4">
                <DetailCell label="Course of Study" value={student.course} />
                <DetailCell label="Academic Session" value={student.session} />
              </div>

              {/* Row 5: Admission Status — full width with green badge on the right */}
              <div className="px-5 py-3.5 flex items-center justify-between border-t border-border">
                <p className="text-xs text-muted-foreground">Admission Status:</p>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 p-3 rounded-lg">
                  <CircleCheckBig  className ="text-green-600 w-4 h-4" />
                  Verified &amp; Active
                </span>
              </div>

            </div>
          </div>

          {/* ── Next Steps Section ── */}
          <div className="bg-card rounded-xl my-6 border border-border shadow-lg overflow-hidden p-3 text-accent-foreground">
            <h2 className="text-sm font-bold text-foreground m-3">Next Steps</h2>

            <div className="space-y-3">

              {/* View Admission Letter — filled navy (disabled if not generated) */}
              <button
                disabled={!student.letter_generated}
                title={!student.letter_generated ? "Your admission letter is being prepared." : ""}
                className="w-full py-3 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {/* Document icon */}
                <FileText className = "w-5 h-5" />
                View Admission Letter
              </button>

              {/* Download as PDF */}
              <OutlineButton
                onClick={() => {}}
                icon={
                  <Download className = "w-5 h-5"/>
                }
              >
                Download as PDF
              </OutlineButton>

              {/* Send to Email */}
              <OutlineButton
                onClick={() => {}}
                icon={
                  <Mail className = "w-5 h-5"/>
                }
              >
                Send to Email
              </OutlineButton>

            </div>

            {/* Return to Home link */}
            <div className="text-center m-5 ">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-secondary hover:text-foreground transition-colors flex items-center justify-center gap-1 mx-auto"
              >
               <ArrowLeft className="w-4 h-4"/>
                Return to Home
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}