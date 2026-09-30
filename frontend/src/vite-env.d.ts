interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
