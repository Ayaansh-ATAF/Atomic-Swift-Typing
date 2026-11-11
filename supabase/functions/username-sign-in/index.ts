const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    console.error("Username sign-in requires Supabase URL, anon key, and service role key.");
    return respond({ error: "Username sign-in is not configured." }, 503);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return respond({ error: "Invalid sign-in request." }, 400);

  let payload: { username?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Invalid sign-in request." }, 400);
  }
  const username = typeof payload.username === "string"
    ? payload.username.trim().replace(/^@/, "").toLowerCase()
    : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!/^[a-z0-9_]{3,24}$/.test(username) || !password || password.length > 256) {
    return respond({ error: "Invalid username or password." }, 401);
  }

  let lookupResponse: Response;
  try {
    lookupResponse = await fetch(`${projectUrl}/rest/v1/rpc/lookup_auth_email_for_username`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_username: username }),
    });
  } catch (error) {
    console.error("Username lookup request failed.", error);
    return respond({ error: "Username sign-in is temporarily unavailable." }, 503);
  }
  if (!lookupResponse.ok) {
    console.error("Username lookup failed.", lookupResponse.status);
    return respond({ error: "Username sign-in is temporarily unavailable." }, 503);
  }
  const email = await lookupResponse.json();
  if (typeof email !== "string" || !email) {
    return respond({ error: "Invalid username or password." }, 401);
  }

  let authResponse: Response;
  try {
    authResponse = await fetch(`${projectUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    console.error("Password authentication request failed.", error);
    return respond({ error: "Username sign-in is temporarily unavailable." }, 503);
  }
  if (!authResponse.ok) {
    if (authResponse.status === 429) return respond({ error: "Too many sign-in attempts. Try again later." }, 429);
    if (authResponse.status >= 500) return respond({ error: "Username sign-in is temporarily unavailable." }, 503);
    return respond({ error: "Invalid username or password." }, 401);
  }
  return new Response(await authResponse.text(), {
    status: 200,
    headers: corsHeaders,
  });
});
