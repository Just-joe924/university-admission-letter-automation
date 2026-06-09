import { useEffect, useState } from "react";
import { Download, Eye, Mail, RefreshCw, Search } from "lucide-react";

import { getAllStudents } from "../../services/studentApi";
import {
  generateAdmissionLetter,
  getAdmissionLetterByStudent,
  resendAdmissionLetterEmail,
} from "../../services/admissionLetterApi";

export default function AdmissionLetters() {
  const [students, setStudents] = useState([]);
  const [letters, setLetters] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadData = async () => {
    try {
      const studentData = await getAllStudents();
      setStudents(studentData);

      const letterResults = await Promise.allSettled(
        studentData.map((student) => getAdmissionLetterByStudent(student.id))
      );

      const letterMap = {};

      letterResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          letterMap[studentData[index].id] = result.value.admissionLetter;
        }
      });

      setLetters(letterMap);
    } catch (error) {
      console.error("Fetch admission letters error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = students.filter((student) => {
    const value = search.toLowerCase();

    return (
      student.full_name?.toLowerCase().includes(value) ||
      student.email?.toLowerCase().includes(value) ||
      student.admission_number?.toLowerCase().includes(value)
    );
  });

  const handleGenerate = async (studentId) => {
    try {
      setActionLoadingId(studentId);
      const data = await generateAdmissionLetter(studentId);
      await loadData();
      alert(data?.message || "Admission letter generated.");
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to generate admission letter."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResend = async (studentId) => {
    try {
      setActionLoadingId(studentId);
      const data = await resendAdmissionLetterEmail(studentId);
      alert(data?.message || "Admission letter email re-queued.");
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to resend admission letter email."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleView = (letter) => {
    if (!letter?.pdf_url) {
      alert("No PDF found for this student.");
      return;
    }

    window.open(letter.pdf_url, "_blank");
  };

  const handleDownload = (letter) => {
    if (!letter?.pdf_url) {
      alert("No PDF found for this student.");
      return;
    }

    const link = document.createElement("a");
    link.href = letter.pdf_url;
    link.target = "_blank";
    link.download = "admission-letter.pdf";
    link.click();
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading admission letters...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-1">
            Admission Letters
          </h1>
          <p className="text-sm text-slate-600">
            Generate, view, download, and resend admission letters.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search letters..."
            className="w-full h-11 rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-sm font-semibold">Student</th>
                <th className="py-3 px-4 text-sm font-semibold">Email</th>
                <th className="py-3 px-4 text-sm font-semibold">Admission No.</th>
                <th className="py-3 px-4 text-sm font-semibold">Letter Ref.</th>
                <th className="py-3 px-4 text-sm font-semibold">Status</th>
                <th className="py-3 px-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const letter = letters[student.id];
                const hasLetter = Boolean(letter?.pdf_url);
                const isLoading = actionLoadingId === student.id;

                return (
                  <tr key={student.id} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-sm font-medium whitespace-nowrap">
                      {student.full_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {student.email}
                    </td>
                    <td className="py-3 px-4 text-sm">{student.admission_number}</td>
                    <td className="py-3 px-4 text-sm">
                      {letter?.letter_reference || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={[
                          "px-3 py-0.5 rounded-full text-xs whitespace-nowrap",
                          hasLetter
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700",
                        ].join(" ")}
                      >
                        {hasLetter ? "Generated" : "Pending"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={!hasLetter}
                          onClick={() => handleView(letter)}
                          title="View PDF"
                        >
                          <Eye
                            className={[
                              "w-4 h-4",
                              hasLetter
                                ? "text-blue-600"
                                : "text-slate-300",
                            ].join(" ")}
                          />
                        </button>

                        <button
                          type="button"
                          disabled={!hasLetter}
                          onClick={() => handleDownload(letter)}
                          title="Download PDF"
                        >
                          <Download
                            className={[
                              "w-4 h-4",
                              hasLetter
                                ? "text-purple-600"
                                : "text-slate-300",
                            ].join(" ")}
                          />
                        </button>

                        <button
                          type="button"
                          disabled={!hasLetter || isLoading}
                          onClick={() => handleResend(student.id)}
                          title="Resend Email"
                        >
                          <Mail
                            className={[
                              "w-4 h-4",
                              hasLetter
                                ? "text-green-600"
                                : "text-slate-300",
                            ].join(" ")}
                          />
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleGenerate(student.id)}
                          title="Generate Letter"
                        >
                          <RefreshCw
                            className={[
                              "w-4 h-4",
                              isLoading
                                ? "text-slate-400 animate-spin"
                                : "text-orange-600",
                            ].join(" ")}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <p className="text-center py-8 text-sm text-slate-500">
              No admission letter records found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}