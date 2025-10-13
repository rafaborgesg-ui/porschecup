/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENVIRONMENT: string
  readonly VITE_PWA_NAME: string
  readonly VITE_PWA_SHORT_NAME: string
  readonly VITE_PWA_DESCRIPTION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}