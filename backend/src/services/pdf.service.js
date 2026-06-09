import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// template lives at <backend>/template, this file is at <backend>/src/services
const TEMPLATE_DIR = path.join(__dirname, "../../template");

const formatDate = (date = new Date()) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Builds the final, self-contained HTML for the admission letter:
// the stylesheet and logo are inlined so the document renders correctly
// when loaded via Puppeteer's setContent (relative URLs don't resolve there).
export const buildAdmissionLetterHTML = (student) => {
  const htmlPath = path.join(TEMPLATE_DIR, "admission-letter.html");
  const cssPath = path.join(TEMPLATE_DIR, "admission-letter.css");
  const logoPath = path.join(TEMPLATE_DIR, "assets/images/cul_logo_rect.png");

  let html = fs.readFileSync(htmlPath, "utf-8");
  const css = fs.readFileSync(cssPath, "utf-8");

  // Inline the stylesheet (the external <link> won't load under setContent)
  html = html.replace(
    /<link[^>]*admission-letter\.css[^>]*>/,
    `<style>${css}</style>`
  );

  // Inline the logo as a data URI so it always renders
  try {
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    html = html
      .split("../template/assets/images/cul_logo_rect.png")
      .join(`data:image/png;base64,${logoBase64}`);
  } catch {
    // logo is optional — ignore if it can't be read
  }

  const session = student.session || "2025/2026";

  const replacements = {
    "{{createdAt}}": formatDate(),
    "{{email}}": student.email,
    "{{full_name}}": student.full_name,
    "{{course}}": student.course,
    "{{course_of_study}}": student.course,
    "{{department}}": student.department,
    "{{admission_number}}": student.admission_number,
    "{{application_number}}": student.application_number,
    "{{mode_of_entry}}": student.mode_of_entry,
    "{{academic_session}}": session,
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.split(key).join(value ?? "—");
  }

  return html;
};

export const generateAdmissionLetterPDF = async (student) => {
  const html = buildAdmissionLetterHTML(student);

  const browser = await puppeteer.launch({
    headless: true,
    // Flags to keep Chromium stable/low-memory on constrained hosts (Render free
    // tier). --disable-dev-shm-usage avoids crashes from a small /dev/shm.
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    // The HTML is fully self-contained (inlined CSS + logo), so there's nothing
    // to wait on the network for. Using "networkidle0" can hang on some hosts
    // (Render) and trigger a 30s navigation timeout, so wait for DOM only.
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};
