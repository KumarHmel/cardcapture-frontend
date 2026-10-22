// import { useUtility } from "../context/utility.context";
// import { useNavigate } from "react-router-dom";
// import { getCookie } from "../utils/getCookieToken";

export default function Login() {
    // const navigate = useNavigate();
    // const { setToken } = useUtility();
    const launcherUrl = import.meta.env.VITE_AZURE_LAUNCHER_URL;
    
    const handleLogin = async () => {
        window.location.href = launcherUrl;
    };
    
    return (
        <div className="login-bg">
            <div className="main-login">
                <img src="img/login-logo.svg" className="logo" alt="logo" style={{width: '300px', margin: '20px auto'}} />


                <div className="login-card">
                    <h3 className="font-24 font-bold">Login</h3>
                    <p className="pb-4 border-bottom sub-title">
                        Login to Complete Access of Business Card Capture
                    </p>
                    <div className="pb-4">
                        <img
                            src="/img/logo-card-capture.png"
                            alt="logo"
                            className="logo-pic"
                        />
                    </div>
                    <button
                        type="submit"
                        onClick={handleLogin}
                        className="btn btn-primary w-100 round-btn"
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
}
