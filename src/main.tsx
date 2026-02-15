import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent iOS Safari overscroll bounce on #root
const root = document.getElementById("root")!;
root.addEventListener("touchmove", (e) => {
  const el = root;
  const atTop = el.scrollTop <= 0;
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
  
  if (atTop || atBottom) {
    // Allow scroll if moving away from the boundary
    const touch = e.touches[0];
    if (!touch) return;
    
    if (atTop && atBottom) {
      // Content doesn't scroll at all
      e.preventDefault();
    }
  }
}, { passive: false });

// Prevent the bounce on the document level
document.body.addEventListener("touchmove", (e) => {
  if (e.target === document.body || e.target === document.documentElement) {
    e.preventDefault();
  }
}, { passive: false });

createRoot(root).render(<App />);
