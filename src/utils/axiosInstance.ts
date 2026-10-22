import axios from "axios";
import Cookies from "js-cookie";
import { isTokenExpired, isTokenExpiringSoon } from "./jwt";
import { loadingBus } from "./loadingBus";

// Extend Axios config to include _retry property
declare module 'axios' {
    interface InternalAxiosRequestConfig {
        _retry?: boolean;
    }
}

// Track refresh attempts to prevent infinite loops
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (error?: any) => void }> = [];

// Rate limiting for refresh attempts
interface RefreshAttempt {
    timestamp: number;
    count: number;
}

const refreshAttempts = new Map<string, RefreshAttempt>();
const REFRESH_RATE_LIMIT = {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    backoffMs: 30 * 1000, // 30 seconds
};

// Offline detection
let isOnline = navigator.onLine;
const onlineListeners = new Set<() => void>();
const offlineListeners = new Set<() => void>();

// Refresh token rotation tracking
let refreshTokenRotationEnabled = false;

// Helper functions to get JWT expiry from env (values are in days)
const getJwtExpiry = (): number => {
    const expiry = import.meta.env.VITE_JWT_EXPIRY;
    return expiry ? parseFloat(expiry) : (10 / (60 * 24)); // Default: 10 minutes
};

const getJwtRefreshExpiry = (): number => {
    const expiry = import.meta.env.VITE_JWT_REFRESH_EXPIRY;
    return expiry ? parseFloat(expiry) : 180; // Default: 180 days
};

// Session expired notification handler
const showSessionExpiredMessage = (callback: () => void) => {
    if (typeof window === 'undefined') {
        callback();
        return;
    }

    // Create a styled modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        text-align: center;
        animation: slideIn 0.3s ease-out;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 15px;
    `;
    icon.textContent = '⏱️';

    const title = document.createElement('h3');
    title.style.cssText = `
        margin: 0 0 10px 0;
        color: #333;
        font-size: 20px;
        font-weight: 600;
    `;
    title.textContent = 'Session Expired';

    const message = document.createElement('p');
    message.style.cssText = `
        margin: 0;
        color: #666;
        font-size: 16px;
        line-height: 1.5;
    `;
    message.textContent = 'Your active session expired, Redirecting you to the login screen.';

    const spinner = document.createElement('div');
    spinner.style.cssText = `
        margin-top: 20px;
        width: 30px;
        height: 30px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-left: auto;
        margin-right: auto;
    `;

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateY(-50px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(spinner);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Auto-redirect after 3 seconds
    setTimeout(() => {
        document.body.removeChild(overlay);
        document.head.removeChild(style);
        callback();
    }, 3000);
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Rate limiting helper functions
const checkRefreshRateLimit = (userId: string): boolean => {
    const now = Date.now();
    const attempt = refreshAttempts.get(userId);
    
    if (!attempt) {
        refreshAttempts.set(userId, { timestamp: now, count: 1 });
        return true;
    }
    
    // Reset if window has passed
    if (now - attempt.timestamp > REFRESH_RATE_LIMIT.windowMs) {
        refreshAttempts.set(userId, { timestamp: now, count: 1 });
        return true;
    }
    
    // Check if limit exceeded
    if (attempt.count >= REFRESH_RATE_LIMIT.maxAttempts) {
        return false;
    }
    
    // Increment count
    attempt.count++;
    refreshAttempts.set(userId, attempt);
    return true;
};

const getBackoffDelay = (userId: string): number => {
    const attempt = refreshAttempts.get(userId);
    if (!attempt) return 0;
    
    const attempts = Math.min(attempt.count, 5); // Cap at 5 attempts
    return REFRESH_RATE_LIMIT.backoffMs * Math.pow(2, attempts - 1); // Exponential backoff
};

// Offline detection helper functions
const updateOnlineStatus = () => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    
    if (wasOnline !== isOnline) {
        if (isOnline) {
            onlineListeners.forEach(listener => listener());
        } else {
            offlineListeners.forEach(listener => listener());
        }
    }
};

const addOnlineListener = (callback: () => void) => {
    onlineListeners.add(callback);
    return () => onlineListeners.delete(callback);
};

const addOfflineListener = (callback: () => void) => {
    offlineListeners.add(callback);
    return () => offlineListeners.delete(callback);
};

// Consolidated refresh token function
const refreshTokenRequest = async (): Promise<{ accessToken: string; refreshToken?: string }> => {
    const refreshToken = Cookies.get('refreshToken');
    
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }
    
    // Use raw axios to avoid interceptor loops
    const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || "https://cardcaptureapi.sphinxworldbiz.net/api/v1"}/refresh-token`,
        { refreshToken },
        {
            timeout: 10000,
            headers: { "Content-Type": "application/json" }
        }
    );
    
    // Extract tokens from response
    const responseData = response.data.data || response.data;
    const { accessToken, refreshToken: newRefreshToken } = responseData;
    
    // Update cookies with new tokens
    if (accessToken) {
        Cookies.set("token", accessToken, { 
            expires: getJwtExpiry(), // Use env value
            secure: true,
            sameSite: 'strict'
        });
    }
    
    if (newRefreshToken && refreshTokenRotationEnabled) {
        Cookies.set("refreshToken", newRefreshToken, { 
            expires: getJwtRefreshExpiry(), // Use env value
            secure: true,
            sameSite: 'strict'
        });
    }
    
    return { accessToken, refreshToken: newRefreshToken };
};

