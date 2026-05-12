import express from "express";
import {
    registerAdmin,
    loginAdmin,
    getAdminProfile,
    logoutAdmin,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/profile", requireAuth, getAdminProfile);
router.post("/logout", logoutAdmin);

export default router;
