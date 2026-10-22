//import React from 'react'
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { useUtility } from "../../context/utility.context";
import apiService from "../../service/apiService";

export default function LogoutButton() {
    const navigate = useNavigate();
    const { setToken } = useUtility();
    const handleLogout = async () => {
        try {
            // Call logout API to properly invalidate session on server
            await apiService.logout();
            console.log('Logout API called successfully');
        } catch (error) {
            console.error('Logout API failed:', error);
            // Continue with local logout even if API fails
        }

        // Clear all cookies
        Object.keys(Cookies.get()).forEach((cookieName) => {
            Cookies.remove(cookieName); // try default
            Cookies.remove(cookieName, { path: "/" }); // also try with path=/
        });

        // Reset state/context
        setToken(null);

        // Navigate to login
        navigate("/");
    };
    return <button onClick={handleLogout}>Logout</button>;
}
