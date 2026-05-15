import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "../App.jsx";

import AdminLayout from "../components/layout/AdminLayout.jsx";

import Home from "../pages/Home.jsx";

import VerifyAdmission from "../pages/student/VerifyAdmission.jsx";
import AdmissionSuccess from "../pages/student/AdmissionSuccess.jsx";

import AdminLogin from "../pages/admin/AdminLogin.jsx";
import AdminSignup from "../pages/admin/AdminSignup.jsx";
import Dashboard from "../pages/admin/Dashboard.jsx";
import Students from "../pages/admin/Students.jsx";
import StudentDetails from "../pages/admin/StudentDetails.jsx";
import AdmissionLetters from "../pages/admin/AdmissionLetters.jsx";

import NotFound from "../pages/NotFound.jsx";

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