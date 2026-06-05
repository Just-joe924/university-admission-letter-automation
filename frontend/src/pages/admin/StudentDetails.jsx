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
    return <p>Loading...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-primary">
            Student Details
          </h1>

          <p className="text-slate-600 mt-2">
            View and manage student information
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleGenerateLetter}
            className="px-6 h-12 rounded-xl bg-green-600 text-white flex items-center gap-2"
          >
            <FileText size={18} />
            Generate Letter
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 h-12 rounded-xl bg-primary text-white flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center">
            <User />
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              {student.full_name}
            </h2>

            <p className="text-slate-500 flex items-center gap-2">
              <Mail size={16} />
              {student.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <input
            name="full_name"
            value={student.full_name || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />

          <input
            name="email"
            value={student.email || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />

          <input
            name="department"
            value={student.department || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />

          <input
            name="course"
            value={student.course || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />

          <input
            name="mode_of_entry"
            value={student.mode_of_entry || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />

          <input
            name="admission_number"
            value={student.admission_number || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />

          <input
            name="application_number"
            value={student.application_number || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />

          <input
            name="session"
            value={student.session || ""}
            onChange={handleChange}
            className="border rounded-xl p-4"
          />
        </div>
      </div>
    </div>
  );
}