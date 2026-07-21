/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_BUILD_ID__: string;
declare const __APP_PACKAGE_VERSION__: string;

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '@docs/*.md?raw' {
  const content: string;
  export default content;
}

declare module '@docs/*/*.md?raw' {
  const content: string;
  export default content;
}
