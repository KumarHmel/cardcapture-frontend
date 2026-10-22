import { useState, useEffect } from 'react';
import { networkUtils } from '../utils/axiosInstance';

export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(networkUtils.isOnline());
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        const unsubscribeOnline = networkUtils.addOnlineListener(() => {
            setIsOnline(true);
            if (wasOffline) {
                console.log('Network connection restored');
                setWasOffline(false);
            }
        });

        const unsubscribeOffline = networkUtils.addOfflineListener(() => {
            setIsOnline(false);
            setWasOffline(true);
            console.log('Network connection lost');
        });

        return () => {
            unsubscribeOnline();
            unsubscribeOffline();
        };
    }, [wasOffline]);

    return {
        isOnline,
        wasOffline,
        waitForOnline: networkUtils.waitForOnline,
    };
};
