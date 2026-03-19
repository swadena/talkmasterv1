import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Fetch last 6 sessions for trends (last 3 vs previous 3)
    const { data: sessions } = await supabase
      .from("sessions")
      .select("scores, overall_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6);

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ insight: null, trends: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recent = sessions.slice(0, Math.min(3, sessions.length));
    const previous = sessions.slice(3);

    // Calculate trends
    const skillKeys = ["clarity", "logic", "evidence", "confidence", "pacing", "filler_words"];
    const trends: Record<string, string> = {};

    for (const key of skillKeys) {
      const recentAvg = recent.filter(s => s.scores && (s.scores as any)[key] != null)
        .reduce((sum, s) => sum + ((s.scores as any)[key] || 0), 0) / (recent.length || 1);
      
      if (previous.length >= 2) {
        const prevAvg = previous.filter(s => s.scores && (s.scores as any)[key] != null)
          .reduce((sum, s) => sum + ((s.scores as any)[key] || 0), 0) / (previous.length || 1);
        const diff = recentAvg - prevAvg;
        if (diff > 0.5) trends[key] = "improving";
        else if (diff < -0.5) trends[key] = "needs_work";
        else trends[key] = "stable";
      } else {
        trends[key] = "stable";
      }
    }

    // Generate AI insight from recent sessions
    let insight: string | null = null;

    if (lovableApiKey && recent.length >= 2) {
      const sessionsData = recent.map(s => ({
        scores: s.scores,
        overall: s.overall_score,
      }));

      try {
        const aiRes = await fetch("https://ai-gateway.lovable.dev/api/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You are a concise speaking coach. Given a user's recent session scores, write a 2-3 sentence insight summary. Highlight 1-2 strengths and 1 area to improve. Be specific and encouraging. Do NOT use bullet points. Keep it under 50 words. Skills scored 1-10: clarity, logic, evidence, confidence, pacing, filler_words.`,
              },
              {
                role: "user",
                content: `Recent sessions (newest first): ${JSON.stringify(sessionsData)}`,
              },
            ],
            max_tokens: 150,
          }),
        });

        const aiData = await aiRes.json();
        insight = aiData.choices?.[0]?.message?.content?.trim() || null;
      } catch (aiErr) {
        console.error("AI insight generation failed:", aiErr);
      }
    }

    return new Response(JSON.stringify({ insight, trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-insight error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
