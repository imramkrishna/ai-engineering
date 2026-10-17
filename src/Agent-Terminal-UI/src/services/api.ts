import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  BACKEND_PROFILES,
  DEFAULT_PROFILE_ID,
  type BackendProfile,
  type BackendProfileId,
} from '../config/endpoints.config';

export interface ApiErrorPayload {
  message: string;
  statusCode?: number;
  code?: string;
  endpoint?: string;
  timestamp: string;
  isOfflineFallback?: boolean;
}

export interface InterceptorLogEntry {
  id: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  timestamp: string;
  profileId: BackendProfileId;
  fallbackUsed?: boolean;
}

type ToastEventType = 'success' | 'error' | 'warning' | 'info';

export function emitGlobalToast(
  type: ToastEventType,
  title: string,
  description?: string,
) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:toast', {
        detail: { type, title, description },
      }),
    );
  }
}

function emitInterceptorLog(entry: InterceptorLogEntry) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:network-log', {
        detail: entry,
      }),
    );
  }
}

const STORAGE_KEYS = {
  AUTH_TOKEN: 'ai_eng_auth_token',
  ACTIVE_PROFILE: 'ai_eng_active_profile',
  CONNECTION_MODE: 'ai_eng_connection_mode',
} as const;

export type ConnectionMode = 'auto-fallback' | 'live-only' | 'simulate-only';

class CentralizedApiService {
  private client: AxiosInstance;
  private currentProfileId: BackendProfileId;
  private connectionMode: ConnectionMode;
  private customBaseUrl: string | null = null;

  constructor() {
    const savedProfile =
      (typeof window !== 'undefined' &&
        (localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE) as BackendProfileId)) ||
      DEFAULT_PROFILE_ID;

    this.currentProfileId = BACKEND_PROFILES[savedProfile]
      ? savedProfile
      : DEFAULT_PROFILE_ID;

    const savedMode =
      (typeof window !== 'undefined' &&
        (localStorage.getItem(STORAGE_KEYS.CONNECTION_MODE) as ConnectionMode)) ||
      (import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false'
        ? 'auto-fallback'
        : 'live-only');

    this.connectionMode = savedMode;

    const timeout = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

    this.client = axios.create({
      baseURL: this.getActiveProfile().baseUrl,
      timeout,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Request & Response Interceptors
   * Handles Bearer tokens, request timing telemetry, and global error standardization.
   */
  private setupInterceptors(): void {
    // 1. REQUEST INTERCEPTOR
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
            : null;

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        const requestId = `req_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;

        if (config.headers) {
          config.headers['X-Request-ID'] = requestId;
          config.headers['X-Client-Profile'] = this.currentProfileId;
        }

        // Attach start timestamp for latency calculation
        (config as InternalAxiosRequestConfig & { _startTime?: number })._startTime =
          performance.now();

        return config;
      },
      (error: AxiosError) => {
        emitGlobalToast('error', 'Request Configuration Error', error.message);
        return Promise.reject(error);
      },
    );

    // 2. RESPONSE INTERCEPTOR
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const cfg = response.config as InternalAxiosRequestConfig & {
          _startTime?: number;
        };
        const durationMs = cfg._startTime
          ? Math.round(performance.now() - cfg._startTime)
          : undefined;

        emitInterceptorLog({
          id: String(cfg.headers?.['X-Request-ID'] || Date.now()),
          method: (cfg.method || 'GET').toUpperCase(),
          url: `${cfg.baseURL || ''}${cfg.url || ''}`,
          status: response.status,
          durationMs,
          timestamp: new Date().toLocaleTimeString(),
          profileId: this.currentProfileId,
          fallbackUsed: false,
        });

        return response;
      },
      (error: AxiosError<{ message?: string; error?: string }>) => {
        if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
          return Promise.reject(error);
        }

        const cfg = error.config as
          | (InternalAxiosRequestConfig & {
              _startTime?: number;
              _suppressGlobalErrorToast?: boolean;
            })
          | undefined;

        const durationMs = cfg?._startTime
          ? Math.round(performance.now() - cfg._startTime)
          : undefined;

        const statusCode = error.response?.status;
        const endpoint = cfg ? `${cfg.baseURL || ''}${cfg.url || ''}` : 'Unknown URL';

        emitInterceptorLog({
          id: String(cfg?.headers?.['X-Request-ID'] || Date.now()),
          method: (cfg?.method || 'GET').toUpperCase(),
          url: endpoint,
          status: statusCode || 0,
          durationMs,
          timestamp: new Date().toLocaleTimeString(),
          profileId: this.currentProfileId,
          fallbackUsed: this.connectionMode === 'auto-fallback',
        });

        // Handle 401 Unauthorized globally
        if (statusCode === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            window.dispatchEvent(new CustomEvent('app:unauthorized'));
          }
          if (!cfg?._suppressGlobalErrorToast) {
            emitGlobalToast(
              'warning',
              'Session Expired (401)',
              'Please authenticate or update your API token in Settings.',
            );
          }
        } else if (statusCode === 429) {
          if (!cfg?._suppressGlobalErrorToast) {
            emitGlobalToast(
              'warning',
              'Rate Limit Reached (429)',
              'Too many requests sent to the model provider.',
            );
          }
        } else if (statusCode && statusCode >= 500) {
          if (!cfg?._suppressGlobalErrorToast) {
            emitGlobalToast(
              'error',
              `Backend Server Error (${statusCode})`,
              error.response?.data?.message || error.message,
            );
          }
        }

        const standardizedError: ApiErrorPayload = {
          message:
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Network or server error occurred',
          statusCode,
          code: error.code,
          endpoint,
          timestamp: new Date().toISOString(),
        };

        return Promise.reject(standardizedError);
      },
    );
  }

  public getActiveProfile(): BackendProfile {
    const profile = BACKEND_PROFILES[this.currentProfileId];
    if (this.customBaseUrl && this.currentProfileId === 'custom') {
      return { ...profile, baseUrl: this.customBaseUrl };
    }
    return profile;
  }

  public getProfileId(): BackendProfileId {
    return this.currentProfileId;
  }

  public setBackendProfile(profileId: BackendProfileId, customUrl?: string): BackendProfile {
    this.currentProfileId = profileId;
    if (customUrl) {
      this.customBaseUrl = customUrl;
    }
    const profile = this.getActiveProfile();
    this.client.defaults.baseURL = profile.baseUrl;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, profileId);
      window.dispatchEvent(
        new CustomEvent('app:profile-changed', { detail: profile }),
      );
    }
    return profile;
  }

  public getConnectionMode(): ConnectionMode {
    return this.connectionMode;
  }

  public setConnectionMode(mode: ConnectionMode): void {
    this.connectionMode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CONNECTION_MODE, mode);
    }
  }

  public setAuthToken(token: string | null): void {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  }

  public getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // Generic HTTP Wrapper Methods
  public async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig & { _suppressGlobalErrorToast?: boolean },
  ): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  public async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig & { _suppressGlobalErrorToast?: boolean },
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  public async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiService = new CentralizedApiService();
export default apiService;
