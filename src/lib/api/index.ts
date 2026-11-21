// Single import point for the UI:
//   import { api } from "@/lib/api";
//   api.login(...); api.lf.listPosts(...);
// When the Spring Boot backend is ready, add real clients with the same
// function names and switch on NEXT_PUBLIC_USE_MOCK.
import * as core from "./mock-api";
import * as lf from "./lost-found-api";

export const api = { ...core, lf };
export { ApiError } from "./mock-db";
