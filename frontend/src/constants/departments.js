// Departments offered across the university, each mapping to the courses /
// programmes available under it. Used by the Add Student form so the course
// dropdown is filtered by the selected department.
export const DEPARTMENT_COURSES = {
  // ── Sciences ───────────────────────────────────────────────────────────────
  "Computer Science": [
    "Computer Science",
    "Software Engineering",
    "Cyber Security",
    "Information Technology",
    "Data Science",
    "Information Systems",
  ],
  Mathematics: ["Mathematics", "Statistics", "Industrial Mathematics"],
  Physics: ["Physics", "Physics with Electronics", "Applied Geophysics"],
  Chemistry: ["Chemistry", "Industrial Chemistry", "Biochemistry"],
  "Biological Sciences": [
    "Microbiology",
    "Biotechnology",
    "Biology",
    "Industrial Biology",
    "Molecular Biology",
  ],

  // ── Engineering ─────────────────────────────────────────────────────────────
  "Electrical and Electronics Engineering": [
    "Electrical and Electronics Engineering",
  ],
  "Mechanical Engineering": ["Mechanical Engineering"],
  "Civil Engineering": ["Civil Engineering"],
  "Computer Engineering": ["Computer Engineering"],
  "Mechatronics Engineering": ["Mechatronics Engineering"],
  "Chemical Engineering": ["Chemical Engineering"],
  "Petroleum Engineering": ["Petroleum Engineering"],

  // ── Management & Social Sciences ────────────────────────────────────────────
  Accounting: ["Accounting"],
  "Banking and Finance": ["Banking and Finance"],
  "Business Administration": [
    "Business Administration",
    "Entrepreneurship",
    "Human Resource Management",
  ],
  Economics: ["Economics", "Economics and Development Studies"],
  Marketing: ["Marketing"],
  "Mass Communication": [
    "Mass Communication",
    "Journalism and Media Studies",
    "Public Relations and Advertising",
    "Film and Multimedia",
  ],
  "Political Science": [
    "Political Science",
    "International Relations",
    "Public Administration",
  ],
  "Criminology and Security Studies": ["Criminology and Security Studies"],
  Sociology: ["Sociology"],
  Psychology: ["Psychology"],

  // ── Law ─────────────────────────────────────────────────────────────────────
  Law: ["Law (LL.B)"],

  // ── Environmental Sciences ──────────────────────────────────────────────────
  Architecture: ["Architecture"],
  "Estate Management": ["Estate Management"],
  "Quantity Surveying": ["Quantity Surveying"],
  "Surveying and Geoinformatics": ["Surveying and Geoinformatics"],

  // ── Health Sciences ─────────────────────────────────────────────────────────
  "Nursing Science": ["Nursing Science"],
  "Public Health": ["Public Health", "Environmental Health Science"],
  "Medical Laboratory Science": ["Medical Laboratory Science"],
  "Human Anatomy": ["Human Anatomy"],
  "Human Physiology": ["Human Physiology"],

  // ── Arts & Education ────────────────────────────────────────────────────────
  "Languages and Literary Studies": [
    "English and Literary Studies",
    "French",
    "Linguistics",
  ],
  "History and International Studies": ["History and International Studies"],
  "Religious Studies": ["Religious Studies", "Theology"],
  Education: [
    "Educational Management",
    "Guidance and Counselling",
    "Early Childhood Education",
  ],
};

export const DEPARTMENTS = Object.keys(DEPARTMENT_COURSES);
