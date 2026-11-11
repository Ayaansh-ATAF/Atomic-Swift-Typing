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
    console.error("Security case review requires Supabase URL and API keys.");
    return respond({ error: "Security review is not configured." }, 503);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return respond({ error: "Sign in required." }, 401);

  let payload: { caseId?: unknown; confirmation?: unknown };
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Invalid security review request." }, 400);
  }
  const caseId = typeof payload.caseId === "string" ? payload.caseId : "";
  if (payload.confirmation !== "BAN") return respond({ error: "Explicit ban confirmation is required." }, 400);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId)) {
    return respond({ error: "Invalid security case." }, 400);
  }

  const userResponse = await fetch(`${projectUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!userResponse.ok) return respond({ error: "Your session is invalid or expired." }, 401);
  const currentUser = await userResponse.json();
  if (typeof currentUser.id !== "string") return respond({ error: "Your session is invalid." }, 401);

  const profileResponse = await fetch(
    `${projectUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(currentUser.id)}&select=role`,
    { headers: { apikey: anonKey, Authorization: authorization } },
  );
  if (!profileResponse.ok) {
    console.error("Could not verify the security reviewer role.", profileResponse.status);
    return respond({ error: "Could not verify administrator access." }, 503);
  }
  const profiles = await profileResponse.json();
  if (!Array.isArray(profiles) || profiles[0]?.role !== "admin") {
    return respond({ error: "Only administrators can ban accounts." }, 403);
  }

  const serviceHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
  const caseResponse = await fetch(
    `${projectUrl}/rest/v1/security_cases?id=eq.${encodeURIComponent(caseId)}&status=eq.open&select=id,actor_id,signal_type`,
    { headers: serviceHeaders },
  );
  if (!caseResponse.ok) {
    console.error("Could not load the security case.", caseResponse.status);
    return respond({ error: "Could not load this security case." }, 503);
  }
  const cases = await caseResponse.json();
  const securityCase = Array.isArray(cases) ? cases[0] : null;
  if (!securityCase) return respond({ error: "Open security case not found." }, 404);
  if (!securityCase.actor_id || securityCase.signal_type !== "chat_unauthorized") {
    return respond({ error: "This report does not identify an account that can be banned." }, 400);
  }
  if (securityCase.actor_id === currentUser.id) {
    return respond({ error: "You cannot ban your own account from a security report." }, 400);
  }

  const banResponse = await fetch(
    `${projectUrl}/auth/v1/admin/users/${encodeURIComponent(securityCase.actor_id)}`,
    {
      method: "PUT",
      headers: { ...serviceHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ban_duration: "876000h" }),
    },
  );
  if (!banResponse.ok) {
    console.error("Supabase Auth could not ban the reported account.", banResponse.status);
    return respond({ error: "The account was not banned. Check Supabase Auth and try again." }, 502);
  }

  const updateResponse = await fetch(
    `${projectUrl}/rest/v1/security_cases?id=eq.${encodeURIComponent(caseId)}&status=eq.open`,
    {
      method: "PATCH",
      headers: {
        ...serviceHeaders,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "banned",
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        review_note: "Account banned by an administrator.",
      }),
    },
  );
  if (!updateResponse.ok) {
    console.error("Account was banned, but the security case could not be updated.", updateResponse.status);
    return respond({
      error: "The account was banned, but the case history could not be updated. Contact a project owner.",
    }, 502);
  }
  const updatedCases = await updateResponse.json();
  if (!Array.isArray(updatedCases) || updatedCases.length !== 1) {
    return respond({
      error: "The account was banned, but the case status could not be confirmed. Contact a project owner.",
    }, 502);
  }

  return respond({ success: true });
});
