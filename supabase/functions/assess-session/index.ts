import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_LOG_LENGTH = 20000;
const VALID_MODES = ["debate", "interview", "pitch", "presentation", "daily_challenge"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationLog, mode } = await req.json();

    // Input validation
    if (typeof conversationLog === "string" && conversationLog.length > MAX_LOG_LENGTH) {
      return new Response(JSON.stringify({ error: "Input too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mode && !VALID_MODES.includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a practical speaking coach. You evaluate speaking performance and give clear, actionable feedback. No abstract questions. No academic language.

You will receive a conversation log from a ${mode} practice session with multiple rounds of user responses and AI challenge questions.

Evaluate the FULL conversation and return scores and feedback using the tool provided.

SCORING (1-10 scale):
- Clarity: Was the main idea easy to understand? Was the argument well-structured?
- Logic: Did the responses support the claim? Was the reasoning consistent across rounds?
- Evidence: Were specific examples, facts, or concrete explanations used?
- Confidence: Did the speaker sound assured? Did they commit to their points or hedge excessively?
- Pacing: Was the speaking pace appropriate? Too fast, too slow, or well-controlled?
- Filler Words: How well did the speaker avoid filler words like "um", "uh", "like", "you know"?

FEEDBACK RULES:
- Write 1 sentence of direct coaching feedback per category.
- Use simple, clear language a teenager could understand.
- Be specific to what happened in the conversation.
- NEVER use abstract questions like "How might you..." or "What could you consider..."
- GOOD: "Your main idea was clear, but stating your key point in the first sentence would be stronger."
- GOOD: "You responded to the challenge, but adding one concrete example would be more convincing."
- GOOD: "Your pace was slightly fast. Slowing down on important points will help your message land."
- BAD: "How might you better articulate your thesis to your audience?"

TIPS RULES:
- Generate 2-3 short, actionable tips based on the actual transcript.
- Each tip should be something the user can apply immediately in their next session.
- Format: direct instruction, not a question.
- Example: "Use one specific example to support each key point."
- Example: "Reduce filler words like 'um' during your opening statement."
- Example: "Pause for one second after making an important point."`;

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
                description: "Submit the session assessment with scores, feedback, and tips.",
                parameters: {
                  type: "object",
                  properties: {
                    scores: {
                      type: "object",
                      properties: {
                        clarity: { type: "number", minimum: 1, maximum: 10 },
                        logic: { type: "number", minimum: 1, maximum: 10 },
                        evidence: { type: "number", minimum: 1, maximum: 10 },
                        confidence: { type: "number", minimum: 1, maximum: 10 },
                        pacing: { type: "number", minimum: 1, maximum: 10 },
                        filler_words: { type: "number", minimum: 1, maximum: 10 },
                      },
                      required: ["clarity", "logic", "evidence", "confidence", "pacing", "filler_words"],
                      additionalProperties: false,
                    },
                    feedback: {
                      type: "object",
                      properties: {
                        clarity: { type: "string" },
                        logic: { type: "string" },
                        evidence: { type: "string" },
                        confidence: { type: "string" },
                        pacing: { type: "string" },
                        filler_words: { type: "string" },
                      },
                      required: ["clarity", "logic", "evidence", "confidence", "pacing", "filler_words"],
                      additionalProperties: false,
                    },
                    tips: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 3,
                    },
                  },
                  required: ["scores", "feedback", "tips"],
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
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
