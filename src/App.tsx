import { Outlet } from "react-router-dom";
//import Table from './components/TableView/Table.tsx'
import { UtilityProvider } from "./context/utility.context.tsx";
import Header from "./components/Header/Header.tsx";
import Footer from "./components/Footer/Footer.tsx";
import Modal from "./components/modal/Modal.tsx";
import { useUtility } from "./context/utility.context.tsx";

function GlobalLoader() {
    const { globalLoading } = useUtility();
    if (!globalLoading) return null;
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
        }}>
            <div className="spinner-border text-primary" role="status" aria-live="polite" aria-busy="true" />
        </div>
    );
}

function App() {
    return (
        <>
            <UtilityProvider>
                <Header />
                <Modal />
                <main>
                    <Outlet />
                </main>
                <Footer />
                <GlobalLoader />
            </UtilityProvider>
        </>
    );
}

export default App;
