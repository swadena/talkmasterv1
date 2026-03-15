import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { conversationLog, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a Socratic reasoning coach. You evaluate THINKING QUALITY, not grammar or speaking ability.

You will receive a conversation log from a ${mode} practice session. The log contains the user's initial response, followed by AI challenge questions and the user's subsequent responses.

Evaluate the FULL conversation and return a JSON object using the tool provided.

SCORING RULES (1-10 scale):
- Clarity: Are the ideas understandable? Is the argument structured?
- Logic: Do the responses support the claim? Is the reasoning consistent?
- Evidence: Are examples, facts, or explanations used?
- Responsiveness: Do the user responses address the challenge questions?
- Critical Thinking: Does the user adapt their reasoning after being challenged? This score should be HIGHER when the user improves their argument across rounds.

FEEDBACK RULES:
- Never be judgmental or grammar-focused.
- Use reflective Socratic questions, not direct criticism.
- Examples: "What evidence could strengthen your claim?", "How might someone challenge this argument?", "Did your final response fully address the last challenge?"

REFLECTION QUESTIONS:
- Generate 2-3 reflection questions that help the user improve their reasoning.
- These should be specific to what happened in the conversation.`;

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
            { role: "user", content: `Here is the full conversation log:\n\n${conversationLog}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_assessment",
                description: "Submit the session assessment with scores and feedback.",
                parameters: {
                  type: "object",
                  properties: {
                    scores: {
                      type: "object",
                      properties: {
                        clarity: { type: "number", minimum: 1, maximum: 10 },
                        logic: { type: "number", minimum: 1, maximum: 10 },
                        evidence: { type: "number", minimum: 1, maximum: 10 },
                        responsiveness: { type: "number", minimum: 1, maximum: 10 },
                        critical_thinking: { type: "number", minimum: 1, maximum: 10 },
                      },
                      required: ["clarity", "logic", "evidence", "responsiveness", "critical_thinking"],
                      additionalProperties: false,
                    },
                    reflection_questions: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 3,
                    },
                  },
                  required: ["scores", "reflection_questions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_assessment" } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in response");
    }

    const assessment = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(assessment), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assess-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
