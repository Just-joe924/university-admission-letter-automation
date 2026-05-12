import {supabase} from "../config/supabase.js";

export const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startswith("Bearer ")){
        return res.status(404).json({
            message: "No token provided",
        });
    }

    const token = authHeader.split(" ")[1];

    const {data, error} = await superbase.auth.getUser(token);

    if(error || !data?.user){
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }

    req.user = data.user;
    req.token = token;

    next();
};