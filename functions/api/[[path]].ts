import { handleApi } from "../../worker/handler";
import type { Env } from "../../worker/types";

// Cloudflare Pages Function: every /api/* request is handled by the same router
// the Worker uses, so the UI and API stay on one origin (cookies work).
export const onRequest = ({ request, env }: { request: Request; env: Env }) => handleApi(request, env);
