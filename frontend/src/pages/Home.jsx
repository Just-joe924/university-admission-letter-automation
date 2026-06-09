import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  FileText,
  CircleCheck,
  Mail,
  ShieldCheck,
} from "lucide-react";
import React from "react";
import Logo from "../assets/images/cul_logo_rect.png"

export default function Home() {
  const navigate = useNavigate();

  // ── Data ───────────────────────────────────────────────────────────────────

  const features = [
    {
      title: "Admission Verification",
      description: "Real-time student record verification.",
      icon: <CircleCheck className="w-4 h-4" />,
      iconBg: "bg-green-100 text-green-600",
    },
    {
      title: "Instant PDF Generation",
      description: "Automated letter generation with official templates.",
      icon: <FileText className="w-4 h-4" />,
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Email Delivery",
      description: "Automatic email notifications to students.",
      icon: <Mail className="w-4 h-4" />,
      iconBg: "bg-purple-100 text-purple-600",
    },
    {
      title: "Secure Records",
      description: "Encrypted database with role-based access.",
      icon: <ShieldCheck className="w-4 h-4" />,
      iconBg: "bg-red-100 text-red-500",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* ══════════════════════════════════════════
          1. NAVBAR
      ══════════════════════════════════════════ */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-50">
        {/* Logo + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-14 sm:h-20 w-auto flex items-center justify-center flex-shrink-0">
            <img
              src={Logo}
              alt="Caleb University Logo"
              className="h-full w-auto object-contain"
            />
        </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-primary leading-tight truncate">Caleb University</p>
            <p className="text-xs text-muted-foreground leading-tight truncate">Admission Management Portal</p>
          </div>
        </div>

        {/* Admin Login button — hidden on mobile (reachable via hero/footer) */}
        <button
          onClick={() => navigate("/login")}
          className="hidden sm:inline-flex flex-shrink-0 text-sm font-medium px-3 sm:px-4 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        >
          Admin Login
        </button>
      </nav>

      {/* ══════════════════════════════════════════
          2. HERO SECTION
      ══════════════════════════════════════════ */}
      <section className="bg-primary px-6 sm:px-8 py-12 sm:py-14">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">

          {/* Left: text + buttons */}
          <div className="w-full lg:w-1/2">
            <h1
              className="text-2xl sm:text-3xl font-bold text-primary-foreground leading-tight mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Automated Admission Letter Management System
            </h1>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-8 max-w-sm">
              Streamline your admission process with instant verification, automated letter generation, and secure email delivery. A modern solution for academic institutions.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate("/student")}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-card text-primary hover:bg-muted transition-colors"
              >
                Verify Admission
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/50 text-primary-foreground hover:bg-white/10 transition-colors"
              >
                Admin Portal
              </button>
            </div>
          </div>

          {/* Right: icon illustration box */}
          <div className="hidden lg:flex lg:w-1/2 justify-center">
            <div
              className="w-72 h-72 rounded-3xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <GraduationCap
                strokeWidth={1.5}
                className="w-36 h-36 text-white/70"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. KEY FEATURES
      ══════════════════════════════════════════ */}
      <section className="bg-card py-16 px-6">
        {/* Section heading */}
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold text-primary mb-2">Key Features</h2>
          <p className="text-sm text-muted-foreground">Everything you need for modern admission management</p>
        </div>

        {/* Feature cards */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-background p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* Colored icon square */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${feature.iconBg}`}>
                {feature.icon}
              </div>
              <h4 className="text-sm font-semibold text-primary mb-1">{feature.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. FOOTER
      ══════════════════════════════════════════ */}
      <footer className="bg-background border-t border-white/10">
        {/* Main footer grid */}
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">

          {/* Column 1: Branding */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center">
                <GraduationCap className="w-7.5 h-7.5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-primary">CUL Admission Portal</p>
            </div>
            <p className="text-xs text-primary/50 leading-relaxed">
              Caleb University,<br />
              Ikorodu, Ibadan-Ijebu Ode Rd, Imota, Lagos, Nigeria.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <p className="text-sm font-semibold text-primary mb-3">Quick Links</p>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate("/student")}
                  className="text-xs text-primary/60 hover:text-primary transition-colors"
                >
                  Verify Admission
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/login")}
                  className="text-xs text-primary/60 hover:text-primary transition-colors"
                >
                  Admin Login
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <p className="text-sm font-semibold text-primary mb-3">Contact</p>
            <ul className="space-y-1.5">
              <li className="text-xs text-primary/60">Email: admissions@cul.edu.ng</li>
              <li className="text-xs text-primary/60">Phone: +234 1 234 5678</li>
              <li className="text-xs text-primary/60">Hours: Mon–Fri, 8AM–5PM</li>
            </ul>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="border-t border-white/10 px-6 py-4 text-center">
          <p className="text-xs text-primary/40">
            © 2025 Caleb University. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}