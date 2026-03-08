import { useRef, useEffect, useState, useCallback } from "react";
import { usePoolSounds } from "@/hooks/usePoolSounds";

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  type: "solid" | "stripe" | "cue" | "eight";
  pocketed: boolean;
}

interface PoolGameState {
  balls: Ball[];
  currentPlayer: "player1" | "player2";
  player1Type: "solid" | "stripe" | null;
  player2Type: "solid" | "stripe" | null;
  foul: boolean;
  gameOver: boolean;
  winner: string | null;
  cueBallInHand: boolean;
}

interface Props {
  gameState: PoolGameState;
  userId: string;
  creatorId: string;
  isMyTurn: boolean;
  isCompleted: boolean;
  onShot: (newState: PoolGameState) => Promise<void>;
}

// Constants
const TABLE_WIDTH = 340;
const TABLE_HEIGHT = 180;
const BALL_RADIUS = 8;
const POCKET_RADIUS = 14;
const FRICTION = 0.985;
const MIN_VELOCITY = 0.1;
const MAX_POWER = 15;

const POCKETS = [
  { x: POCKET_RADIUS / 2, y: POCKET_RADIUS / 2 },
  { x: TABLE_WIDTH / 2, y: POCKET_RADIUS / 2 - 2 },
  { x: TABLE_WIDTH - POCKET_RADIUS / 2, y: POCKET_RADIUS / 2 },
  { x: POCKET_RADIUS / 2, y: TABLE_HEIGHT - POCKET_RADIUS / 2 },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - POCKET_RADIUS / 2 + 2 },
  { x: TABLE_WIDTH - POCKET_RADIUS / 2, y: TABLE_HEIGHT - POCKET_RADIUS / 2 },
];

const BALL_COLORS: { [key: number]: { color: string; type: "solid" | "stripe" | "eight" } } = {
  1: { color: "#FFD700", type: "solid" },
  2: { color: "#0000FF", type: "solid" },
  3: { color: "#FF0000", type: "solid" },
  4: { color: "#800080", type: "solid" },
  5: { color: "#FFA500", type: "solid" },
  6: { color: "#008000", type: "solid" },
  7: { color: "#800000", type: "solid" },
  8: { color: "#000000", type: "eight" },
  9: { color: "#FFD700", type: "stripe" },
  10: { color: "#0000FF", type: "stripe" },
  11: { color: "#FF0000", type: "stripe" },
  12: { color: "#800080", type: "stripe" },
  13: { color: "#FFA500", type: "stripe" },
  14: { color: "#008000", type: "stripe" },
  15: { color: "#800000", type: "stripe" },
};

export function createInitialPoolState(): PoolGameState {
  const balls: Ball[] = [];
  
  // Cue ball
  balls.push({
    id: 0,
    x: TABLE_WIDTH * 0.25,
    y: TABLE_HEIGHT / 2,
    vx: 0,
    vy: 0,
    color: "#FFFFFF",
    type: "cue",
    pocketed: false,
  });

  // Rack balls in triangle formation
  const startX = TABLE_WIDTH * 0.7;
  const startY = TABLE_HEIGHT / 2;
  const spacing = BALL_RADIUS * 2.1;
  
  // Standard 8-ball rack order (8 in center)
  const rackOrder = [1, 9, 2, 10, 8, 11, 3, 12, 4, 13, 5, 14, 6, 15, 7];
  let ballIndex = 0;
  
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const ballNum = rackOrder[ballIndex];
      const config = BALL_COLORS[ballNum];
      balls.push({
        id: ballNum,
        x: startX + row * spacing * 0.866,
        y: startY + (col - row / 2) * spacing,
        vx: 0,
        vy: 0,
        color: config.color,
        type: config.type,
        pocketed: false,
      });
      ballIndex++;
    }
  }

  return {
    balls,
    currentPlayer: "player1",
    player1Type: null,
    player2Type: null,
    foul: false,
    gameOver: false,
    winner: null,
    cueBallInHand: false,
  };
}

