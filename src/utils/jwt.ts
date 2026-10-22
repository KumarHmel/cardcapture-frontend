export function parseJwt(token: string): any | null {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (_) {
        return null;
    }
}

export function isTokenExpired(token: string | null | undefined): boolean {
    if (!token) return true;
    const payload = parseJwt(token);
    
    if (!payload || !payload.exp) return true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSeconds;
}

export function isTokenExpiringSoon(token: string | null | undefined, minutesThreshold: number = 5): boolean {
    if (!token) return true;
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const thresholdSeconds = minutesThreshold * 60;
    return payload.exp <= (nowSeconds + thresholdSeconds);
}
