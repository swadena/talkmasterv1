import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FIELD_LENGTH = 1000;

// Sanitize cell values to prevent formula injection
function sanitizeCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value).slice(0, MAX_FIELD_LENGTH);
  // Prefix with single-quote if starts with a formula character
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { most_useful, frustration, would_pay } = await req.json();

    // Validate input lengths
    if (
      (most_useful && String(most_useful).length > MAX_FIELD_LENGTH) ||
      (frustration && String(frustration).length > MAX_FIELD_LENGTH) ||
      (would_pay && String(would_pay).length > MAX_FIELD_LENGTH)
    ) {
      return new Response(JSON.stringify({ error: "Input too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already claimed
    const { data: profile } = await supabase
      .from("profiles")
      .select("feedback_reward_claimed, credits, email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.feedback_reward_claimed) {
      return new Response(JSON.stringify({ error: "Already claimed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get session count
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Add 1 credit and mark as claimed
    await supabase
      .from("profiles")
      .update({
        credits: profile.credits + 1,
        feedback_reward_claimed: true,
      })
      .eq("id", user.id);

    // Append to Google Sheet
    const googleKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (googleKey) {
      try {
        const keyData = JSON.parse(googleKey);
        const accessToken = await getGoogleAccessToken(keyData);
        const spreadsheetId = "1NLHp1STfX-OkdWalUruk0Av5sMzROB5mvoDC2ULZ9Lk";

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:F:append?valueInputOption=RAW`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [[
                sanitizeCell(profile.email || user.email || ""),
                count || 0,
                sanitizeCell(most_useful),
                sanitizeCell(frustration),
                sanitizeCell(would_pay),
                new Date().toISOString(),
              ]],
            }),
          }
        );
      } catch (sheetErr) {
        console.error("Google Sheets append failed:", sheetErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("submit-feedback error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// JWT-based Google auth for service accounts
async function getGoogleAccessToken(keyData: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = btoa(
    JSON.stringify({
      iss: keyData.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = `${header}.${claim}`;

  const pemContents = keyData.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${claim}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get Google access token");
  return tokenData.access_token;
}
