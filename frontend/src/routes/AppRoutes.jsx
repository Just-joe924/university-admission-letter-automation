import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "../App";

import AdminLayout from "../components/layout/AdminLayout";

import Home from "../pages/Home";

import VerifyAdmission from "../pages/student/VerifyAdmission";
import AdmissionSuccess from "../pages/student/AdmissionSuccess";

import AdminLogin from "../pages/admin/AdminLogin";
import AdminSignup from "../pages/admin/AdminSignup";
import Dashboard from "../pages/admin/Dashboard";
import Students from "../pages/admin/Students";
import StudentDetails from "../pages/admin/StudentDetails";
import AdmissionLetters from "../pages/admin/AdmissionLetters";

import NotFound from "../pages/NotFound";

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        errorElement: <NotFound />,
        children: [
        {
            index: true,
            element: <Home />,
        },

        {
            path: "student",
            element: <VerifyAdmission />,
        },

        {
            path: "success",
            element: <AdmissionSuccess />,
        },
        ],
    },

    {
        path:"/admin/login",
        element:<AdminLogin/>
    },

    {
        path:"/admin/signup",
        element:<AdminSignup/>
    },

    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
        {
            index: true,
            element: <Dashboard />,
        },

        {
            path: "dashboard",
            element: <Dashboard />,
        },

        {
            path: "students",
            element: <Students />,
        },

        {
            path: "students/:id",
            element: <StudentDetails />,
        },

        {
            path: "admission-letters",
            element: <AdmissionLetters />,
        },
        ],
    },

    {
        path: "*",
        element: <NotFound />,
    },
]);

export default router;