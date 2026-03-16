import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const scenarioPersonas: Record<string, string> = {
  debate: `You are a warm but sharp debate coach having a real conversation. You genuinely listen and respond like a thoughtful human sparring partner — not a quiz show host. Your tone is encouraging but intellectually honest.`,
  interview: `You are a friendly, experienced interviewer conducting a realistic job interview. You respond naturally, like a real hiring manager — curious, empathetic, but probing. You want to understand the person, not interrogate them.`,
  pitch: `You are a thoughtful investor in a casual pitch meeting. You're genuinely interested but naturally skeptical. Your questions feel like a real conversation over coffee, not a formal Q&A.`,
  presentation: `You are an engaged audience member at a presentation. You ask questions because you're genuinely curious and want to understand better — not to trip up the speaker.`,
};

const questionGuidance: Record<string, { light: string; deep: string }> = {
  debate: {
    light: "Ask a clarifying or restating question about their argument. E.g. 'What do you mean by...?', 'Can you give an example of...?', 'So you're saying that...?'",
    deep: "Challenge the underlying logic, evidence, or assumptions. Ask for counterpoints. E.g. 'What evidence supports...?', 'How would you respond to someone who says...?', 'Isn't it possible that...?'",
  },
  interview: {
    light: "Ask a natural follow-up about their experience or reasoning. E.g. 'Can you walk me through that?', 'What was your role in that?', 'How did that turn out?'",
    deep: "Probe deeper into their reasoning, decision-making, or self-awareness. E.g. 'What would you do differently?', 'How did you measure success there?', 'What was the hardest part and why?'",
  },
  pitch: {
    light: "Ask a simple clarifying question about the idea. E.g. 'Who exactly is this for?', 'How does that work in practice?', 'What's the current status?'",
    deep: "Challenge the value proposition, market assumptions, or evidence. E.g. 'What makes you confident about that market size?', 'How is this different from X?', 'What's your biggest risk?'",
  },
  presentation: {
    light: "Ask about clarity or a specific point. E.g. 'Could you elaborate on that point?', 'What do you mean by...?', 'How does that connect to your main point?'",
    deep: "Challenge the structure, evidence, or main takeaway. E.g. 'What data supports that conclusion?', 'How would you explain this to someone unfamiliar?', 'What's the strongest counterargument?'",
  },
};

const fallbackPrompts: Record<string, string> = {
  debate: "What is your strongest argument for your position?",
  interview: "Tell me about a time you faced a significant challenge at work. How did you handle it?",
  pitch: "In one sentence, why should someone invest in this idea?",
  presentation: "What's the one thing you want your audience to remember from this?",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, mode, previousChallenges, roundNumber } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Detect exit intent in the user's transcript
    const exitPhrases = [
      "i want to stop", "i want to finish", "i'm tired", "im tired",
      "let's stop", "lets stop", "i'm done", "im done", "can we stop",
      "how do we finish", "i want to end", "let's end", "lets end",
      "i'd like to stop", "id like to stop", "can we finish",
      "i don't want to continue", "i dont want to continue",
      "that's enough", "thats enough", "stop the session",
      "end the session", "finish the session", "i give up",
    ];
    const lowerTranscript = (transcript || "").toLowerCase().trim();
    const hasExitIntent = exitPhrases.some((p) => lowerTranscript.includes(p));

    if (hasExitIntent) {
      // Return a soft assurance question once, then farewell
      return new Response(
        JSON.stringify({
          challenge: "I understand you'd like to wrap up. Before we finish, is there anything specific that made you want to stop early?",
          questionType: "exit_assurance",
          exitIntent: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const persona = scenarioPersonas[mode] || scenarioPersonas.debate;
    const guidance = questionGuidance[mode] || questionGuidance.debate;

    // Alternate: rounds 0,1,2 = light, round 3 = deep, rounds 4,5 = light, round 6 = deep, etc.
    const isDeepRound = roundNumber > 0 && roundNumber % 3 === 0;
    const questionType = isDeepRound ? "deep" : "light";
    const questionInstruction = isDeepRound ? guidance.deep : guidance.light;

    const previousContext = previousChallenges?.length
      ? `\n\nQuestions already asked (do NOT repeat or rephrase these):\n${previousChallenges.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const systemPrompt = `${persona}

IMPORTANT RULES:
- Generate exactly ONE question. No preamble, no "Great point!" — just the question itself.
- The question must sound like something a real person would say in conversation.
- Keep it to 1-2 sentences maximum.
- This is round ${roundNumber + 1}. This should be a ${questionType} question.
- ${questionInstruction}
- Never repeat or closely rephrase a previous question.${previousContext}`;

    const userMessage = transcript?.trim()
      ? `The user just said:\n\n"${transcript}"\n\nGenerate a ${questionType} follow-up question that directly responds to what they said.`
      : `The user hasn't said anything clear yet. Ask a natural opening question for a ${mode} session. Use this as a starting point: "${fallbackPrompts[mode]}" — but rephrase it naturally.`;

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
    let challenge =
      data.choices?.[0]?.message?.content?.trim() || "Can you elaborate on that?";

    // Strip any leading quotes the model might add
    challenge = challenge.replace(/^["']|["']$/g, "");

    return new Response(JSON.stringify({ challenge, questionType }), {
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
