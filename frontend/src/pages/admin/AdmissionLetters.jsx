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
      await generateAdmissionLetter(studentId);
      await loadData();
      alert("Admission letter generated successfully.");
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
      await resendAdmissionLetterEmail(studentId);
      alert("Admission letter email resent successfully.");
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
    return <p className="text-lg text-slate-600">Loading admission letters...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Admission Letters
          </h1>
          <p className="text-xl text-slate-600">
            Generate, view, download, and resend admission letters.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search letters..."
            className="w-full h-14 rounded-xl border border-slate-300 pl-14 pr-4 text-lg outline-none focus:border-primary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-4 px-4 text-lg font-bold">Student</th>
                <th className="py-4 px-4 text-lg font-bold">Email</th>
                <th className="py-4 px-4 text-lg font-bold">Admission No.</th>
                <th className="py-4 px-4 text-lg font-bold">Letter Ref.</th>
                <th className="py-4 px-4 text-lg font-bold">Status</th>
                <th className="py-4 px-4 text-lg font-bold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const letter = letters[student.id];
                const hasLetter = Boolean(letter?.pdf_url);
                const isLoading = actionLoadingId === student.id;

                return (
                  <tr key={student.id} className="border-b border-slate-100">
                    <td className="py-5 px-4 text-lg font-medium">
                      {student.full_name}
                    </td>
                    <td className="py-5 px-4 text-slate-600">
                      {student.email}
                    </td>
                    <td className="py-5 px-4">{student.admission_number}</td>
                    <td className="py-5 px-4">
                      {letter?.letter_reference || "—"}
                    </td>
                    <td className="py-5 px-4">
                      <span
                        className={[
                          "px-4 py-1 rounded-full text-sm",
                          hasLetter
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700",
                        ].join(" ")}
                      >
                        {hasLetter ? "Generated" : "Pending"}
                      </span>
                    </td>

                    <td className="py-5 px-4">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          disabled={!hasLetter}
                          onClick={() => handleView(letter)}
                          title="View PDF"
                        >
                          <Eye
                            className={[
                              "w-5 h-5",
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
                              "w-5 h-5",
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
                              "w-5 h-5",
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
                              "w-5 h-5",
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
            <p className="text-center py-10 text-slate-500">
              No admission letter records found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}