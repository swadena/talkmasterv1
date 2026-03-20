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
      return new Response(JSON.stringify({ insight: null, trends: null, metricTips: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recent = sessions.slice(0, Math.min(3, sessions.length));
    const previous = sessions.slice(3);

    // Calculate trends with ±0.2 threshold
    const skillKeys = ["clarity", "logic", "evidence", "confidence", "pacing", "filler_words"];
    const trends: Record<string, string> = {};
    const recentAvgs: Record<string, number> = {};

    for (const key of skillKeys) {
      const recentScored = recent.filter(s => s.scores && (s.scores as any)[key] != null);
      const recentAvg = recentScored.length
        ? recentScored.reduce((sum, s) => sum + ((s.scores as any)[key] || 0), 0) / recentScored.length
        : 0;
      recentAvgs[key] = Math.round(recentAvg * 10) / 10;

      if (previous.length >= 2) {
        const prevScored = previous.filter(s => s.scores && (s.scores as any)[key] != null);
        const prevAvg = prevScored.length
          ? prevScored.reduce((sum, s) => sum + ((s.scores as any)[key] || 0), 0) / prevScored.length
          : 0;
        const diff = recentAvg - prevAvg;
        if (diff >= 0.2) trends[key] = "improving";
        else if (diff <= -0.2) trends[key] = "needs_work";
        else trends[key] = "stable";
      } else {
        trends[key] = "stable";
      }
    }

    // Generate AI insight + per-metric tips
    let insight: string | null = null;
    let metricTips: Record<string, string> | null = null;

    if (lovableApiKey && recent.length >= 1) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `You are a concise speaking coach. Given a user's recent session score averages and trends, respond with ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary highlighting 1-2 strengths (highest scores) and 1 area to improve (lowest score). Be specific and encouraging. Under 50 words.",
  "tips": {
    "clarity": "1 sentence actionable tip based on the score",
    "logic": "1 sentence actionable tip",
    "evidence": "1 sentence actionable tip",
    "confidence": "1 sentence actionable tip",
    "pacing": "1 sentence actionable tip",
    "filler_words": "1 sentence actionable tip"
  }
}
Skills are scored 1-10. Write tips that are specific and actionable, e.g. "You tend to hesitate when answering follow-up questions. Try to respond more directly."
Do NOT include any text outside the JSON object.`,
              },
              {
                role: "user",
                content: `Score averages (last 3 sessions): ${JSON.stringify(recentAvgs)}\nTrends: ${JSON.stringify(trends)}`,
              },
            ],
            max_tokens: 400,
          }),
        });

        const aiData = await aiRes.json();
        const raw = aiData.choices?.[0]?.message?.content?.trim();
        if (raw) {
          // Strip markdown code fences if present
          const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
          const parsed = JSON.parse(cleaned);
          insight = parsed.summary || null;
          metricTips = parsed.tips || null;
        }
      } catch (aiErr) {
        console.error("AI insight generation failed:", aiErr);
      }
    }

    return new Response(JSON.stringify({ insight, trends, metricTips }), {
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
