import express from "express";
import cors from "cors";
import studentRoutes from "./routes/student.routes.js";
import admissionLetterRoutes from "./routes/admissionLetter.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

//Mount routes
app.use("/api/students", studentRoutes);
app.use("/api/admission-letters", admissionLetterRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use((req, res, next) => {
  const err = new Error('Route not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
    if (err.status !== 404) {
        console.error(err.stack);
    }
    res.status(err.status || 500).json({
        error: err.message || "Internal Server Error",
    });
});

export default app;