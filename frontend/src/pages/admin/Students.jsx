import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import StudentsTable from "../../components/tables/StudentTable";
import { getAllStudents, deleteStudent } from "../../services/studentApi";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStudents = async () => {
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error("Fetch students error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const departments = [...new Set(students.map((s) => s.department).filter(Boolean))];

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        student.email?.toLowerCase().includes(search.toLowerCase()) ||
        student.admission_number?.toLowerCase().includes(search.toLowerCase());

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

    await deleteStudent(id);
    loadStudents();
  };

  if (loading) {
    return <p className="text-lg text-slate-600">Loading students...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Students Management
          </h1>
          <p className="text-xl text-slate-600">
            View and manage student applications and admission letters
          </p>
        </div>

        <button className="h-16 px-8 rounded-2xl bg-blue-600 text-white text-xl font-semibold flex items-center gap-3 hover:bg-primary transition">
          <Plus className="w-7 h-7" />
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full h-14 rounded-xl border border-slate-300 pl-14 pr-4 text-lg outline-none focus:border-primary"
            />
          </div>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="h-14 rounded-xl border border-slate-300 px-5 text-lg outline-none focus:border-primary"
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
            className="h-14 rounded-xl border border-slate-300 px-5 text-lg outline-none focus:border-primary"
          >
            <option value="">All Modes</option>
            <option value="UTME">UTME</option>
            <option value="Direct Entry">Direct Entry</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-14 rounded-xl border border-slate-300 px-5 text-lg outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="generated">Generated</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="mt-8">
          <StudentsTable students={filteredStudents} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
}