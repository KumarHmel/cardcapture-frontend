import { Outlet } from "react-router-dom";
import { UtilityProvider } from "../context/utility.context";

export default function AuthLayout() {
    return (
        <div className="auth-layout">
            <UtilityProvider>
                <Outlet />
            </UtilityProvider>
        </div>
    );
}
