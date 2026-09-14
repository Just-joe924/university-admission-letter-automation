import { useEffect, useState } from "react";
import { Download, FileText, Loader2, Mail, X } from "lucide-react";

import {
  generateAdmissionLetter,
  getAdmissionLetterByStudent,
  resendAdmissionLetterEmail,
} from "../../services/admissionLetterApi";
import { downloadFileFromUrl } from "../../utils/downloadFile";

export default function StudentDetailsModal({ student, onClose, onUpdated }) {
  const [letter, setLetter] = useState(null);
  const [loadingLetter, setLoadingLetter] = useState(true);
  const [busyAction, setBusyAction] = useState(null); // "generate" | "resend" | "download"
  const [feedback, setFeedback] = useState(null); // { type: "success" | "error", message }

  useEffect(() => {
    let cancelled = false;

    const loadLetter = async () => {
      try {
        setLoadingLetter(true);
        const data = await getAdmissionLetterByStudent(student.id);
        if (!cancelled) setLetter(data.admissionLetter);
      } catch (error) {
        if (cancelled) return;
        setLetter(null);

        // A 404 just means no letter has been generated yet. Anything else
        // (backend unreachable, CORS, server error) must be visible, otherwise
        // the buttons silently look disabled for no reason.
        if (error.response?.status !== 404) {
          console.error("Fetch admission letter error:", error);
          setFeedback({
            type: "error",
            message: error.response
              ? errorMessage(error, "Failed to load the admission letter.")
              : "Could not reach the server to load the admission letter. Please try again.",
          });
        }
      } finally {
        if (!cancelled) setLoadingLetter(false);
      }
    };

    loadLetter();

    return () => {
      cancelled = true;
    };
  }, [student.id]);

  const hasLetter = Boolean(letter?.pdf_url);
  const letterGenerated = hasLetter || Boolean(student.letter_generated);
  const isBusy = Boolean(busyAction);

  const handleView = () => {
    setFeedback(null);

    if (!hasLetter) {
      setFeedback({
        type: "error",
        message: "No admission letter yet. Generate one first.",
      });
      return;
    }

    window.open(letter.pdf_url, "_blank", "noopener,noreferrer");
  };

  const handleGenerate = async () => {
    setFeedback(null);

    try {
      setBusyAction("generate");
      const data = await generateAdmissionLetter(student.id);
      setLetter(data.admissionLetter);
      setFeedback({
        type: "success",
        message: data?.message || "Admission letter generated.",
      });
      onUpdated?.();
    } catch (error) {
      console.error("Generate admission letter error:", error);
      setFeedback({
        type: "error",
        message: errorMessage(error, "Failed to generate admission letter."),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleResend = async () => {
    setFeedback(null);

    try {
      setBusyAction("resend");
      const data = await resendAdmissionLetterEmail(student.id);
      setFeedback({
        type: "success",
        message:
          data?.message || `Admission letter email queued for ${student.email}.`,
      });
    } catch (error) {
      console.error("Resend admission letter error:", error);
      setFeedback({
        type: "error",
        message: errorMessage(error, "Failed to resend admission letter email."),
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async () => {
    setFeedback(null);

    if (!hasLetter) {
      setFeedback({
        type: "error",
        message: "No admission letter yet. Generate one first.",
      });
      return;
    }

    try {
      setBusyAction("download");
      await downloadFileFromUrl(
        letter.pdf_url,
        `admission-letter-${student.admission_number || student.id}.pdf`
      );
    } catch (error) {
      console.error("Download admission letter error:", error);
      setFeedback({
        type: "error",
        message: "Failed to download the admission letter. Please try again.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-primary">Student Details</h2>

          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-900" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <section className="rounded-xl bg-slate-50 p-5">
            <h3 className="mb-4 text-base font-semibold text-slate-950">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailItem label="Full Name" value={student.full_name} />
              <DetailItem label="Email Address" value={student.email} />
            </div>
          </section>

          <section className="rounded-xl bg-slate-50 p-5">
            <h3 className="mb-4 text-base font-semibold text-slate-950">
              Academic Information
            </h3>

            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              <DetailItem label="Department" value={student.department} />
              <DetailItem label="Course" value={student.course} />
              <DetailItem label="Mode of Entry" value={student.mode_of_entry} />
              <DetailItem label="Session" value={student.session} />
              <DetailItem
                label="Application Number"
                value={student.application_number}
              />
              <DetailItem
                label="Admission Number"
                value={student.admission_number}
              />
            </div>
          </section>

          <section className="rounded-xl bg-slate-50 p-5">
            <h3 className="mb-4 text-base font-semibold text-slate-950">
              Status Information
            </h3>

            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-slate-600">
                Letter Status:
              </p>

              <span
                className={[
                  "rounded-full px-4 py-1 text-xs",
                  letterGenerated
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700",
                ].join(" ")}
              >
                {letterGenerated ? "Generated" : "Pending"}
              </span>
            </div>

            {letter?.letter_reference && (
              <p className="mt-3 text-xs text-slate-600">
                Letter Ref.: {letter.letter_reference}
              </p>
            )}
          </section>

          <div className="space-y-3">
            <ActionButton
              color="bg-blue-600 hover:bg-blue-700"
              icon={FileText}
              onClick={handleView}
              disabled={loadingLetter || !hasLetter || isBusy}
            >
              View Admission Letter
            </ActionButton>

            <ActionButton
              color="bg-green-600 hover:bg-green-700"
              icon={FileText}
              onClick={handleGenerate}
              disabled={loadingLetter || isBusy}
              loading={busyAction === "generate"}
            >
              {busyAction === "generate"
                ? "Generating..."
                : hasLetter
                  ? "Regenerate Admission Letter"
                  : "Generate Admission Letter"}
            </ActionButton>

            <ActionButton
              color="bg-purple-600 hover:bg-purple-700"
              icon={Mail}
              onClick={handleResend}
              disabled={loadingLetter || !hasLetter || isBusy}
              loading={busyAction === "resend"}
            >
              {busyAction === "resend" ? "Sending..." : "Resend Email"}
            </ActionButton>

            <ActionButton
              color="bg-slate-600 hover:bg-slate-700"
              icon={Download}
              onClick={handleDownload}
              disabled={loadingLetter || !hasLetter || isBusy}
              loading={busyAction === "download"}
            >
              {busyAction === "download" ? "Preparing..." : "Download PDF"}
            </ActionButton>

            {loadingLetter && (
              <p className="text-center text-sm text-slate-500">
                Checking admission letter...
              </p>
            )}

            {!loadingLetter && !hasLetter && !feedback && (
              <p className="text-center text-sm text-slate-500">
                Generate the admission letter to enable viewing, downloading and
                emailing.
              </p>
            )}

            {feedback && (
              <p
                className={[
                  "text-center text-sm",
                  feedback.type === "success" ? "text-green-600" : "text-red-600",
                ].join(" ")}
              >
                {feedback.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function errorMessage(error, fallback) {
  const data = error.response?.data;
  return [data?.message, data?.detail].filter(Boolean).join(": ") || fallback;
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
      <p className="text-sm text-slate-950 break-words">{value || "—"}</p>
    </div>
  );
}

function ActionButton({
  children,
  color,
  icon: Icon,
  onClick,
  disabled = false,
  loading = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      {children}
    </button>
  );
}
