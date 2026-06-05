import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Save,
  FileText,
  Mail,
  User,
} from "lucide-react";

import {
  getStudentById,
  updateStudent,
} from "../../services/studentApi";

import {
  generateAdmissionLetter,
} from "../../services/admissionLetterApi";

export default function StudentDetails() {
  const { id } = useParams();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudent();
  }, []);

  const loadStudent = async () => {
    try {
      const data = await getStudentById(id);
      setStudent(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setStudent({
      ...student,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await updateStudent(id, student);

      alert("Student updated successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to update student");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLetter = async () => {
    try {
      await generateAdmissionLetter(id);

      alert("Admission letter generated");
    } catch (error) {
      console.error(error);
      alert("Failed to generate admission letter");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading...</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">
            Student Details
          </h1>

          <p className="text-sm text-slate-600 mt-1">
            View and manage student information
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateLetter}
            className="px-4 h-10 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center gap-2"
          >
            <FileText size={16} />
            Generate Letter
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 h-10 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {student.full_name}
            </h2>

            <p className="text-sm text-slate-500 flex items-center gap-2 truncate">
              <Mail size={14} />
              {student.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="full_name"
            value={student.full_name || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />

          <input
            name="email"
            value={student.email || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />

          <input
            name="department"
            value={student.department || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />

          <input
            name="course"
            value={student.course || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />

          <input
            name="mode_of_entry"
            value={student.mode_of_entry || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />

          <input
            name="admission_number"
            value={student.admission_number || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />

          <input
            name="application_number"
            value={student.application_number || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />

          <input
            name="session"
            value={student.session || ""}
            onChange={handleChange}
            className="border border-slate-300 rounded-xl h-11 px-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}