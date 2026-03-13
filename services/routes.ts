// Server-side (SSR): API_URL env var → internal Docker network name
// Client-side (browser): NEXT_PUBLIC_API_URL baked at build time
const isBrowser = typeof window !== "undefined";
export const API_URL = isBrowser
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001/api")
    : (process.env.API_URL ?? "http://127.0.0.1:3001/api");
