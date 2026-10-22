import { useEffect } from 'react';
import { refreshTokenUtils } from '../utils/axiosInstance';
import Cookies from 'js-cookie';

export const useRefreshToken = () => {
    useEffect(() => {
        // Enable refresh token rotation by default
        refreshTokenUtils.enableRefreshTokenRotation();
        
        // Clean up refresh attempts on component unmount
        return () => {
            const userId = Cookies.get("userId");
            if (userId) {
                refreshTokenUtils.clearRefreshAttempts(userId);
            }
        };
    }, []);

    return {
        enableRotation: refreshTokenUtils.enableRefreshTokenRotation,
        disableRotation: refreshTokenUtils.disableRefreshTokenRotation,
        isRotationEnabled: refreshTokenUtils.isRefreshTokenRotationEnabled,
        clearAttempts: refreshTokenUtils.clearRefreshAttempts,
        getAttempts: refreshTokenUtils.getRefreshAttempts,
    };
};
