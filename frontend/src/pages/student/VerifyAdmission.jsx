import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { verifyStudent } from "../../services/studentApi";
import {
  ArrowLeft,
  Shield,
  Info,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import culLogo from "../../assets/images/cul_logo_rect.png";



export default function VerifyAdmission() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!applicationNumber.trim()) {
      newErrors.applicationNumber = "Application number is required.";
    } else if (!/^APP\d+$/i.test(applicationNumber.trim())) {
      newErrors.applicationNumber = "Must follow the format: APP2025001.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setLoading(true);
    try {
      const data = await verifyStudent({
        email: email.trim().toLowerCase(),
        application_number: applicationNumber.trim().toUpperCase(),
      });

      console.log("Verification response:", data);
      
      navigate("/success", { state: { student: data.student } });
    } catch (err) {
      const message =
        err.response?.data?.message || "Something went wrong. Please try again.";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    // Page background — light grey
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Top Header ── */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Shield logo mark */}
        <div className="h-14 sm:h-20 w-auto flex items-center justify-center flex-shrink-0">
          <img className="h-full w-auto object-contain" src={culLogo} alt="Caleb University Logo" />
        </div>

        {/* University name + subtitle */}
        <div>
          <p className="font-bold text-sm text-foreground leading-tight">
            Caleb University
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            Admission Verification Portal
          </p>
        </div>
      </header>

      {/* ── Page Body ── */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto">

          {/* ← Back to Home */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4"/>
            Back to Home
          </button>

          {/* ── Main Card ── */}
          <div className="bg-card rounded-xl shadow-md border border-border overflow-hidden">

            {/* Navy banner */}
            <div className="bg-primary px-6 py-5 flex items-center gap-4">
              {/* Shield icon box */}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/15 border border-white/25">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-primary-foreground font-bold text-lg leading-tight">
                  Admission Verification
                </h1>
                <p className="text-primary-foreground/70 text-sm mt-0.5">
                  Enter your credentials to verify your admission status
                </p>
              </div>
            </div>

            {/* Form area */}
            <div className="px-6 py-6">

              {/* Server error */}
              {serverError && (
                <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm bg-destructive/8 border border-destructive/25 text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">

                {/* Email field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                    }}
                    placeholder="johndoe@example.com"
                    disabled={loading}
                    autoComplete="email"
                    className={[
                      "w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all",
                      "bg-card text-foreground placeholder:text-muted-foreground",
                      "border focus:ring-2 focus:ring-accent focus:border-primary",
                      errors.email
                        ? "border-destructive focus:ring-destructive/20"
                        : "border-border",
                      loading ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                {/* Application Number field */}
                <div>
                  <label htmlFor="appNumber" className="block text-sm font-medium text-foreground mb-1.5">
                    Application Number{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="appNumber"
                    type="text"
                    value={applicationNumber}
                    onChange={(e) => {
                      setApplicationNumber(e.target.value);
                      if (errors.applicationNumber)
                        setErrors((p) => ({ ...p, applicationNumber: "" }));
                    }}
                    placeholder="e.g., APP2025001234"
                    disabled={loading}
                    autoComplete="off"
                    className={[
                      "w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all font-mono",
                      "bg-card text-foreground placeholder:text-muted-foreground",
                      "border focus:ring-2 focus:ring-accent focus:border-primary",
                      errors.applicationNumber
                        ? "border-destructive focus:ring-destructive/20"
                        : "border-border",
                      loading ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  />
                  {errors.applicationNumber && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.applicationNumber}</p>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-semibold text-sm text-primary-foreground bg-primary hover:bg-secondary transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Admission Status"
                  )}
                </button>
              </form>

              {/* ── Important Information box ── */}
              <div className="mt-5 rounded-lg bg-accent border border-secondary/20 px-4 py-3.5 flex items-start gap-3">
                {/* Info icon circle */}
                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Info className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-accent-foreground mb-0.5">
                    Important Information
                  </p>
                  <p className="text-sm text-accent-foreground/80 leading-relaxed">
                    If you have been admitted, your admission record has been created by the university
                    admin. Please enter the email and application number you used during your application
                    process.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}