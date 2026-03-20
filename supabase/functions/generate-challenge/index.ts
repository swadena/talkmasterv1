import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const scenarioPersonas: Record<string, string> = {
  debate: `You are a warm, conversational debate partner. You genuinely listen and respond naturally — like a smart friend having a real discussion. You're supportive first, curious second, and only challenging when it truly adds value.`,
  interview: `You are a friendly, down-to-earth interviewer. You make the person feel comfortable, like a casual coffee chat with a hiring manager who's genuinely interested in them — not testing them.`,
  pitch: `You are a relaxed, curious investor in a casual meeting. You're interested and ask simple, direct questions. You're not trying to poke holes — you want to understand the idea.`,
  presentation: `You are an engaged, friendly audience member. You ask questions because you're genuinely curious — not to challenge or trip up the speaker.`,
  daily_challenge: `You are an encouraging speaking coach. The user is practicing thinking on their feet. You're supportive and keep the energy light — helping them build confidence, not testing them.`,
};

const questionGuidance: Record<string, { warmup: string; explore: string; deeper: string }> = {
  debate: {
    warmup: "Ask a simple, easy question to get them talking. E.g. 'What's your take on this?', 'What comes to mind first?'",
    explore: "Ask a natural follow-up. Acknowledge what they said, then ask for more detail or an example. E.g. 'That makes sense — can you give an example?', 'Interesting, how would that work?'",
    deeper: "Gently push deeper on one specific point. E.g. 'What would someone who disagrees say?', 'How confident are you about that?'",
  },
  interview: {
    warmup: "Ask an easy, open question to warm up. E.g. 'Tell me a bit about yourself', 'What got you interested in this field?'",
    explore: "Follow up naturally on what they shared. E.g. 'How did that turn out?', 'What was your role in that?'",
    deeper: "Ask one focused question about their thinking. E.g. 'What would you do differently now?', 'What was the hardest part?'",
  },
  pitch: {
    warmup: "Ask a simple clarifying question. E.g. 'So what's the basic idea?', 'Who is this for?'",
    explore: "Follow up on their answer with curiosity. E.g. 'How does that work in practice?', 'What's the current status?'",
    deeper: "Ask one pointed question. E.g. 'What's your biggest risk?', 'How is this different from what's already out there?'",
  },
  presentation: {
    warmup: "Ask an easy question about their topic. E.g. 'What's the main idea here?', 'Why does this matter to you?'",
    explore: "Ask for more detail on something they mentioned. E.g. 'Can you explain that a bit more simply?', 'What do you mean by that?'",
    deeper: "Push gently on their main point. E.g. 'What's the strongest evidence for that?', 'How would you convince a skeptic?'",
  },
  daily_challenge: {
    warmup: "Ask a very simple question to get them started. E.g. 'What's your first thought on this?', 'What stands out to you about this topic?'",
    explore: "Follow up naturally. E.g. 'Can you give an example?', 'How would that work in real life?'",
    deeper: "Ask one slightly more challenging question. E.g. 'What would someone who disagrees say?', 'Are there any downsides?'",
  },
};

const fallbackPrompts: Record<string, string> = {
  debate: "What's your take on this?",
  interview: "Tell me a bit about yourself and what you're interested in.",
  pitch: "So what's the basic idea behind this?",
  presentation: "What's the main thing you want people to take away from this?",
  daily_challenge: "What's your first thought on this topic?",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, mode, previousChallenges, roundNumber, dailyTopic } = await req.json();

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

    // Progressive difficulty: warmup → explore → deeper
    let questionType: string;
    let questionInstruction: string;
    if (roundNumber <= 2) {
      questionType = "warmup";
      questionInstruction = guidance.warmup;
    } else if (roundNumber >= 6) {
      questionType = "deeper";
      questionInstruction = guidance.deeper;
    } else {
      questionType = "explore";
      questionInstruction = guidance.explore;
    }

    const previousContext = previousChallenges?.length
      ? `\n\nQuestions already asked (do NOT repeat or rephrase these):\n${previousChallenges.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const dailyTopicContext = mode === "daily_challenge" && dailyTopic
      ? `\n\nDAILY CHALLENGE TOPIC: "${dailyTopic}"\nThis is the topic for today's session. All your questions MUST relate to this topic. If the user asks you to repeat the question or topic, restate this exact topic clearly: "${dailyTopic}".`
      : "";

    const systemPrompt = `${persona}

CONVERSATION STYLE:
- Be clear and easy to understand
- Keep questions short — max 1-2 sentences
- Use simple, direct wording — avoid academic or complex language
- Sound like a real person, not a quiz show host

BEHAVIOR:
- Do NOT challenge every response
- Balance between: supportive (acknowledge good points), curious (ask for more detail), challenging (only when it adds real value)
- If the answer is decent → ask a simple follow-up
- If the answer is unclear → gently ask for clarification
- If the answer is strong → explore a bit deeper
- Only challenge when it genuinely adds value

THIS IS ROUND ${roundNumber + 1}. Phase: ${questionType}.
- ${questionInstruction}

RULES:
- Return ONLY one clear, natural question. Nothing else.
- No preamble like "Great point!" or "That's interesting!"
- No multiple questions in one response
- Keep it under 10 seconds of speech when read aloud
- Never repeat or closely rephrase a previous question${previousContext}${dailyTopicContext}`;

    // Detect repeat/restate requests for daily challenge
    const repeatPhrases = [
      "repeat the question", "repeat the topic", "what was the question",
      "what was the topic", "say that again", "can you repeat", "what's the topic",
      "whats the topic", "what is the topic", "what is the question",
      "remind me", "tell me the topic again", "tell me the question again",
    ];
    const isRepeatRequest = mode === "daily_challenge" && dailyTopic &&
      repeatPhrases.some((p) => lowerTranscript.includes(p));

    if (isRepeatRequest) {
      return new Response(
        JSON.stringify({
          challenge: `Sure! Your topic is: ${dailyTopic}. What are your thoughts on this?`,
          questionType: "repeat",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
