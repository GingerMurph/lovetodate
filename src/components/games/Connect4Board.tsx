interface Props {
  board: (string | null)[][];
  myColor: string;
  isMyTurn: boolean;
  onMove: (col: number) => void;
}

export default function Connect4Board({ board, myColor, isMyTurn, onMove }: Props) {
  return (
    <div className="max-w-[350px] mx-auto">
      {/* Column drop buttons */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, col) => {
          const colFull = board[0][col] !== null;
          return (
            <button
              key={col}
              onClick={() => isMyTurn && !colFull && onMove(col)}
              disabled={!isMyTurn || colFull}
              className={`h-8 rounded-t-lg text-xs font-semibold transition-all
                ${isMyTurn && !colFull ? "bg-gold/20 hover:bg-gold/40 text-gold cursor-pointer" : "bg-muted text-muted-foreground cursor-default"}`}
            >
              ↓
            </button>
          );
        })}
      </div>
      {/* Board */}
      <div className="bg-blue-900/80 rounded-xl p-2">
        <div className="grid grid-cols-7 gap-1">
          {board.flatMap((row, r) =>
            row.map((cell, c) => (
              <div key={`${r}-${c}`} className="aspect-square rounded-full bg-background/90 flex items-center justify-center">
                {cell && (
                  <div className={`w-[85%] h-[85%] rounded-full ${cell === "red" ? "bg-red-500" : "bg-yellow-400"}`} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
