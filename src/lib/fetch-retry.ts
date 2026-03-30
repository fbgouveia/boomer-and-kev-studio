const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

export async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<{ response: Response, retryAfter?: number }> {
    const response = await fetch(url, options);

    if (response.status === 429 && retries > 0) {
        const delay = INITIAL_RETRY_DELAY * (MAX_RETRIES - retries + 1);
        console.log(`[Neural Link] Alpha Overflow (429). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1);
    }

    if (response.status === 429 && retries === 0) {
        // Find retry duration in the error message if possible
        const errorData = await response.clone().json();
        const errorMessage = errorData.error?.message || "";
        const match = errorMessage.match(/retry in ([\d.]+)s/i);
        const retryAfter = match ? parseFloat(match[1]) : 30; // Default to 30s if not found
        return { response, retryAfter };
    }

    return { response };
}
