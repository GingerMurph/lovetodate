/**
 * Server-side win/state validators for turn-based games.
 *
 * The goal is to prevent a client from self-declaring a win without a
 * legitimate board position. For deterministic board games we recompute the
 * winner from the supplied board; for free-form games (hypothetical_questions,
 * whos_who, eight_ball_pool) we still allow client-reported outcomes but
 * enforce shape and turn-coherence invariants.
 */

type Json = unknown;

export interface ValidateInput {
  gameType: string;
  previousState: Json;
  nextState: Json;
  status: string;
  winnerId: string | null;
  currentTurn: string | null;
  movingPlayerId: string;
  creatorId: string;
  opponentId: string;
}

export interface ValidateResult {
  ok: boolean;
  reason?: string;
}

/** Recompute the winner mark for a 3x3 noughts & crosses board. */
function noughtsCrossesWinner(board: unknown): "X" | "O" | "draw" | null {
  if (!Array.isArray(board) || board.length !== 9) return null;
  const cells = board.map((c) => (c === "X" || c === "O" ? c : null));
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a] as "X" | "O";
  }
  if (cells.every((c) => c !== null)) return "draw";
  return null;
}

/** Recompute the winner for a 7x6 connect-4 board. */
function connect4Winner(board: unknown): "R" | "Y" | "draw" | null {
  if (!Array.isArray(board) || board.length !== 6) return null;
  const grid: (string | null)[][] = board.map((row) => {
    if (!Array.isArray(row) || row.length !== 7) return new Array(7).fill(null);
    return row.map((c) => (c === "R" || c === "Y" ? c : null));
  });
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const v = grid[r][c];
      if (!v) continue;
      for (const [dr, dc] of dirs) {
        let n = 1;
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7) break;
          if (grid[nr][nc] === v) n++;
          else break;
        }
        if (n >= 4) return v as "R" | "Y";
      }
    }
  }
  const full = grid.every((row) => row.every((c) => c !== null));
  return full ? "draw" : null;
}

export function validateGameUpdate(input: ValidateInput): ValidateResult {
  const { gameType, nextState, status, winnerId, currentTurn, movingPlayerId, creatorId, opponentId } = input;

  if (nextState === null || typeof nextState !== "object") {
    return { ok: false, reason: "Invalid gameState" };
  }

  // Turn / winner coherence applies to every game type.
  if (status === "completed") {
    if (currentTurn !== null) return { ok: false, reason: "Completed games must have null currentTurn" };
  } else if (status === "active") {
    if (currentTurn !== creatorId && currentTurn !== opponentId) {
      return { ok: false, reason: "Active games must hand turn to a participant" };
    }
    if (currentTurn === movingPlayerId) {
      return { ok: false, reason: "Turn must pass to the other player" };
    }
    if (winnerId !== null) return { ok: false, reason: "Active games cannot have a winner" };
  } else {
    return { ok: false, reason: "Invalid status transition" };
  }

  if (gameType === "noughts_crosses") {
    const state = nextState as { board?: unknown; xPlayer?: unknown; oPlayer?: unknown };
    const winnerMark = noughtsCrossesWinner(state.board);
    if (status === "completed") {
      if (winnerMark === null) return { ok: false, reason: "Game not actually finished" };
      if (winnerMark === "draw") {
        if (winnerId !== null) return { ok: false, reason: "Draw cannot have winner" };
      } else {
        const expectedWinner = winnerMark === "X" ? state.xPlayer : state.oPlayer;
        if (typeof expectedWinner !== "string" || expectedWinner !== winnerId) {
          return { ok: false, reason: "Declared winner does not match board" };
        }
      }
    } else if (winnerMark !== null) {
      return { ok: false, reason: "Board shows finished game but status is active" };
    }
    return { ok: true };
  }

  if (gameType === "connect4") {
    const state = nextState as { board?: unknown; redPlayer?: unknown; yellowPlayer?: unknown };
    const winnerMark = connect4Winner(state.board);
    if (status === "completed") {
      if (winnerMark === null) return { ok: false, reason: "Game not actually finished" };
      if (winnerMark === "draw") {
        if (winnerId !== null) return { ok: false, reason: "Draw cannot have winner" };
      } else {
        const expectedWinner = winnerMark === "R" ? state.redPlayer : state.yellowPlayer;
        if (typeof expectedWinner !== "string" || expectedWinner !== winnerId) {
          return { ok: false, reason: "Declared winner does not match board" };
        }
      }
    } else if (winnerMark !== null) {
      return { ok: false, reason: "Board shows finished game but status is active" };
    }
    return { ok: true };
  }

  // Free-form games — accept client-reported outcome but enforce winner
  // belongs to participants (already validated upstream) and no spoofed
  // current-turn handoff to self (checked above).
  return { ok: true };
}
