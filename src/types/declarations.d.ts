/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// SVG URL module declarations
declare module "*.svg?url" {
  const src: string;
  export default src;
}
