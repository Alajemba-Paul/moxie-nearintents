let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  ctx ??= new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freq: number, dur: number, type: OscillatorType, gainValue: number) {
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
    window.setTimeout(() => blip(784, 0.12, "triangle", 0.05), 70);
  },
  nope() {
    blip(140, 0.16, "sawtooth", 0.03);
  },
};
