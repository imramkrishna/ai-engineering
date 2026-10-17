import { useCallback, useState } from 'react';
import apiClient from '../services/api';

/**
 * Simple Reusable useApi() Hook
 * -----------------------------
 * Wraps centralized apiClient calls with loading, data, and error states,
 * plus an automatic fallback function if the backend server isn't running.
 */
export function useApi<TResponse, TPayload = unknown>(
  endpoint: string,
  fallbackFn?: (payload: TPayload) => Promise<TResponse> | TResponse,
) {
  const [data, setData] = useState<TResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (payload?: TPayload, method: 'GET' | 'POST' = 'POST'): Promise<TResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const res =
          method === 'GET'
            ? await apiClient.get<TResponse>(endpoint)
            : await apiClient.post<TResponse>(endpoint, payload);
        setData(res.data);
        return res.data;
      } catch (err) {
        if (fallbackFn) {
          const fallbackResult = await fallbackFn(payload as TPayload);
          setData(fallbackResult);
          return fallbackResult;
        }
        const msg = err instanceof Error ? err.message : 'Request failed';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, fallbackFn],
  );

  return { data, loading, error, request, setData };
}

export default useApi;
