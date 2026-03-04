import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSE_DESCRIPTIONS: Record<string, string> = {
  thumbs_up: "giving a thumbs up",
  peace_sign: "making a peace sign / V sign with their fingers",
  wave: "waving at the camera",
  point_nose: "pointing to their nose",
  three_fingers: "showing three fingers",
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

    // Verify the user
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
    const { selfie_path, challenge_token } = body;

    if (!selfie_path || typeof selfie_path !== "string") {
      return new Response(JSON.stringify({ error: "selfie_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!challenge_token || typeof challenge_token !== "string" || challenge_token.length !== 64) {
      return new Response(JSON.stringify({ error: "Valid challenge_token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate the path belongs to this user
    const expectedPrefix = `${user.id}/`;
    if (!selfie_path.startsWith(expectedPrefix)) {
      return new Response(JSON.stringify({ error: "Invalid selfie path" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Validate the challenge token
    const { data: challenge, error: challengeErr } = await adminClient
      .from("verification_challenges")
      .select("*")
      .eq("token", challenge_token)
      .eq("user_id", user.id)
      .eq("used", false)
      .single();

    if (challengeErr || !challenge) {
      return new Response(JSON.stringify({ error: "Invalid or expired challenge. Please start verification again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(challenge.expires_at) < new Date()) {
      // Mark as used
      await adminClient
        .from("verification_challenges")
        .update({ used: true })
        .eq("id", challenge.id);

      return new Response(JSON.stringify({ error: "Challenge expired. Please start verification again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark challenge as used immediately to prevent replay
    await adminClient
      .from("verification_challenges")
      .update({ used: true })
      .eq("id", challenge.id);

    // Download the selfie image for AI analysis
    const { data: fileData, error: fileError } = await adminClient.storage
      .from("profile-photos")
      .download(selfie_path);

    if (fileError || !fileData) {
      return new Response(JSON.stringify({ error: "Selfie file not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert image to base64 for AI analysis
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Use Lovable AI (Gemini) for face detection + pose verification
    const poseDescription = POSE_DESCRIPTIONS[challenge.pose] || challenge.pose;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    let aiVerified = false;

    if (lovableApiKey) {
      try {
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
                    text: `You are a verification system. Analyze this image and answer with ONLY "YES" or "NO".

Does this image show a real human face (not a drawing, screenshot, or photo of a photo) that appears to be ${poseDescription}?

Rules:
- Must be a real person's face clearly visible
- The person should be ${poseDescription}
- Photos of screens, printed photos, or drawings should be rejected
- Answer ONLY "YES" or "NO", nothing else.`,
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
            max_tokens: 5,
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const answer = aiResult.choices?.[0]?.message?.content?.trim()?.toUpperCase();
          aiVerified = answer === "YES";
        } else {
          console.error("AI verification API error:", aiResponse.status, await aiResponse.text());
        }
      } catch (aiErr) {
        console.error("AI verification failed:", aiErr);
      }
    }

    if (!aiVerified) {
      return new Response(
        JSON.stringify({
          error: "Verification failed. Please ensure the photo clearly shows your face performing the requested pose, and try again.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark profile as verified
    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({
        is_verified: true,
        verification_selfie_url: selfie_path,
        verified_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("Verification update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update verification status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-verification error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
