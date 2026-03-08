import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { document_path, document_type } = body;

    if (!document_path || typeof document_path !== "string") {
      return new Response(JSON.stringify({ error: "document_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["driving_license", "passport"];
    if (!document_type || !validTypes.includes(document_type)) {
      return new Response(JSON.stringify({ error: "document_type must be 'driving_license' or 'passport'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate path belongs to user
    if (!document_path.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "Invalid document path" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check if already age verified
    const { data: profile } = await adminClient
      .from("profiles")
      .select("age_verified")
      .eq("user_id", user.id)
      .single();

    if (profile?.age_verified) {
      return new Response(JSON.stringify({ error: "Age already verified" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the document
    const { data: fileData, error: fileError } = await adminClient.storage
      .from("profile-photos")
      .download(document_path);

    if (fileError || !fileData) {
      return new Response(JSON.stringify({ error: "Document file not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docTypeLabel = document_type === "driving_license" ? "driving license / driver's license" : "passport";

    const aiResponse = await fetch("https://ai.lovable.dev/api/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an age verification system. Analyze this image of a ${docTypeLabel}.

Extract the date of birth from the document. Then determine if the person is at least 18 years old as of today's date (${new Date().toISOString().split("T")[0]}).

IMPORTANT RULES:
- The image must show a real ${docTypeLabel} document
- You must be able to clearly read the date of birth
- Photos of screens showing documents should be rejected
- If you cannot read the DOB clearly, respond with FAILED

Respond in EXACTLY this format (nothing else):
RESULT: PASS or FAIL
DOB: YYYY-MM-DD or UNKNOWN
REASON: brief explanation

Examples:
RESULT: PASS
DOB: 1995-03-15
REASON: Person is 31 years old, over 18.

RESULT: FAIL
DOB: 2010-06-20
REASON: Person is 15 years old, under 18.

RESULT: FAIL
DOB: UNKNOWN
REASON: Could not read date of birth from document.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI verification service error. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const answer = aiResult.choices?.[0]?.message?.content?.trim() || "";

    const resultMatch = answer.match(/RESULT:\s*(PASS|FAIL)/i);
    const dobMatch = answer.match(/DOB:\s*(\d{4}-\d{2}-\d{2}|UNKNOWN)/i);
    const reasonMatch = answer.match(/REASON:\s*(.+)/i);

    const passed = resultMatch?.[1]?.toUpperCase() === "PASS";
    const extractedDob = dobMatch?.[1] !== "UNKNOWN" ? dobMatch?.[1] : null;
    const reason = reasonMatch?.[1] || "Unable to process document";

    // Store verification attempt
    await adminClient.from("age_verifications").insert({
      user_id: user.id,
      document_type,
      verified: passed,
      extracted_dob: extractedDob,
      rejection_reason: passed ? null : reason,
    });

    if (passed) {
      // Update profile
      await adminClient
        .from("profiles")
        .update({
          age_verified: true,
          age_verified_at: new Date().toISOString(),
          date_of_birth_verified: extractedDob,
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true, message: "Age verified successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: `Age verification failed: ${reason}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("verify-age-document error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
