import { useCallback, useRef } from "react";

export function usePoolSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const playCollision = useCallback((intensity: number = 0.5) => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(Math.min(intensity, 1) * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800 + intensity * 400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.08);
  }, [getCtx]);

  const playPocket = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    // Low thud
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.3);

    // Rattle noise
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.15);
  }, [getCtx]);

  const playWin = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const delay = i * 0.12;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.3, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.4);

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + delay);
      osc.connect(gain);
      osc.start(t + delay);
      osc.stop(t + delay + 0.4);
    });
  }, [getCtx]);

  const playCueHit = useCallback(() => {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.12);
  }, [getCtx]);

  return { playCollision, playPocket, playWin, playCueHit };
}
