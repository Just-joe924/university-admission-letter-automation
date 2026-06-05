import { Download, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StudentsTable({ students, onDelete, onView }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
      <p className="text-lg text-slate-700 mb-8">
        Showing 1-{students.length} of {students.length} students
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-4 px-4 text-lg font-bold">Name</th>
              <th className="py-4 px-4 text-lg font-bold">Email</th>
              <th className="py-4 px-4 text-lg font-bold">Department</th>
              <th className="py-4 px-4 text-lg font-bold">Course</th>
              <th className="py-4 px-4 text-lg font-bold">Mode</th>
              <th className="py-4 px-4 text-lg font-bold">Admission No.</th>
              <th className="py-4 px-4 text-lg font-bold">Status</th>
              <th className="py-4 px-4 text-lg font-bold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-slate-100">
                <td className="py-5 px-4 text-lg">{student.full_name}</td>
                <td className="py-5 px-4 text-slate-600">{student.email}</td>
                <td className="py-5 px-4">{student.department}</td>
                <td className="py-5 px-4">{student.course}</td>
                <td className="py-5 px-4">{student.mode_of_entry}</td>
                <td className="py-5 px-4">{student.admission_number}</td>

                <td className="py-5 px-4">
                  <span
                    className={[
                      "px-4 py-1 rounded-full text-sm",
                      student.letter_generated
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700",
                    ].join(" ")}
                  >
                    {student.letter_generated ? "Generated" : "Pending"}
                  </span>
                </td>

                <td className="py-5 px-4">
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => onView(student)}>
                      <Eye className="w-5 h-5 text-blue-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/admin/students/${student.id}`)}
                    >
                      <Pencil className="w-5 h-5 text-slate-600" />
                    </button>

                    <button type="button">
                      <FileText className="w-5 h-5 text-green-600" />
                    </button>

                    <button type="button">
                      <Download className="w-5 h-5 text-purple-600" />
                    </button>

                    <button type="button" onClick={() => onDelete(student.id)}>
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <p className="text-center py-10 text-slate-500">No students found.</p>
        )}
      </div>
    </div>
  );
}