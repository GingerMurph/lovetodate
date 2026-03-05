interface Props {
  board: (string | null)[];
  mySymbol: string;
  isMyTurn: boolean;
  onMove: (index: number) => void;
}

export default function NoughtsCrossesBoard({ board, mySymbol, isMyTurn, onMove }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
      {board.map((cell, i) => (
        <button
          key={i}
          onClick={() => isMyTurn && !cell && onMove(i)}
          disabled={!isMyTurn || !!cell}
          className={`aspect-square rounded-xl border-2 text-3xl font-bold transition-all flex items-center justify-center
            ${!cell && isMyTurn ? "border-gold/30 hover:border-gold hover:bg-accent/50 cursor-pointer" : "border-border cursor-default"}
            ${cell === "X" ? "text-blue-500" : cell === "O" ? "text-red-500" : ""}`}
        >
          {cell}
        </button>
      ))}
    </div>
  );
}