export default function EightBallPool({ gameState, userId, creatorId, isMyTurn, isCompleted, onShot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [balls, setBalls] = useState<Ball[]>(gameState.balls);
  const [isAnimating, setIsAnimating] = useState(false);
  const [aimStart, setAimStart] = useState<{ x: number; y: number } | null>(null);
  const [aimEnd, setAimEnd] = useState<{ x: number; y: number } | null>(null);
  const [power, setPower] = useState(0);
  const [placingCueBall, setPlacingCueBall] = useState(gameState.cueBallInHand);

  const isPlayer1 = userId === creatorId;
  const myType = isPlayer1 ? gameState.player1Type : gameState.player2Type;

  useEffect(() => {
    setBalls(gameState.balls);
    setPlacingCueBall(gameState.cueBallInHand);
  }, [gameState]);

  const drawTable = useCallback((ctx: CanvasRenderingContext2D) => {
    // Table felt
    ctx.fillStyle = "#0a5c36";
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Cushions
    ctx.strokeStyle = "#5a3825";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, TABLE_WIDTH - 8, TABLE_HEIGHT - 8);

    // Pockets
    ctx.fillStyle = "#1a1a1a";
    POCKETS.forEach((pocket) => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });

    // Head string line
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(TABLE_WIDTH * 0.25, 10);
    ctx.lineTo(TABLE_WIDTH * 0.25, TABLE_HEIGHT - 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawBalls = useCallback((ctx: CanvasRenderingContext2D, ballsToDraw: Ball[]) => {
    ballsToDraw.filter((b) => !b.pocketed).forEach((ball) => {
      // Ball shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.arc(ball.x + 2, ball.y + 2, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Ball body
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Stripe band for stripes
      if (ball.type === "stripe") {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(ball.x, ball.y, BALL_RADIUS * 0.7, BALL_RADIUS * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ball number (except cue)
      if (ball.id > 0) {
        ctx.fillStyle = ball.type === "stripe" || ball.id === 8 ? "#FFFFFF" : "#000000";
        if (ball.id <= 8) ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.fillText(ball.id.toString(), ball.x, ball.y + 0.5);
      }

      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(ball.x - BALL_RADIUS * 0.3, ball.y - BALL_RADIUS * 0.3, BALL_RADIUS * 0.25, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const drawAimLine = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!aimStart || !aimEnd || isAnimating || !isMyTurn) return;

    const cueBall = balls.find((b) => b.id === 0 && !b.pocketed);
    if (!cueBall) return;

    // Draw power indicator
    const dx = aimStart.x - aimEnd.x;
    const dy = aimStart.y - aimEnd.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 100);
    const currentPower = (dist / 100) * MAX_POWER;
    setPower(currentPower);

    // Aim line from cue ball
    const angle = Math.atan2(dy, dx);
    const lineLength = 60;
    
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + Math.cos(angle) * lineLength, cueBall.y + Math.sin(angle) * lineLength);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cue stick
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const cueStart = 15 + (currentPower / MAX_POWER) * 20;
    ctx.moveTo(cueBall.x - Math.cos(angle) * cueStart, cueBall.y - Math.sin(angle) * cueStart);
    ctx.lineTo(cueBall.x - Math.cos(angle) * (cueStart + 80), cueBall.y - Math.sin(angle) * (cueStart + 80));
    ctx.stroke();
  }, [aimStart, aimEnd, balls, isAnimating, isMyTurn]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    drawTable(ctx);
    drawBalls(ctx, balls);
    drawAimLine(ctx);
  }, [balls, drawTable, drawBalls, drawAimLine]);

  useEffect(() => {
    render();
  }, [render]);

  const checkCollision = (b1: Ball, b2: Ball) => {
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < BALL_RADIUS * 2;
  };

  const resolveCollision = (b1: Ball, b2: Ball) => {
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // Separate balls
    const overlap = BALL_RADIUS * 2 - dist;
    b1.x -= (overlap / 2) * nx;
    b1.y -= (overlap / 2) * ny;
    b2.x += (overlap / 2) * nx;
    b2.y += (overlap / 2) * ny;

    // Calculate relative velocity
    const dvx = b1.vx - b2.vx;
    const dvy = b1.vy - b2.vy;
    const dvn = dvx * nx + dvy * ny;

    if (dvn > 0) return;

    // Update velocities (elastic collision)
    b1.vx -= dvn * nx;
    b1.vy -= dvn * ny;
    b2.vx += dvn * nx;
    b2.vy += dvn * ny;
  };

  const checkPocket = (ball: Ball): boolean => {
    for (const pocket of POCKETS) {
      const dx = ball.x - pocket.x;
      const dy = ball.y - pocket.y;
      if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS - 2) {
        return true;
      }
    }
    return false;
  };

  const simulatePhysics = useCallback((ballsState: Ball[]): Promise<{ finalBalls: Ball[]; pocketedThisTurn: Ball[] }> => {
    return new Promise((resolve) => {
      const simBalls = ballsState.map((b) => ({ ...b }));
      const pocketedThisTurn: Ball[] = [];

      const step = () => {
        let moving = false;

        simBalls.forEach((ball) => {
          if (ball.pocketed) return;

          // Apply velocity
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall collisions
          if (ball.x - BALL_RADIUS < 10) {
            ball.x = BALL_RADIUS + 10;
            ball.vx = -ball.vx * 0.8;
          }
          if (ball.x + BALL_RADIUS > TABLE_WIDTH - 10) {
            ball.x = TABLE_WIDTH - BALL_RADIUS - 10;
            ball.vx = -ball.vx * 0.8;
          }
          if (ball.y - BALL_RADIUS < 10) {
            ball.y = BALL_RADIUS + 10;
            ball.vy = -ball.vy * 0.8;
          }
          if (ball.y + BALL_RADIUS > TABLE_HEIGHT - 10) {
            ball.y = TABLE_HEIGHT - BALL_RADIUS - 10;
            ball.vy = -ball.vy * 0.8;
          }

          // Check pocketing
          if (checkPocket(ball)) {
            ball.pocketed = true;
            ball.vx = 0;
            ball.vy = 0;
            pocketedThisTurn.push(ball);
          }

          // Apply friction
          ball.vx *= FRICTION;
          ball.vy *= FRICTION;

          // Stop if very slow
          if (Math.abs(ball.vx) < MIN_VELOCITY) ball.vx = 0;
          if (Math.abs(ball.vy) < MIN_VELOCITY) ball.vy = 0;

          if (Math.abs(ball.vx) > MIN_VELOCITY || Math.abs(ball.vy) > MIN_VELOCITY) {
            moving = true;
          }
        });

        // Ball-ball collisions
        for (let i = 0; i < simBalls.length; i++) {
          for (let j = i + 1; j < simBalls.length; j++) {
            if (simBalls[i].pocketed || simBalls[j].pocketed) continue;
            if (checkCollision(simBalls[i], simBalls[j])) {
              resolveCollision(simBalls[i], simBalls[j]);
            }
          }
        }

        setBalls([...simBalls]);

        if (moving) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          setIsAnimating(false);
          resolve({ finalBalls: simBalls, pocketedThisTurn });
        }
      };

      setIsAnimating(true);
      animationRef.current = requestAnimationFrame(step);
    });
  }, []);

  const handleShot = async () => {
    if (!aimStart || !aimEnd || isAnimating || !isMyTurn) return;

    const cueBall = balls.find((b) => b.id === 0 && !b.pocketed);
    if (!cueBall) return;

    const dx = aimStart.x - aimEnd.x;
    const dy = aimStart.y - aimEnd.y;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 100);
    const shotPower = (dist / 100) * MAX_POWER;

    if (shotPower < 1) return;

    const angle = Math.atan2(dy, dx);
    const newBalls = balls.map((b) =>
      b.id === 0 ? { ...b, vx: Math.cos(angle) * shotPower, vy: Math.sin(angle) * shotPower } : { ...b }
    );

    setAimStart(null);
    setAimEnd(null);
    setPower(0);

    const { finalBalls, pocketedThisTurn } = await simulatePhysics(newBalls);

    // Game logic after shot
    let newState = { ...gameState, balls: finalBalls };
    const cuePocketed = pocketedThisTurn.some((b) => b.id === 0);
    const eightPocketed = pocketedThisTurn.some((b) => b.id === 8);
    
    // Assign types on first pocket
    if (!gameState.player1Type && pocketedThisTurn.length > 0) {
      const firstNonCue = pocketedThisTurn.find((b) => b.type !== "cue" && b.type !== "eight");
      if (firstNonCue && (firstNonCue.type === "solid" || firstNonCue.type === "stripe")) {
        if (isPlayer1) {
          newState.player1Type = firstNonCue.type;
          newState.player2Type = firstNonCue.type === "solid" ? "stripe" : "solid";
        } else {
          newState.player2Type = firstNonCue.type;
          newState.player1Type = firstNonCue.type === "solid" ? "stripe" : "solid";
        }
      }
    }

    // Check win/lose conditions
    if (eightPocketed) {
      const playerType = isPlayer1 ? newState.player1Type : newState.player2Type;
      const ownBallsRemaining = finalBalls.filter(
        (b) => !b.pocketed && b.type === playerType
      ).length;

      if (ownBallsRemaining === 0 && !cuePocketed) {
        newState.gameOver = true;
        newState.winner = userId;
      } else {
        newState.gameOver = true;
        newState.winner = isPlayer1 ? "player2" : "player1";
      }
    }

    // Cue ball pocketed = foul
    if (cuePocketed) {
      newState.cueBallInHand = true;
      newState.foul = true;
      // Reset cue ball position
      const cueBallIndex = finalBalls.findIndex((b) => b.id === 0);
      if (cueBallIndex >= 0) {
        finalBalls[cueBallIndex] = {
          ...finalBalls[cueBallIndex],
          x: TABLE_WIDTH * 0.25,
          y: TABLE_HEIGHT / 2,
          pocketed: false,
          vx: 0,
          vy: 0,
        };
      }
      newState.balls = finalBalls;
    }

    // Switch turns unless player pocketed their ball type
    const pocketedOwnType = pocketedThisTurn.some((b) => {
      const playerType = isPlayer1 ? newState.player1Type : newState.player2Type;
      return b.type === playerType;
    });

    if (!pocketedOwnType || cuePocketed) {
      newState.currentPlayer = newState.currentPlayer === "player1" ? "player2" : "player1";
    }

    newState.foul = false;
    await onShot(newState);
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = TABLE_WIDTH / rect.width;
    const scaleY = TABLE_HEIGHT / rect.height;
    
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMyTurn || isAnimating || isCompleted) return;
    
    const coords = getCanvasCoords(e);
    const cueBall = balls.find((b) => b.id === 0 && !b.pocketed);
    
    if (placingCueBall) {
      if (coords.x < TABLE_WIDTH * 0.25 + 10) {
        const newBalls = balls.map((b) =>
          b.id === 0 ? { ...b, x: coords.x, y: coords.y, pocketed: false } : b
        );
        setBalls(newBalls);
        setPlacingCueBall(false);
      }
      return;
    }

    if (cueBall) {
      setAimStart(coords);
      setAimEnd(coords);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!aimStart || isAnimating) return;
    setAimEnd(getCanvasCoords(e));
  };

  const handlePointerUp = () => {
    if (aimStart && aimEnd && power > 1) {
      handleShot();
    } else {
      setAimStart(null);
      setAimEnd(null);
      setPower(0);
    }
  };

  const remainingSolids = balls.filter((b) => b.type === "solid" && !b.pocketed).length;
  const remainingStripes = balls.filter((b) => b.type === "stripe" && !b.pocketed).length;

  return (
    <div className="space-y-4">
      {/* Score display */}
      <div className="flex justify-between text-sm">
        <div className={`px-3 py-1 rounded ${myType === "solid" ? "bg-gold/20 text-gold" : "text-muted-foreground"}`}>
          Solids: {remainingSolids}
        </div>
        <div className={`px-3 py-1 rounded ${myType === "stripe" ? "bg-gold/20 text-gold" : "text-muted-foreground"}`}>
          Stripes: {remainingStripes}
        </div>
      </div>

      {/* Power bar */}
      {aimStart && (
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
            style={{ width: `${(power / MAX_POWER) * 100}%` }}
          />
        </div>
      )}

      {/* Canvas */}
      <div className="border-4 border-amber-900 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          className="w-full touch-none"
          style={{ aspectRatio: `${TABLE_WIDTH}/${TABLE_HEIGHT}` }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Instructions */}
      {placingCueBall && isMyTurn && (
        <p className="text-sm text-gold text-center animate-pulse">
          Tap behind the line to place the cue ball
        </p>
      )}
      {!placingCueBall && isMyTurn && !isAnimating && !isCompleted && (
        <p className="text-xs text-muted-foreground text-center">
          Drag back from the cue ball to aim, then release to shoot
        </p>
      )}

      {/* Ball type indicator */}
      {myType && (
        <p className="text-xs text-center text-muted-foreground">
          You are <span className="text-gold font-medium">{myType === "solid" ? "Solids (1-7)" : "Stripes (9-15)"}</span>
        </p>
      )}
    </div>
  );
}
