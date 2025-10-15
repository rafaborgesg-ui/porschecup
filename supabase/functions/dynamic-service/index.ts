// Edge Function: dynamic-service
// Purpose: List all users from Supabase Auth (admin-only)
// Endpoint: https://<project-ref>.supabase.co/functions/v1/dynamic-service
// Notes: Requires SUPABASE_SERVICE_ROLE_KEY to be set as a secret in the project

// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json"
};

serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  // Always handle CORS preflight first
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(" ")[1];

    // Resolve env lazily (so OPTIONS never fails) and support both secret names
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      const msg = !SUPABASE_URL ? "Missing SUPABASE_URL env variable" : "Missing SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) env variable";
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Validate caller and require admin role
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError || !userData?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const role = userData.user.user_metadata?.role || userData.user.app_metadata?.role;
    if (role !== "admin") {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    // Routing
    if (req.method === "GET") {
      // List users with optional pagination
      const page = Number(url.searchParams.get("page") ?? 1);
      const perPage = Math.min(Number(url.searchParams.get("perPage") ?? 100), 1000);

      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify(data), {
        headers: corsHeaders,
      });
    }

    if (req.method === "POST" || req.method === "PATCH") {
      // Update user metadata (admin only)
      if (pathname.endsWith("/update-user")) {
        const body = await req.json().catch(() => ({}));
        const userId = body.id || body.userId;
        if (!userId) {
          return new Response(JSON.stringify({ error: "Missing 'id' in body" }), {
            status: 400,
            headers: corsHeaders,
          });
        }

  const userUpdate: Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1] = {} as any;
        const userMetadata: Record<string, unknown> = {};
        if (typeof body.name === "string") userMetadata.name = body.name;
        if (typeof body.role === "string") userMetadata.role = body.role;
        if (typeof body.active === "boolean") userMetadata.active = body.active;
        userUpdate.user_metadata = userMetadata;

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, userUpdate);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: corsHeaders,
          });
        }
        return new Response(JSON.stringify({ ok: true, user: data.user }), {
          headers: corsHeaders,
        });
      }

      // Reset database tables (admin only)
      if (pathname.endsWith("/reset-database")) {
        try {
          const tables = ["tire_consumption", "tire_movements", "stock_entries"];
          const totalDeleted: Record<string, number> = {};
          for (const table of tables) {
            let query = supabaseAdmin.from(table).delete();
            if (table === 'tire_consumption' || table === 'stock_entries' || table === 'tire_movements') {
              query = query.not('barcode', 'is', null);
            }
            const { error, count } = await query.select("id", { count: "exact", head: true });
            if (error) {
              console.error(`Delete error on table ${table}:`, error);
              return new Response(JSON.stringify({ error: `Failed to clear ${table}: ${error.message}`, details: error }), {
                status: 500,
                headers: corsHeaders,
              });
            }
            totalDeleted[table] = count ?? 0;
          }
          return new Response(JSON.stringify({ ok: true, deleted: totalDeleted }), {
            headers: corsHeaders,
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
