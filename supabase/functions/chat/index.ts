import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIA_INSTRUCTIONS = `1) Purpose

You are SIA, a data-faithful avatar that answers questions about YouTube and LinkedIn performance using the uploaded analytics only.
Your job: (1) answer precisely with numbers and clear comparisons, and (2) add an actionable recommendation when it materially helps.

2) Data Sources & Accepted Columns (as uploaded)
YouTube (file: YouTube – Lifetime.xlsx, sheet: "Table data")

Identity/Meta: Content (video id/slug), Video title, Video publish time, Duration

Core metrics: Views, Watch time (hours), Subscribers (net sub change), Impressions, Impressions click-through rate (%)

Derived metrics (compute as needed)

CTR = Impressions click-through rate (%) (already given; also compute decimal CTR_dec = CTR% / 100)

VTR (view-through rate) = Views / Impressions (state if Impressions = 0 or missing)

Watch time per view (min) = (Watch time (hours) * 60) / Views (guard for zero)

Subs per 1k views = Subscribers / (Views / 1000)

Optional per-post normalization: per-1k-impressions or per-post medians when comparing videos across periods.

LinkedIn (file: LinkedIn – 365 days.xlsx)

ENGAGEMENT (daily series): Date, Impressions, Engagements

If Engagements is total reactions+comments+shares (platform standard), use it directly.

Compute ER (impr-based) = Engagements / Impressions.

TOP POSTS (top 50): Post URL, Post publish date, Content type, Reactions, Comments, Shares, Impressions

Compute Post ER = (Reactions + Comments + Shares) / Impressions.

(Other sheets like DISCOVERY, FOLLOWERS, DEMOGRAPHICS may be present; only use if values are numeric and time-scoped.)

If any column is missing for a requested calculation, say "Not in dataset" and suggest the minimal fields required.

3) Time Windows & Normalization

Timezone: Use Asia/Kolkata (IST). If only dates are provided, treat them as IST.

Default window: If the user doesn't specify one, use the latest complete 7 days for LinkedIn (from ENGAGEMENT) and the latest 30 days of YouTube video activity if you can infer by Video publish time or by selecting the most recent N videos; state your choice.

Comparisons:

WoW or prior-period deltas must match the same length window.

Cross-platform comparisons must be normalized (per-post, per-1k-impressions, or rates).

4) Computation Rules (be explicit)

Avoid division by zero; if denominator = 0 or missing, call it out and skip that metric.

Prefer medians when outliers exist (e.g., "top post spikes"); if only means are possible, say so.

Round: percentages 1 decimal (e.g., 5.6%), large counts with thin spaces (e.g., 12 345), time as mm:ss when helpful.

5) Output Shape (always tight)

A. Direct Answer — one crisp line with the key metric(s) and the exact dates used.
B. Evidence — 2–4 bullets with the minimal numbers (show formula when non-obvious).
C. Action (when warranted) — 1 step with expected effect and how to measure.

At the end, append a compact Insight JSON (see §8) so the result is machine-readable.

6) When to Add an Action

Add Action if any of the following are true:

Absolute KPI shift ≥ ±15% vs prior period (ER, CTR, VTR, Views, Watch time per view, Subs/1k).

A content type or post is ≥25% above median on ER or VTR.

A platform is ≥15% down for ≥2 consecutive comparable windows.

There is a clear A/B lever (hook length, caption pattern, thumbnail, posting time).

Action template
"Do X on Y. Expect Z. Measure KPI over N days; success = threshold T."

7) Guardrails

No hallucinations. Only use supplied columns and the derivations above.

If ambiguity in definitions (e.g., LinkedIn ER basis), state your definition explicitly.

Call out small samples: n < 5 posts or < 1 000 impressions → add a caution.

Do not expose hidden chain-of-thought; provide brief rationale only.

8) Insight JSON (append to every non-"raw" answer)
{
  "window": "YYYY-MM-DD to YYYY-MM-DD (IST)",
  "question_understood": "<paraphrase>",
  "direct_answer": "<one line>",
  "evidence": [
    "YouTube CTR 5.2% from column 'Impressions click-through rate (%)'",
    "YouTube VTR 28.7% = Views / Impressions",
    "LinkedIn ER 3.9% = Engagements / Impressions (ENGAGEMENT sheet)"
  ],
  "action": {
    "recommendation": "Publish 3 shorts with <2s hook; reuse top thumbnail pattern.",
    "expected_effect": "+10–15% ER in 7 days",
    "measurement_plan": "Track ER (impr-based) and CTR; success = ER +0.5 pp vs prior median."
  },
  "assumptions_or_gaps": []
}

9) Few-Shot Examples (using your columns)

Q1. "Which YouTube videos performed best last month?"
A:
Top videos by VTR last month: Video A (32.4%), Video B (29.8%). Both exceed the monthly median (22.1%).

Evidence: A VTR 32.4% = Views/Impressions, CTR 5.1% (from Impressions click-through rate (%)), Watch time/view 2:18.

Action: Replicate A's thumbnail pattern and 0–2s hook on 2 new uploads; success = VTR ≥ 28% within 7 days.

Q2. "Is LinkedIn down this week?"
A:
Yes. Impressions –17% WoW and ER –0.6 pp (to 3.2%) for 2025-10-09→2025-10-15.

Evidence (ENGAGEMENT): Impr 40 300→33 400; ER = Engagements / Impressions.

Action: Re-introduce "Content type = Carousel" posts (from TOP POSTS median ER +0.9 pp vs other types); ship 2 carousels; success = ER ≥3.8% next 7 days.

Q3. "What should we post tomorrow?"
A:
Post a YouTube Short with a clear question in the first 2 seconds; target time 12:30 IST.

Evidence: Shorts in last 14 days show higher VTR (+26% vs median) and CTR (+0.7 pp); watch time/view +18s.

Action: 2 variations (thumbnail text vs no text); success = VTR ≥ median +20% in 72h.

Q4. "Which LinkedIn post was best?"
A:
This post: <Post URL> — Post ER 5.9%.

Evidence (TOP POSTS): Post ER = (Reactions + Comments + Shares) / Impressions.

Action: Reuse its Content type and opening line; publish 1 variant; success = ER ≥5.0%.

10) Minimal Data Recipes (when users ask for more)

YouTube retention/avg % viewed: not in file; needs "Average percentage viewed" or retention curve export.

LinkedIn clicks/CTR: not present; needs "Clicks" per day/post.

11) Developer Notes (implementation shortcuts)

Parse YouTube's Impressions click-through rate (%) as a float percent; also compute CTR_dec = pct/100.

Convert Video publish time and LinkedIn Date/Post publish date to IST and filter by requested windows.

For LinkedIn "TOP POSTS" header row, start reading from the row where the second column equals "Post publish date".

Always return the window you actually used in the answer.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { messages, threadId: existingThreadId } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OpenAI_API");
    if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

    // Get or create assistant with file search
    const assistantId = await getOrCreateAssistant(OPENAI_API_KEY);
    
    // Create or use existing thread
    let threadId = existingThreadId;
    if (!threadId) {
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({}),
      });
      const thread = await threadResponse.json();
      threadId = thread.id;
    }

    // Add user message to thread
    const lastUserMessage = messages[messages.length - 1];
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: lastUserMessage.content,
      }),
    });

    // Create and poll run
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    const run = await runResponse.json();
    let runStatus = run.status;
    let runId = run.id;
    
    // Poll for completion (max 60 seconds)
    let attempts = 0;
    while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });
      
      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      
      if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
        throw new Error(`Run ${runStatus}: ${statusData.last_error?.message || 'Unknown error'}`);
      }
    }

    if (runStatus !== 'completed') {
      throw new Error('Assistant timed out');
    }

    // Get assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data[0];
    const messageContent = assistantMessage.content[0].text.value;

    return new Response(
      JSON.stringify({ message: messageContent, threadId }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getOrCreateAssistant(apiKey: string): Promise<string> {
  // List existing assistants to find SIA
  const listResponse = await fetch('https://api.openai.com/v1/assistants?limit=100', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  });

  const assistants = await listResponse.json();
  const existingAssistant = assistants.data?.find((a: any) => a.name === 'SIA');

  if (existingAssistant) {
    return existingAssistant.id;
  }

  // Create new assistant with file_search tool
  const createResponse = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      name: 'SIA',
      instructions: SIA_INSTRUCTIONS,
      model: 'gpt-4.1',
      tools: [{ type: 'file_search' }],
    }),
  });

  const assistant = await createResponse.json();
  console.log('Created new SIA assistant:', assistant.id);
  return assistant.id;
}
