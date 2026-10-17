import { useCallback, useEffect, useRef, useState } from 'react';
import apiService, { type ApiErrorPayload, emitGlobalToast } from '../services/api';
import type { EndpointMap } from '../config/endpoints.config';

export interface UseApiOptions<TData, TBody = unknown> {
  endpointKey?: keyof Omit<EndpointMap, 'conversationById'>;
  customPath?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  initialBody?: TBody;
  immediate?: boolean;
  fallbackData?: TData | (() => TData);
  onSuccess?: (data: TData, isFallback: boolean) => void;
  onError?: (err: ApiErrorPayload) => void;
  suppressErrorToast?: boolean;
}

export interface UseApiReturn<TData, TBody = unknown> {
  data: TData | null;
  loading: boolean;
  error: ApiErrorPayload | null;
  isFallbackData: boolean;
  lastUpdated: string | null;
  execute: (overrideBody?: TBody, overridePath?: string) => Promise<TData | null>;
  reset: () => void;
  abort: () => void;
}

export function useApi<TData = unknown, TBody = unknown>(
  options: UseApiOptions<TData, TBody>,
): UseApiReturn<TData, TBody> {
  const {
    endpointKey,
    customPath,
    method = 'GET',
    immediate = false,
    suppressErrorToast = true,
  } = options;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [isFallbackData, setIsFallbackData] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const execute = useCallback(
    async (overrideBody?: TBody, overridePath?: string): Promise<TData | null> => {
      abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      const {
        fallbackData,
        initialBody,
        onSuccess,
        onError,
      } = optionsRef.current;

      const resolveFallback = (): TData | null => {
        if (fallbackData === undefined) return null;
        return typeof fallbackData === 'function'
          ? (fallbackData as () => TData)()
          : fallbackData;
      };

      const profile = apiService.getActiveProfile();
      const mode = apiService.getConnectionMode();

      const targetPath =
        overridePath ||
        customPath ||
        (endpointKey ? (profile.endpoints[endpointKey] as string) : '/');

      if (mode === 'simulate-only' && fallbackData !== undefined) {
        await new Promise((r) => setTimeout(r, 250));
        if (controller.signal.aborted) return null;
        const resolved = resolveFallback();
        setData(resolved);
        setIsFallbackData(true);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
        if (resolved && onSuccess) onSuccess(resolved, true);
        return resolved;
      }

      try {
        const payload = overrideBody !== undefined ? overrideBody : initialBody;
        let result: TData;

        if (method === 'GET') {
          result = await apiService.get<TData>(targetPath, {
            signal: controller.signal,
            _suppressGlobalErrorToast: suppressErrorToast,
          });
        } else if (method === 'POST') {
          result = await apiService.post<TData>(targetPath, payload, {
            signal: controller.signal,
            _suppressGlobalErrorToast: suppressErrorToast,
          });
        } else if (method === 'PUT') {
          result = await apiService.put<TData>(targetPath, payload, {
            signal: controller.signal,
          });
        } else {
          result = await apiService.delete<TData>(targetPath, {
            signal: controller.signal,
          });
        }

        if (controller.signal.aborted) return null;
        setData(result);
        setIsFallbackData(false);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
        if (onSuccess) onSuccess(result, false);
        return result;
      } catch (err) {
        if (controller.signal.aborted) return null;
        const apiErr = err as ApiErrorPayload;

        if (mode === 'auto-fallback' && fallbackData !== undefined) {
          const resolved = resolveFallback();
          setData(resolved);
          setIsFallbackData(true);
          setLastUpdated(new Date().toLocaleTimeString());
          setLoading(false);
          if (resolved && onSuccess) onSuccess(resolved, true);
          return resolved;
        }

        setError(apiErr);
        setLoading(false);
        if (!suppressErrorToast) {
          emitGlobalToast('error', 'API Request Failed', apiErr.message);
        }
        if (onError) onError(apiErr);
        return null;
      }
    },
    [abort, customPath, endpointKey, method, suppressErrorToast],
  );

  const reset = useCallback(() => {
    abort();
    setData(null);
    setError(null);
    setLoading(false);
    setIsFallbackData(false);
  }, [abort]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
    return () => {
      abort();
    };
  }, [immediate, execute, abort]);

  return {
    data,
    loading,
    error,
    isFallbackData,
    lastUpdated,
    execute,
    reset,
    abort,
  };
}

export default useApi;
