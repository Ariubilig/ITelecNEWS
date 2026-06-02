// Minimal `import.meta.env` typing so this package type-checks on its own without
// pulling in `vite/client`. The web app provides the real Vite augmentation at build.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
