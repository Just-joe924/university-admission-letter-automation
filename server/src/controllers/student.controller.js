import {supabase} from "../config/supabase.js";

export const createStudent = async (req, res) => {
    const {
        full_name,
        email,
        department,
        course, 
        mode_of_entry,
        admission_number,
        application_number,
    } = req.body;

    if (!full_name || !email || !department || !course || !mode_of_entry || !admission_number || !application_number){
        return res.status(400).json({
            message: "Required fields are missing",
        })
    }

    if(!["UTME", "Direct Entry"].includes(mode_of_entry)){
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
                application_number,
                admission_number,
            }
        ])
        .select();

    if(error){
        console.error("Insert student error:", error);

        if(error.code === "23505"){
            return res.status(409).json({
                message: "A student with this email or ID already exists",
            });
        }

        if(error){
            return res.status(500).json({
                message: "Failed to save student",
            })
        }
    }

    res.status(201).json({
        message: "Student saved successfully",
        student: data?.[0] || null,
    });
} 

export const getAllStudents = async (req, res) => {
    const {data, error} = await supabase
        .from("students")
        .select("*");
    
    if(error){
        return res.status(500).json({
            message: "Failed to fetch students",
        })
    }

    res.json(data);
}

export const getStudentById = async (req, res) => {
    const {data, error} = await supabase
        .from("students")
        .select("*")
        .eq("id", req.params.id)
        .single();
    
        if(error){
            return res.status(404).json({
                message: "Student not found",
            });
        }
    
    res.json(data);
}

export const updateStudent = async (req, res) => {
    const{id} = req.params;

    const{error} = await supabase
        .from("students")
        .update(updates)
        .ed("id", req.params.id)
        .select();

    if(error){
        return res.status(500).json({
            message: "failed to update student"
        })
    }

    if(!data || data.length === 0){
        return res.status(500).json({
            message: "student not found"
        })
    }

    res.json({
        message: "student updated",
        student: data[0],
    })
} 

export const deleteStudent = async (req, res) => {
    const {id} = req.params;

    const {error} = await supabase
        .from("students")
        .delete()
        .eq("id", req.params.id);

    if(error){
        return res.status(500).json({
            message: "Failed to delete student",
        });
    }

    res.json({
        message: "Student deleted successfully",
    });
}

export const verifyStudent = async (req, res) => {
    const { email, application_number } = req.body;

    if(!email || !application_number){
        return res.status(400).json({
            message: "Email and application number are required",
        })
    }

    const {data, error} = await supabase
        .from("students")
        .select(
            "id, full_name, email, department, course, mode_of_entry, admission_number, application_number "
        )
        .eq("email", email)
        .eq("application_number", application_number)
        .single();

        if(error){
            return res.status(404).json({
                message: "Student not found",
            });
        }

        res.json(data);
}