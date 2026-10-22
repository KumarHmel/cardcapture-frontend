import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./app.css";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Dashboard from "./components/Dashboard/Dashboard.tsx";
import Login from "./components/Login.tsx";
import AuthCallback from "./components/AuthCallback.tsx";
import DefaultLayout from "./loyouts/DefaultLayout.tsx";
import AuthLayout from "./loyouts/AuthLayout.tsx";
import RootRedirect from "./components/RootRedirect.tsx";
import UsersTable from "./components/UserManagement/UsersTable.tsx";
// import Cookies from "js-cookie";
// import { isTokenExpired } from "./utils/jwt";

const router = createBrowserRouter([
    {
        path: "/dashboard",
        element: <DefaultLayout />, // only visible if logged in
        children: [
            { index: true, element: <Dashboard /> }, // "/dashboard"
            { path: "users", element: <UsersTable /> }, // "/dashboard/users"
        ],
    },
    {
        path: "/",
        element: <RootRedirect />,
    },
    {
        path: "/login",
        element: <AuthLayout />,
        children: [{ index: true, element: <Login /> }],
    },
    {
        path: "/auth/callback",
        element: <AuthLayout />,
        children: [{ index: true, element: <AuthCallback /> }],
    },
    {
        path: "/adresponse1",
        element: <AuthLayout />,
        children: [{ index: true, element: <AuthCallback /> }],
    },
]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>
);

// Startup token expiry check
(() => {
    // const token = Cookies.get("token");
    // if (!token || isTokenExpired(token)) {
    //     Cookies.remove("token");
    //     Cookies.remove("role");
    //     Cookies.remove("userId");
    //     Cookies.remove("email");
    //     if (window.location.pathname !== "/login") {
    //         window.location.replace("/login");
    //     }
    // }
})();
