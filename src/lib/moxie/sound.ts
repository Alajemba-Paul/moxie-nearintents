let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    ctx ??= new AudioCtx();
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq: number, dur: number, type: OscillatorType, gainValue: number) {
  try {
    const audio = context();
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur + 0.02);
  } catch {
    // ignore audio errors
  }
}

export const sfx = {
  tap() {
    blip(880, 0.06, "square", 0.04);
  },
  lock() {
    blip(180, 0.12, "sine", 0.07);
    blip(320, 0.08, "triangle", 0.04);
  },
  bought() {
    blip(523, 0.08, "triangle", 0.05);
    if (typeof window !== "undefined") {
      window.setTimeout(() => blip(784, 0.12, "triangle", 0.05), 70);
    }
  },
  nope() {
    blip(140, 0.16, "sawtooth", 0.03);
  },
};

