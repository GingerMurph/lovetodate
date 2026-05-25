import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GAME_TYPES = new Set(["noughts_crosses", "connect4", "hypothetical_questions", "eight_ball_pool", "whos_who"]);
const GAME_STATUSES = new Set(["pending", "active", "declined", "completed"]);

type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

interface GameRow {
  id: string;
  creator_id: string;
  opponent_id: string;
  current_turn: string | null;
  game_state: Json;
  game_type: string;
  status: string;
  winner_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const validationError = validateBody(body, user.id);
    if (validationError) {
      return json({ error: validationError }, 400);
    }

    const { gameId, action, gameState, currentTurn, winnerId, status } = body as {
      gameId: string;
      action: "respond" | "move";
      gameState?: Json;
      currentTurn?: string | null;
      winnerId?: string | null;
      status?: string;
    };

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: game, error: gameError } = await adminClient
      .from("games")
      .select("id, creator_id, opponent_id, current_turn, game_state, game_type, status, winner_id")
      .eq("id", gameId)
      .maybeSingle<GameRow>();

    if (gameError || !game) {
      return json({ error: "Game not found" }, 404);
    }

    const isParticipant = game.creator_id === user.id || game.opponent_id === user.id;
    if (!isParticipant) {
      return json({ error: "Forbidden" }, 403);
    }

    if (action === "respond") {
      if (game.opponent_id !== user.id || game.status !== "pending") {
        return json({ error: "Game cannot be responded to" }, 403);
      }

      const nextStatus = status!;
      const updatePayload = nextStatus === "active"
        ? { status: nextStatus, current_turn: user.id, winner_id: null }
        : { status: nextStatus, current_turn: null, winner_id: null };

      const { data: updated, error: updateError } = await adminClient
        .from("games")
        .update(updatePayload)
        .eq("id", gameId)
        .select("*")
        .single();

      if (updateError) {
        console.error("[UPDATE-GAME-STATE] respond error:", updateError);
        return json({ error: "Could not update game" }, 500);
      }

      return json({ game: updated });
    }

    if (game.status !== "active") {
      return json({ error: "Game is not active" }, 403);
    }
    if (game.current_turn !== user.id) {
      return json({ error: "Not your turn" }, 403);
    }

    if (winnerId && winnerId !== game.creator_id && winnerId !== game.opponent_id) {
      return json({ error: "Invalid winner" }, 400);
    }

    if (currentTurn && currentTurn !== game.creator_id && currentTurn !== game.opponent_id) {
      return json({ error: "Invalid turn owner" }, 400);
    }

    const updatePayload = {
      game_state: gameState!,
      current_turn: currentTurn ?? null,
      winner_id: winnerId ?? null,
      status: status!,
    };

    const { data: updated, error: updateError } = await adminClient
      .from("games")
      .update(updatePayload)
      .eq("id", gameId)
      .select("*")
      .single();

    if (updateError) {
      console.error("[UPDATE-GAME-STATE] move error:", updateError);
      return json({ error: "Could not update game" }, 500);
    }

    const { error: moveError } = await adminClient.from("game_moves").insert({
      game_id: gameId,
      player_id: user.id,
      move_data: gameState!,
    });

    if (moveError) {
      console.error("[UPDATE-GAME-STATE] move log error:", moveError);
      return json({ error: "Could not save move" }, 500);
    }

    return json({ game: updated });
  } catch (err) {
    console.error("[UPDATE-GAME-STATE] Error:", err);
    return json({ error: "An error occurred" }, 500);
  }
});

function validateBody(body: unknown, userId: string): string | null {
  if (!body || typeof body !== "object") return "Invalid request body";

  const record = body as Record<string, unknown>;
  if (typeof record.gameId !== "string" || !UUID_REGEX.test(record.gameId)) {
    return "Invalid gameId";
  }

  if (record.action !== "respond" && record.action !== "move") {
    return "Invalid action";
  }

  if (record.action === "respond") {
    if (record.status !== "active" && record.status !== "declined") {
      return "Invalid response status";
    }
    if (record.currentTurn !== undefined && record.currentTurn !== null && record.currentTurn !== userId) {
      return "Invalid currentTurn";
    }
    return null;
  }

  if (record.gameState === undefined) {
    return "gameState required";
  }

  if (typeof record.status !== "string" || !GAME_STATUSES.has(record.status)) {
    return "Invalid status";
  }

  if (typeof record.currentTurn !== "string" && record.currentTurn !== null) {
    return "Invalid currentTurn";
  }

  if (record.currentTurn && !UUID_REGEX.test(record.currentTurn)) {
    return "Invalid currentTurn";
  }

  if (record.winnerId !== undefined && record.winnerId !== null) {
    if (typeof record.winnerId !== "string" || !UUID_REGEX.test(record.winnerId)) {
      return "Invalid winnerId";
    }
  }

  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}