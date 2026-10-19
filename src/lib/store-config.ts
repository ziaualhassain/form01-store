export const isMockMode = process.env.NEXT_PUBLIC_MOCK === "true";
export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
