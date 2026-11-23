// Single import point for the UI:
//   import { api } from "@/lib/api";
//   api.login(...); api.lf.listPosts(...); api.cs.listPlaces(...); api.em.sendSos(...); api.gr.createReport(...);
// When the Spring Boot backend is ready, add real clients with the same
// function names and switch on NEXT_PUBLIC_USE_MOCK.
import * as core from "./mock-api";
import * as lf from "./lost-found-api";
import * as cs from "./community-api";
import * as em from "./emergency-api";
import * as gr from "./gov-reporting-api";
import * as activity from "./activity-api";

export const api = { ...core, lf, cs, em, gr, activity };
export { ApiError } from "./mock-db";
