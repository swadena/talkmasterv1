import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const topicSystemPrompts: Record<string, string> = {
  debate: `You are a sharp debate coach. Analyze the user's argument and ask a pointed challenge question that targets the weakest part of their reasoning. Focus on logical gaps, unsupported claims, or missing counter-arguments. If no clear argument is found, ask: "What is your strongest argument for your position?"`,
  interview: `You are an experienced interview coach. Analyze the user's answer and ask a follow-up question an interviewer would ask to probe deeper. Focus on specifics, examples, or inconsistencies. If no clear answer is found, ask: "How would you answer this question convincingly in a real interview?"`,
  pitch: `You are a skeptical investor evaluating a pitch. Analyze the user's pitch and ask a tough question about viability, market, differentiation, or evidence. If no clear pitch is found, ask: "Why should someone invest in this idea?"`,
  presentation: `You are an audience member at a presentation. Analyze the user's speech and ask a question about clarity, evidence, or the main takeaway. If no clear presentation is found, ask: "What is the main takeaway you want your audience to remember?"`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, mode, previousChallenges } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = topicSystemPrompts[mode] || topicSystemPrompts.debate;

    const previousContext = previousChallenges?.length
      ? `\n\nPrevious challenges already asked (do NOT repeat these):\n${previousChallenges.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const userMessage = transcript?.trim()
      ? `Here is what the user just said:\n\n"${transcript}"\n\nGenerate ONE short, natural challenge question (1-2 sentences max) that directly relates to what they said. Make it feel like a real conversation, not a quiz.${previousContext}`
      : `The user didn't say anything clearly. Ask a natural opening challenge question for a ${mode} session.${previousContext}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const challenge =
      data.choices?.[0]?.message?.content?.trim() || "Can you elaborate on that?";

    return new Response(JSON.stringify({ challenge }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-challenge error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
