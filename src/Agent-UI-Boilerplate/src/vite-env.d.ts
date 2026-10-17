/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEFAULT_BACKEND_PROFILE?: string;
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_ENABLE_MOCK_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