// Initialize offline detection
if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "https://cardcaptureapi.sphinxworldbiz.net/api/v1",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        loadingBus.start();
        const token = Cookies.get("token");
        const userId = Cookies.get("userId") || "anonymous";
        
        // Check if offline
        if (!isOnline) {
            loadingBus.stop();
            return Promise.reject(new Error("Network offline"));
        }
        
        // Skip token check for refresh endpoint to avoid infinite loops
        if (config.url?.includes('/refresh-token')) {
            // Add retry flag for refresh token requests
            config._retry = true;
            
            // Ensure no Authorization header is added for refresh-token
            delete config.headers.Authorization;
            return config;
        }
        
        if (!token) {
            delete config.headers.Authorization;
            
            // Check if refresh token is available to regenerate access token
            const refreshToken = Cookies.get('refreshToken');
            if (refreshToken) {
                console.log('Access token missing but refresh token available. Attempting to regenerate...');
                
                // Check rate limiting for refresh attempts
                if (!checkRefreshRateLimit(userId)) {
                    const backoffDelay = getBackoffDelay(userId);
                    console.warn('Rate limit exceeded for token refresh');
                    loadingBus.stop();
                    return Promise.reject(new Error(`Rate limit exceeded. Retry after ${backoffDelay}ms`));
                }
                
                // If already refreshing, queue this request
                if (isRefreshing) {
                    console.log('Token refresh already in progress, queueing request...');
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(newToken => {
                        config.headers.Authorization = `Bearer ${newToken}`;
                        return config;
                    }).catch(err => {
                        return Promise.reject(err);
                    });
                }
                
                // Start refresh process
                isRefreshing = true;
                config._retry = true;
                
                // Try to regenerate access token using refresh token
                return refreshTokenRequest()
                    .then(({ accessToken }) => {
                        console.log('Access token successfully regenerated from refresh token');
                        processQueue(null, accessToken);
                        config.headers.Authorization = `Bearer ${accessToken}`;
                        return config;
                    })
                    .catch((refreshError) => {
                        console.error('Failed to regenerate access token:', refreshError);
                        processQueue(refreshError, null);
                        Cookies.remove("token");
                        Cookies.remove("role");
                        Cookies.remove("userId");
                        Cookies.remove("email");
                        Cookies.remove("refreshToken");
                        loadingBus.stop();
                        
                        // Show session expired message before redirecting
                        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                            showSessionExpiredMessage(() => {
                                window.location.href = "/login";
                            });
                        }
                        return Promise.reject(refreshError);
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
            }
            
            // No token and no refresh token available, redirect to login
            console.log('⚠️ No access token or refresh token available. Redirecting to login...');
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = "/login";
            }
            loadingBus.stop();
            return Promise.reject("No token found");
        }
        
        // Check if token is expired or about to expire (within 2 minutes)
        if (isTokenExpired(token) || isTokenExpiringSoon(token, 2)) {
            // Check rate limiting for refresh attempts
            if (!checkRefreshRateLimit(userId)) {
                const backoffDelay = getBackoffDelay(userId);
                loadingBus.stop();
                return Promise.reject(new Error(`Rate limit exceeded. Retry after ${backoffDelay}ms`));
            }
            
            // If already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(newToken => {
                    config.headers.Authorization = `Bearer ${newToken}`;
                    return config;
                }).catch(err => {
                    return Promise.reject(err);
                });
            }
            
            // Start refresh process
            isRefreshing = true;
            
            // Add retry flag to prevent infinite loops
            config._retry = true;
            
            return refreshTokenRequest()
                .then(({ accessToken }) => {
                    processQueue(null, accessToken);
                    config.headers.Authorization = `Bearer ${accessToken}`;
                    return config;
                })
                .catch((refreshError) => {
                    processQueue(refreshError, null);
                    Cookies.remove("token");
                    Cookies.remove("role");
                    Cookies.remove("userId");
                    Cookies.remove("email");
                    Cookies.remove("refreshToken");
                    loadingBus.stop();
                    
                    // Show session expired message before redirecting
                    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                        showSessionExpiredMessage(() => {
                            window.location.href = "/login";
                        });
                    }
                    return Promise.reject(refreshError);
                })
                .finally(() => {
                    isRefreshing = false;
                });
        }
        
        config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        console.log("Axios interceptor error:", error);
        loadingBus.stop();
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => {
        loadingBus.stop();
        return response;
    },
    async (error) => {
        loadingBus.stop();
        const originalRequest = error.config;
        const userId = Cookies.get("userId") || "anonymous";
        
        // Handle network errors
        if (!error.response && !isOnline) {
            return Promise.reject(new Error("Network offline"));
        }
        
        if (error?.response?.status === 401 && !originalRequest._retry) {
            // Check rate limiting for refresh attempts
            if (!checkRefreshRateLimit(userId)) {
                const backoffDelay = getBackoffDelay(userId);
                return Promise.reject(new Error(`Rate limit exceeded. Retry after ${backoffDelay}ms`));
            }
            
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return axiosInstance(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }
            
            originalRequest._retry = true;
            isRefreshing = true;
            
            try {
                const { accessToken } = await refreshTokenRequest();
                
                if (accessToken) {
                    processQueue(null, accessToken);
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return axiosInstance(originalRequest);
                } else {
                    throw new Error('No token in refresh response');
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                Cookies.remove("token");
                Cookies.remove("role");
                Cookies.remove("userId");
                Cookies.remove("email");
                Cookies.remove("refreshToken");
                
                // Show session expired message before redirecting
                if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                    showSessionExpiredMessage(() => {
                        window.location.href = "/login";
                    });
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        
        return Promise.reject(error);
    }
);

// Export utility functions for external use
export const refreshTokenUtils = {
    enableRefreshTokenRotation: () => {
        refreshTokenRotationEnabled = true;
    },
    disableRefreshTokenRotation: () => {
        refreshTokenRotationEnabled = false;
    },
    isRefreshTokenRotationEnabled: () => refreshTokenRotationEnabled,
    clearRefreshAttempts: (userId?: string) => {
        if (userId) {
            refreshAttempts.delete(userId);
        } else {
            refreshAttempts.clear();
        }
    },
    getRefreshAttempts: (userId: string) => refreshAttempts.get(userId),
    refreshToken: refreshTokenRequest, // Add this line
};

export const networkUtils = {
    isOnline: () => isOnline,
    addOnlineListener: addOnlineListener,
    addOfflineListener: addOfflineListener,
    waitForOnline: (): Promise<void> => {
        return new Promise((resolve) => {
            if (isOnline) {
                resolve();
            } else {
                const unsubscribe = addOnlineListener(() => {
                    unsubscribe();
                    resolve();
                });
            }
        });
    },
};

export default axiosInstance;
