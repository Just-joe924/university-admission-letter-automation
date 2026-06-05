import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { createStudent } from "../../services/studentApi";

export default function AddStudent() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    department: "",
    course: "",
    mode_of_entry: "UTME",
    application_number: "",
    admission_number: "",
    session: "2025/2026",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const departments = ["Computer Science", "Engineering", "Mathematics", "Mass Communication"];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.full_name ||
      !formData.email ||
      !formData.department ||
      !formData.course ||
      !formData.mode_of_entry ||
      !formData.application_number
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);

      await createStudent({
        ...formData,
        admission_number: formData.admission_number || `ADM/${Date.now()}`,
      });

      navigate("/admin/students");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to add student.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate("/admin/students")}
        className="mb-6 flex items-center gap-2 text-blue-600 text-sm hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students
      </button>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 px-5 py-6 sm:px-8 max-w-3xl">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Add New Student</h1>
        <p className="text-sm text-slate-600 mb-8">
          Create an admission record for a new student
        </p>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3">Personal Information</h2>
            <div className="border-t border-slate-200 pt-4 space-y-4">
              <FormField
                label="Full Name *"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter student's full name"
              />

              <FormField
                label="Email Address *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student.email@example.com"
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3">Academic Information</h2>
            <div className="border-t border-slate-200 pt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-primary mb-1.5">
                  Department *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <FormField
                label="Course/Programme *"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="e.g., Computer Science"
              />

              <div>
                <label className="block text-sm font-semibold text-primary mb-2">
                  Mode of Entry *
                </label>

                <div className="flex gap-6 text-sm font-semibold">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode_of_entry"
                      value="UTME"
                      checked={formData.mode_of_entry === "UTME"}
                      onChange={handleChange}
                    />
                    UTME
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode_of_entry"
                      value="Direct Entry"
                      checked={formData.mode_of_entry === "Direct Entry"}
                      onChange={handleChange}
                    />
                    Direct Entry
                  </label>
                </div>
              </div>

              <FormField
                label="Application Number *"
                name="application_number"
                value={formData.application_number}
                onChange={handleChange}
                placeholder="e.g., APP2025001234"
              />

              <div>
                <FormField
                  label="Admission Number"
                  name="admission_number"
                  value={formData.admission_number}
                  onChange={handleChange}
                  placeholder="Leave empty to auto-generate"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Optional - will be auto-generated if left empty
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-1.5">
                  Session *
                </label>
                <select
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
                >
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-primary transition disabled:opacity-60"
                >
                  {loading ? "Adding Student..." : "Add Student"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/admin/students")}
                  className="h-11 rounded-xl bg-slate-600 text-white text-sm font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-primary mb-1.5">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}