import { Download, FileText, Mail, X } from "lucide-react";

export default function StudentDetailsModal({ student, onClose }) {
  const letterGenerated = Boolean(student.letter_generated);

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
          </section>

          <div className="space-y-3">
            <ActionButton color="bg-blue-600 hover:bg-blue-700" icon={FileText}>
              View Admission Letter
            </ActionButton>

            <ActionButton color="bg-green-600 hover:bg-green-700" icon={FileText}>
              Generate Admission Letter
            </ActionButton>

            <ActionButton color="bg-purple-600 hover:bg-purple-700" icon={Mail}>
              Resend Email
            </ActionButton>

            <ActionButton color="bg-slate-600 hover:bg-slate-700" icon={Download}>
              Download PDF
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
      <p className="text-sm text-slate-950 break-words">{value || "—"}</p>
    </div>
  );
}

function ActionButton({ children, color, icon: Icon }) {
  return (
    <button
      type="button"
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition ${color}`}
    >
      <Icon className="h-5 w-5" />
      {children}
    </button>
  );
}