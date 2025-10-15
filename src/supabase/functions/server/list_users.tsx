// Edge Function: list_users.tsx
// Retorna todos os usuários do auth.users (admin only)
// Endpoint: /list-users
// Requer Supabase Admin Key

// @ts-nocheck
import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("https://nflgqugaabtxzifyhjor.supabase.co");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mbGdxdWdhYWJ0eHppZnloam9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI2NTgwNCwiZXhwIjoyMDc1ODQxODA0fQ.Q0nw6Y0RC3a6YcMj1tKirorFTSeXica5Rs52tx3qrwo");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve({
  async "OPTIONS /list-users"(request) {
    // Preflight CORS
    return new Response("ok", { headers: corsHeaders });
  },
  async "GET /list-users"(request) {
    // Autorização: apenas admin
    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    // Opcional: validar token como admin
    // ...
    // Buscar todos os usuários
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  },
});
