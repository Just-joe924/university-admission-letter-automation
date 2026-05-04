import express from "express";
import { supabase } from "../config/supabase.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const {
        full_name,
        email,
        department,
        course,
        mode_of_entry,
        admission_number,
        application_number,
    } = req.body;

    if (!full_name || !email || !department || !course || !mode_of_entry) {
        return res.status(400).json({
        message: "Full name, email, department, course, and mode of entry are required",
        });
    } 

    if (!["UTME", "Direct Entry"].includes(mode_of_entry)) {
        return res.status(400).json({
            message: "Mode of entry must be either UTME or Direct Entry",
        });
    }

    const { data, error } = await supabase
        .from("students")
        .insert([
        {
            full_name,
            email,
            department,
            course,
            mode_of_entry,
            admission_number,
            application_number,
        },
        ])
        .select();
        if (error) {
            console.error("Insert student error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    message: "A student with this email or ID already exists",
                });
            }

            return res.status(500).json({
                message: "Failed to save student",
            });
        }

    res.status(201).json({
        message: "Student saved successfully",
        student: data?.[0] || null
    });
});

export default router;