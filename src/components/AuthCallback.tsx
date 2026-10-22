// AuthCallback.jsx - Create this as a separate component
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import { useUtility } from "../context/utility.context";
import Cookies from "js-cookie";
// import axios from "axios";

export default function AuthCallback() {
    const navigate = useNavigate();
    const [message, setMessage] = useState<string>("");
    // const { setToken } = useUtility();

    useEffect(() => {
        const handleCallback = async () => {
            // check query params first
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get("token");
            const status = urlParams.get("status");
            const userId = urlParams.get("userId");
            const email = urlParams.get("email");
            const role = urlParams.get("role");
            const refreshToken = urlParams.get("refreshToken");

            // Handle inactive user status
            if (status === "inactive") {
                // Clear any existing cookies
                Cookies.remove("token");
                Cookies.remove("refreshToken");
                Cookies.remove("userId");
                Cookies.remove("email");
                Cookies.remove("role");
                
                setMessage("Your account has been disabled by the administrator. Please contact support for assistance.");
                
                // Redirect to login after showing message
                setTimeout(() => {
                    navigate("/login");
                }, 5000);
                return;
            }

            if (token) {
                // save token and user details in cookies
                // VITE_JWT_EXPIRY is in minutes, convert to days for cookie expiration
                const jwtExpiryMinutes = import.meta.env.VITE_JWT_EXPIRY ? parseFloat(import.meta.env.VITE_JWT_EXPIRY) : 10; // Default: 10 minutes
                const jwtExpiry = jwtExpiryMinutes / (60 * 24); // Convert minutes to days
                const jwtRefreshExpiry = import.meta.env.VITE_JWT_REFRESH_EXPIRY ? parseFloat(import.meta.env.VITE_JWT_REFRESH_EXPIRY) : 180;
                
                Cookies.set("token", token, { expires: jwtExpiry });
                Cookies.set("refreshToken", refreshToken || "", { expires: jwtRefreshExpiry });
                Cookies.set("userId", userId || "", { expires: jwtRefreshExpiry });
                Cookies.set("email", email || "", { expires: jwtRefreshExpiry });
                Cookies.set("role", role || "", { expires: jwtRefreshExpiry });

                // redirect to dashboard
                navigate("/dashboard");
                return;
            }

            // if token is already in cookies, redirect directly
            const existingToken = Cookies.get("token");
            if (existingToken) {
                navigate("/dashboard");
            } else {
                // if no token, send to login
                navigate("/login");
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh',
            padding: '20px',
            textAlign: 'center'
        }}>
            {message ? (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #f5c6cb',
                    maxWidth: '500px',
                    marginBottom: '20px'
                }}>
                    <h3>Account Disabled</h3>
                    <p>{message}</p>
                    <p style={{ fontSize: '14px', marginTop: '10px' }}>
                        Redirecting to login page in 5 seconds...
                    </p>
                </div>
            ) : (
                <p>Processing authentication...</p>
            )}
        </div>
    );
}
