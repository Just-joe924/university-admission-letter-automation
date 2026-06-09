import dotenv from "dotenv"
import app from "./app.js";
import { startEmailQueueWorker } from "./services/emailWorker.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Start the background email queue processor.
  startEmailQueueWorker();
});