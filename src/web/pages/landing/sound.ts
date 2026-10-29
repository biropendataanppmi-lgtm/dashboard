// Efek suara pendek ("plup") saat berpindah panel, disintesis dengan Web Audio API tanpa file audio.
// AudioContext baru dibuat di dalam interaksi pengguna (klik/ketuk/geser) agar sesuai kebijakan autoplay browser.
// Volume mengikuti volume dan mute perangkat; bila browser menolak, navigasi tetap berjalan tanpa suara.
let ctx: AudioContext | null = null;
let lastPlayed = 0;

const MIN_GAP_MS = 450; // tidak berbunyi berulang saat animasi panel masih berjalan

export function playPanelSound() {
  const now = performance.now();
  if (now - lastPlayed < MIN_GAP_MS) return;
  lastPlayed = now;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const t = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch {
    // Audio bersifat tambahan; kegagalan tidak boleh mengganggu navigasi.
  }
}
