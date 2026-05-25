import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GAME_TYPES = new Set(["noughts_crosses", "connect4", "hypothetical_questions", "eight_ball_pool", "whos_who"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400);
    const { opponentId, gameType, initialState } = body as { opponentId?: string; gameType?: string; initialState?: unknown };

    if (!opponentId || typeof opponentId !== "string" || !UUID_REGEX.test(opponentId)) {
      return json({ error: "Invalid opponentId" }, 400);
    }
    if (opponentId === userId) return json({ error: "Cannot challenge yourself" }, 400);
    if (!gameType || typeof gameType !== "string" || !GAME_TYPES.has(gameType)) {
      return json({ error: "Invalid gameType" }, 400);
    }
    if (!initialState || typeof initialState !== "object") {
      return json({ error: "Invalid initialState" }, 400);
    }

    const admin = createClient(url, serviceKey);

    // Verify unlocked connection exists between the two users
    const { data: conn } = await admin
      .from("unlocked_connections")
      .select("id")
      .or(`and(unlocker_id.eq.${userId},target_id.eq.${opponentId}),and(unlocker_id.eq.${opponentId},target_id.eq.${userId})`)
      .limit(1);
    if (!conn || conn.length === 0) {
      return json({ error: "No unlocked connection with this user" }, 403);
    }

    // Prevent duplicate active/pending game
    const { data: existing } = await admin
      .from("games")
      .select("id")
      .eq("game_type", gameType as any)
      .in("status", ["pending", "active"])
      .or(`and(creator_id.eq.${userId},opponent_id.eq.${opponentId}),and(creator_id.eq.${opponentId},opponent_id.eq.${userId})`)
      .limit(1);
    if (existing && existing.length > 0) {
      return json({ error: "Game already exists" }, 409);
    }

    const { data: inserted, error: insErr } = await admin
      .from("games")
      .insert({
        game_type: gameType as any,
        creator_id: userId,
        opponent_id: opponentId,
        status: "pending",
        current_turn: userId,
        game_state: initialState as any,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("create-game insert error:", insErr);
      return json({ error: "Could not create game" }, 500);
    }

    return json({ id: inserted.id });
  } catch (e) {
    console.error("create-game error:", e);
    return json({ error: "An error occurred processing your request." }, 500);
  }
});
