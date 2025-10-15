// Edge Function: make-server-18cdc61b
// Purpose: Minimal API for user listing with robust CORS handling
// Route base: https://<project-ref>.supabase.co/functions/v1/make-server-18cdc61b
// Endpoint(s):
//   - GET /users            -> List users (admin only)

// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  // 1) Always handle CORS preflight immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2) Resolve env vars lazily per request
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 3) Routing
    if (req.method === "GET" && pathname.endsWith("/users")) {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const token = authHeader.split(" ")[1];

      // Validate caller and require admin role
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.getUser(token);
      if (getUserError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
      const role = userData.user.user_metadata?.role || userData.user.app_metadata?.role;
      if (role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
      }

      const page = Number(url.searchParams.get("page") ?? 1);
      const perPage = Math.min(Number(url.searchParams.get("perPage") ?? 200), 1000);

      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }

      // Normalize output to match frontend expectation
      return new Response(JSON.stringify({ success: true, data: data.users ?? [], users: data.users ?? [] }), {
        headers: corsHeaders,
      });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
