import express from "express";
import cors from "cors";
import studentRoutes from "./routes/student.routes.js";
import dotenv from "dotenv"

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

//Mount routes
app.use("/api/students", studentRoutes);

app.use((req, res, next) => {
  const err = new Error('Route not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 