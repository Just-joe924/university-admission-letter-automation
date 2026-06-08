import { Download, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StudentsTable({ students, onDelete, onView }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
      <p className="text-sm text-slate-700 mb-5">
        Showing 1-{students.length} of {students.length} students
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-4 text-sm font-semibold">Name</th>
              <th className="py-3 px-4 text-sm font-semibold">Email</th>
              <th className="py-3 px-4 text-sm font-semibold">Department</th>
              <th className="py-3 px-4 text-sm font-semibold">Course</th>
              <th className="py-3 px-4 text-sm font-semibold">Mode</th>
              <th className="py-3 px-4 text-sm font-semibold">Admission No.</th>
              <th className="py-3 px-4 text-sm font-semibold">Status</th>
              <th className="py-3 px-4 text-sm font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-slate-100">
                <td className="py-3 px-4 text-sm whitespace-nowrap">{student.full_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{student.email}</td>
                <td className="py-3 px-4 text-sm">{student.department}</td>
                <td className="py-3 px-4 text-sm">{student.course}</td>
                <td className="py-3 px-4 text-sm">{student.mode_of_entry}</td>
                <td className="py-3 px-4 text-sm">{student.admission_number}</td>

                <td className="py-3 px-4">
                  <span
                    className={[
                      "px-3 py-0.5 rounded-full text-xs whitespace-nowrap",
                      student.letter_generated
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700",
                    ].join(" ")}
                  >
                    {student.letter_generated ? "Generated" : "Pending"}
                  </span>
                </td>

                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => onView(student)}>
                      <Eye className="w-4 h-4 text-blue-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/students/${student.id}`)}
                    >
                      <Pencil className="w-4 h-4 text-slate-600" />
                    </button>

                    <button type="button">
                      <FileText className="w-4 h-4 text-green-600" />
                    </button>

                    <button type="button">
                      <Download className="w-4 h-4 text-purple-600" />
                    </button>

                    <button
                      type="button"
                      title="Delete student"
                      onClick={() => onDelete(student)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <p className="text-center py-8 text-sm text-slate-500">No students found.</p>
        )}
      </div>
    </div>
  );
}