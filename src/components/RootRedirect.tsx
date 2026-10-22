// components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import Cookies from "js-cookie";

export default function RootRedirect() {
    const token = Cookies.get("token");
    if (token) {
        // if token exists → send to dashboard
        return <Navigate to="/dashboard" replace />;
    } else {
        return <Navigate to="/login" replace />;
    }

    // no token → send to login
    return <Outlet />;
}
