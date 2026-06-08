import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import culLogo from "../../assets/images/cul_logo_rect.png";
import { downloadAdmissionLetterPdf } from "../../services/admissionLetterApi";

const formatDate = (date = new Date()) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function ViewAdmissionLetter() {
  const location = useLocation();
  const navigate = useNavigate();

  const student = location.state?.student;

  const [downloading, setDownloading] = useState(false);

  // Redirect if no student data (e.g. direct URL access)
  useEffect(() => {
    if (!student) {
      navigate("/student", { replace: true });
    }
  }, [student, navigate]);

  if (!student) return null;

  const session = student.session || "2025/2026";

  const handleDownload = async () => {
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
      alert("Failed to download the admission letter. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => window.print();

  const DetailRow = ({ label, value }) => (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 break-words">{value || "—"}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="px-4 py-6 sm:py-8 print:p-0">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-4 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Letter */}
          <article className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
            {/* University header */}
            <header className="flex items-start gap-4">
              <img
                src={culLogo}
                alt="Caleb University logo"
                className="h-20 print:h-16 w-auto object-contain shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                  Caleb University
                </h1>
                <p className="text-sm text-slate-500 leading-snug mt-1">
                  Office of the Registrar
                  <br />
                  Ikorodu, Ibadan-Ijebu Ode Rd, Imota, Lagos State, Nigeria
                </p>
              </div>
            </header>

            <hr className="h-0.5 bg-[#48a0ff] border-0 my-6 print:my-3" />

            {/* Ref + date */}
            <div className="text-sm text-slate-600 leading-relaxed">
              <p>Ref: CUL/ADM/REG/2026</p>
              <p>
                Date: <span className="font-semibold text-slate-800">{formatDate()}</span>
              </p>
            </div>

            {/* Recipient */}
            <p className="text-slate-500 mt-6 print:mt-3">{student.email}</p>

            {/* Title */}
            <h2 className="text-center text-xl font-bold uppercase tracking-wide text-slate-900 my-6 print:my-3">
              Letter of Admission
            </h2>

            {/* Body */}
            <div className="space-y-4 print:space-y-2 text-slate-700 leading-relaxed text-[15px] print:text-[12.5px]">
              <p>
                Dear <strong className="text-slate-900">{student.full_name}</strong>,
              </p>

              <p>
                Following your application for admission into Caleb University for
                the {session} academic session, I am pleased to inform you that
                you have been offered provisional admission to pursue a degree
                programme in{" "}
                <strong className="text-slate-900">{student.course}</strong> in the{" "}
                <strong className="text-slate-900">{student.department}</strong> at
                our esteemed institution.
              </p>

              {/* Admission details */}
              <section className="bg-slate-50 border border-slate-200 rounded-lg p-5 print:p-3 my-6 print:my-3 print:bg-slate-50">
                <h3 className="text-base font-bold text-slate-900 mb-3">
                  Admission Details
                </h3>
                <div className="text-sm">
                  <DetailRow label="Admission Number:" value={student.admission_number} />
                  <DetailRow label="Application Number:" value={student.application_number} />
                  <DetailRow label="Course of Study:" value={student.course} />
                  <DetailRow label="Department:" value={student.department} />
                  <DetailRow label="Mode of Entry:" value={student.mode_of_entry} />
                  <DetailRow label="Academic Session:" value={session} />
                </div>
              </section>

              <p>
                This admission is subject to the verification of your credentials
                and payment of the prescribed acceptance and other fees. You are
                required to complete your registration online through the
                university portal within two weeks of receiving this letter.
              </p>

              <p>
                Please note that failure to accept this offer within the
                stipulated time will result in the offer being withdrawn and given
                to another candidate.
              </p>

              <p>
                On behalf of the University Management, I congratulate you on this
                achievement and wish you a successful academic career.
              </p>
            </div>

            {/* Closing */}
            <div className="mt-10 print:mt-5 text-slate-700 text-[15px] print:text-[12.5px]">
              <p>Yours sincerely,</p>
              <div className="mt-10 print:mt-6">
                <div className="w-48 border-t border-slate-400 mb-1" />
                <p className="font-semibold text-slate-900">Dr. Mayo Olumeru</p>
                <p className="text-sm text-slate-500">Registrar</p>
              </div>
            </div>
          </article>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 print:hidden">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="h-12 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {downloading ? "Preparing..." : "Download as PDF"}
            </button>

            <button
              onClick={handlePrint}
              className="h-12 rounded-lg bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Print Letter
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
