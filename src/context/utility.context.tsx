import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { getCookie } from "../utils/getCookieToken";
import { loadingBus } from "../utils/loadingBus";

// Define types
interface CardDetailsType {
    [key: string]: any; // You can customize this based on actual shape
}

interface UtilityContextType {
    myCardRecords: any[];
    setMycardRecords: React.Dispatch<React.SetStateAction<any[]>>;
    allCardRecords: any[];
    setAllcardRecords: React.Dispatch<React.SetStateAction<any[]>>;
    token: string | null;
    setToken: React.Dispatch<React.SetStateAction<string | null>>;
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    cardDetails: CardDetailsType;
    setCardDetails: React.Dispatch<React.SetStateAction<CardDetailsType>>;
    editCardDetails: CardDetailsType;
    setEditCardDetails: React.Dispatch<React.SetStateAction<CardDetailsType>>;
    role: string | null;
    setRole: React.Dispatch<React.SetStateAction<string | null>>;
    isEditMode: boolean;
    setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
    sortBy: string;
    setSortBy: React.Dispatch<React.SetStateAction<string>>;
    order: string;
    setOrder: React.Dispatch<React.SetStateAction<string>>;
    globalLoading: boolean;
    itemsPerPage: number;
    setItemsPerPage: React.Dispatch<React.SetStateAction<number>>;
    currentPage: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const UtilityContext = createContext<UtilityContextType | undefined>(undefined);

// Props type for provider
interface UtilityProviderProps {
    children: ReactNode;
}

export const UtilityProvider = ({ children }: UtilityProviderProps) => {
    const [myCardRecords, setMycardRecords] = useState<any[]>([]);
    const [allCardRecords, setAllcardRecords] = useState<any[]>([]);
    const [token, setToken] = useState<string | null>(() => getCookie("token"));
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [cardDetails, setCardDetails] = useState<CardDetailsType>({});
    const [editCardDetails, setEditCardDetails] = useState<CardDetailsType>({});
    const [role, setRole] = useState<string | null>(() => getCookie("role") || "");
    const [isEditMode, setIsEditMode] = useState(false);
    const [sortBy, setSortBy] = useState<string>("name");
    const [order, setOrder] = useState<string>("asc");
    const [globalLoading, setGlobalLoading] = useState<boolean>(false);
    const [itemsPerPage, setItemsPerPage] = useState<number>(12);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const openModal = () => {
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
    };

    useEffect(() => {
        const syncToken = () => {
            const cookieToken = getCookie("token");
            const cookieRole = getCookie("role");
            setToken(cookieToken);
            setRole(cookieRole || "");
        };

        window.addEventListener("storage", syncToken);

        return () => {
            window.removeEventListener("storage", syncToken);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = loadingBus.subscribe(setGlobalLoading);
        return unsubscribe;
    }, []);

    return (
        <UtilityContext.Provider
            value={{
                myCardRecords,
                setMycardRecords,
                allCardRecords,
                setAllcardRecords,
                token,
                setToken,
                searchTerm,
                setSearchTerm,
                isOpen,
                openModal,
                closeModal,
                cardDetails,
                setCardDetails,
                setEditCardDetails,
                editCardDetails,
                role,
                setRole,
                isEditMode,
                setIsEditMode,
                sortBy,
                setSortBy,
                order,
                setOrder,
                globalLoading,
                itemsPerPage,
                setItemsPerPage,
                currentPage,
                setCurrentPage,
            }}
        >
            {children}
        </UtilityContext.Provider>
    );
};

export const useUtility = () => {
    const context = useContext(UtilityContext);
    if (!context) {
        throw new Error("useUtility must be used within UtilityProvider");
    }
    return context;
};
