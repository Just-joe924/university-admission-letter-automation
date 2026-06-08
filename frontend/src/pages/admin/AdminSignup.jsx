import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  GraduationCap,
  Lock,
  Mail,
  Shield,
  User,
  Briefcase,
} from "lucide-react";
import { registerAdmin } from "../../services/authApi";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "registrar", label: "Registrar" },
  { value: "staff", label: "Staff" },
];

export default function AdminSignup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      !formData.role ||
      !formData.password
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await registerAdmin({
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        password: formData.password,
      });

      navigate("/login", {
        state: {
          message: "Account created successfully. Please sign in.",
        },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Sign up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#f8fafc]">
      {/* Left panel */}
      <section className="hidden lg:flex min-h-screen bg-primary px-20 py-20 text-white">
        <div className="flex flex-col justify-center w-full max-w-3xl mx-auto">
          <div className="w-full h-72 rounded-3xl border border-white/20 bg-white/10 flex items-center justify-center mb-16">
            <GraduationCap className="w-36 h-36 text-white/75" strokeWidth={1.7} />
          </div>

          <h1 className="text-5xl font-bold mb-8">Join the Admin Portal</h1>

          <p className="text-2xl leading-relaxed text-white/85 max-w-2xl mb-12">
            Create an account to manage admissions, generate letters, and
            oversee student records.
          </p>

          <div className="space-y-6">
            {[
              "Secure, role-based access",
              "Real-time data management",
              "Comprehensive analytics dashboard",
            ].map((item) => (
              <div key={item} className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <p className="text-xl text-white/95">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right panel */}
      <section className="min-h-screen px-6 py-10 flex justify-center bg-[#f8fafc]">
        <div className="w-full max-w-xl">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 text-primary text-base mb-10 hover:opacity-80 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <div className="bg-white rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.16)] px-10 py-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" strokeWidth={1.8} />
              </div>

              <h2 className="text-3xl font-bold text-[#06163d] mb-3">
                Create Account
              </h2>

              <p className="text-base text-slate-600">
                Sign up to access the admin portal
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-[#06163d] mb-2">
                  Full Name
                </label>

                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#06163d] mb-2">
                  Email Address
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@university.edu"
                    className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-[#06163d] mb-2">
                  Role
                </label>

                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 appearance-none"
                  >
                    <option value="" disabled>
                      Select a role
                    </option>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-[#06163d] mb-2">
                  Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-[#06163d] mb-2">
                  Confirm Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className="w-full h-14 rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-xl bg-primary text-white text-base font-bold hover:bg-secondary transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-medium text-primary hover:underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
