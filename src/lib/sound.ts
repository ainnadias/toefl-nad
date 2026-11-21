let enabled = false;
let audioContext: AudioContext | null = null;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function getContext(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  volume = 0.15
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  const startTime = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/** Jawaban benar: dua nada naik. */
export function playCorrectSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  playTone(ctx, 523.25, 0, 0.12);
  playTone(ctx, 783.99, 0.1, 0.18);
}

/** Jawaban salah: satu nada rendah pendek. */
export function playWrongSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  playTone(ctx, 220, 0, 0.2, 0.12);
}

/** Naik level: arpeggio 4 nada naik. */
export function playLevelUpSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => playTone(ctx, freq, i * 0.1, 0.18));
}

/** Badge terbuka / momen manis lain: dua nada tinggi cepat. */
export function playBadgeSound(): void {
  const ctx = getContext();
  if (!ctx) return;
  [659.25, 987.77].forEach((freq, i) => playTone(ctx, freq, i * 0.08, 0.15, 0.12));
}
