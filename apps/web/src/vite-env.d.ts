/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPPORT_TITLE?: string;
  readonly VITE_SUPPORT_FORM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
