import { handleApi } from "./handler";
import type { Env } from "./types";

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleApi(request, env);
  },
};
