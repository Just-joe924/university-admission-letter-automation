import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import StudentsTable from "../../components/tables/StudentTable";
import StudentDetailsModal from "../../components/modals/StudentDetailsModals";
import { deleteStudent, getAllStudents } from "../../services/studentApi";

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);

  const loadStudents = async () => {
    try {
      const data = await getAllStudents();
      setStudents(data.students || data);
    } catch (error) {
      console.error("Fetch students error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const departments = [
    ...new Set(students.map((student) => student.department).filter(Boolean)),
  ];

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        student.full_name?.toLowerCase().includes(searchValue) ||
        student.email?.toLowerCase().includes(searchValue) ||
        student.admission_number?.toLowerCase().includes(searchValue);

      const matchesDepartment = !department || student.department === department;

      const matchesMode = !mode || student.mode_of_entry === mode;

      const matchesStatus =
        !status ||
        (status === "generated" && student.letter_generated) ||
        (status === "pending" && !student.letter_generated);

      return matchesSearch && matchesDepartment && matchesMode && matchesStatus;
    });
  }, [students, search, department, mode, status]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this student record?");
    if (!confirmDelete) return;

    try {
      await deleteStudent(id);
      await loadStudents();
    } catch (error) {
      console.error("Delete student error:", error);
      alert("Failed to delete student.");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading students...</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-1">
            Students Management
          </h1>
          <p className="text-sm text-slate-600">
            View and manage student applications and admission letters
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/students/add")}
          className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full h-11 rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
          >
            <option value="">All Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
          >
            <option value="">All Modes</option>
            <option value="UTME">UTME</option>
            <option value="Direct Entry">Direct Entry</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="generated">Generated</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <StudentsTable
          students={filteredStudents}
          onDelete={handleDelete}
          onView={(student) => setSelectedStudent(student)}
        />
      </div>

      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}