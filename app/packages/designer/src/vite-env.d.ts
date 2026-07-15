/// <reference types="vite/client" />

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
