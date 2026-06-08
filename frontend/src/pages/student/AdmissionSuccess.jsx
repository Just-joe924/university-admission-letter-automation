import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CircleCheckBig,
  FileText,
  Download,
  Mail,
  UserRound,
  Loader2,
} from "lucide-react";
import culLogo from "../../assets/images/cul_logo_rect.png";
import {
  downloadAdmissionLetterPdf,
  sendAdmissionLetterToStudent,
} from "../../services/admissionLetterApi";

export default function AdmissionSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const student = location.state?.student;

  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "success" | "error", message }

  // Redirect if no student data (e.g. direct URL access)
  useEffect(() => {
    if (!student) {
      navigate("/student", { replace: true });
    }
  }, [student, navigate]);

  if (!student) return null;

  const handleViewLetter = () => {
    navigate("/letter", { state: { student } });
  };

  const handleDownload = async () => {
    setFeedback(null);
    try {
      setDownloading(true);
      const blob = await downloadAdmissionLetterPdf(student.id);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `admission-letter-${student.admission_number || student.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      setFeedback({
        type: "error",
        message: "Failed to download the admission letter. Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setFeedback(null);
    try {
      setSending(true);
      const data = await sendAdmissionLetterToStudent(student.id);
      setFeedback({
        type: "success",
        message:
          data?.message || `Admission letter sent to ${student.email}.`,
      });
    } catch (error) {
      console.error("Send email error:", error);
      const data = error.response?.data;
      setFeedback({
        type: "error",
        message:
          [data?.message, data?.detail].filter(Boolean).join(": ") ||
          "Failed to send the admission letter. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  // ── Reusable detail cell ─────────────────────────────────────────────────────
  const DetailCell = ({ label, value, mono = false, children }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {children ?? (
        <p className={["text-sm font-medium text-foreground break-words", mono ? "font-mono" : ""].join(" ")}>
          {value || "—"}
        </p>
      )}
    </div>
  );

  // ── Reusable outlined action button ─────────────────────────────────────────
  const OutlineButton = ({ onClick, icon, children, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-lg text-sm font-medium text-foreground border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Top Header (same as VerifyAdmission) ── */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="h-14 sm:h-20 w-auto flex items-center justify-center flex-shrink-0">
            <img className="h-full w-auto object-contain" src={culLogo} alt="Caleb University Logo" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 px-5 py-1 gap-4">
                <DetailCell label="Full Name" value={student.full_name} />
                <DetailCell label="Mode of Entry">
                  {/* Pill badge */}
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground border border-secondary/20">
                    {student.mode_of_entry}
                  </span>
                </DetailCell>
              </div>

              {/* Row 2: Email Address | Application Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 px-5 py-2 gap-4">
                <DetailCell label="Email Address" value={student.email} />
                <DetailCell label="Application Number" value={student.application_number} mono />
              </div>

              {/* Row 3: Department | Admission Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 px-5 py-2 gap-4">
                <DetailCell label="Department" value={student.department} />
                <DetailCell label="Admission Number" value={student.admission_number} mono />
              </div>

              {/* Row 4: Course of Study | Academic Session */}
              <div className="grid grid-cols-1 sm:grid-cols-2 px-5 pt-2 pb-6 gap-4">
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

              {/* View Admission Letter — filled navy */}
              <button
                onClick={handleViewLetter}
                className="w-full py-3 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-secondary transition-colors flex items-center justify-center gap-2"
              >
                {/* Document icon */}
                <FileText className = "w-5 h-5" />
                View Admission Letter
              </button>

              {/* Download as PDF */}
              <OutlineButton
                onClick={handleDownload}
                disabled={downloading}
                icon={
                  downloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )
                }
              >
                {downloading ? "Preparing..." : "Download as PDF"}
              </OutlineButton>

              {/* Send to Email */}
              <OutlineButton
                onClick={handleSendEmail}
                disabled={sending}
                icon={
                  sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )
                }
              >
                {sending ? "Sending..." : "Send to Email"}
              </OutlineButton>

              {/* Action feedback */}
              {feedback && (
                <p
                  className={[
                    "text-sm text-center",
                    feedback.type === "success"
                      ? "text-green-600"
                      : "text-destructive",
                  ].join(" ")}
                >
                  {feedback.message}
                </p>
              )}

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