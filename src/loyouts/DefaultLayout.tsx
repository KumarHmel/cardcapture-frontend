import { Outlet, Navigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import Modal from "../components/modal/Modal";
import { UtilityProvider } from "../context/utility.context";
import { getCookie } from "../utils/getCookieToken";

export default function DefaultLayout() {
    const token = getCookie("token");
    
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    
    return (
        <>
            <UtilityProvider>
                <Header />
                <Modal />
                <main>
                    <Outlet />
                </main>
                <Footer />
            </UtilityProvider>
        </>
    );
}
