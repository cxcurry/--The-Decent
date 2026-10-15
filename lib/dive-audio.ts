import type { DiveProfile } from "./dive";

// Procedural sound design, no downloaded samples. Works in both a live and an
// OfflineAudioContext, so the final sound waveform can be tested in a browser.
export function scheduleDiveSound(
  audio: BaseAudioContext,
  profile: DiveProfile,
) {
  const start = audio.currentTime + 0.015,
    duration = profile.duration / 1000;
  const strength = profile.intensity;
  const master = audio.createGain();
  const limiter = audio.createDynamicsCompressor();
  master.gain.value = profile.volume;
  limiter.threshold.value = -14;
  limiter.knee.value = 12;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;
  master.connect(limiter);
  limiter.connect(audio.destination);
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [master, limiter];
  function tone(
    type: OscillatorType,
    from: number,
    to: number,
    at: number,
    length: number,
    level: number,
  ) {
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + length);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(
      level,
      at + Math.min(0.08, length * 0.15),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(at);
    oscillator.stop(at + length);
    sources.push(oscillator);
    nodes.push(oscillator, gain);
  }
  // Low engine sweep and a deeper, larger impact for a rare discovery.
  tone(
    "sine",
    110 - strength * 25,
    42 - strength * 14,
    start,
    duration * 0.94,
    0.45 + strength * 0.35,
  );
  tone(
    "triangle",
    170 - strength * 40,
    65 - strength * 25,
    start + 0.06,
    duration * 0.78,
    0.16 + strength * 0.2,
  );
  if (strength >= 0.64)
    tone("sine", 72, 27, start + 0.15, duration * 0.55, 0.3 + strength * 0.2);
  // Filtered water rush rises with the dive, then settles into the new depth.
  const buffer = audio.createBuffer(
    1,
    Math.ceil(audio.sampleRate * duration),
    audio.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  let seed = 1907;
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    samples[i] = (seed / 2147483648) * 0.55;
  }
  const water = audio.createBufferSource(),
    filter = audio.createBiquadFilter(),
    waterGain = audio.createGain();
  water.buffer = buffer;
  filter.type = "bandpass";
  filter.Q.value = 0.6;
  filter.frequency.setValueAtTime(220, start);
  filter.frequency.exponentialRampToValueAtTime(
    600 + strength * 1600,
    start + duration * 0.4,
  );
  filter.frequency.exponentialRampToValueAtTime(140, start + duration);
  waterGain.gain.setValueAtTime(0.0001, start);
  waterGain.gain.linearRampToValueAtTime(
    0.5 + strength * 0.7,
    start + duration * 0.2,
  );
  waterGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  water.connect(filter);
  filter.connect(waterGain);
  waterGain.connect(master);
  water.start(start);
  water.stop(start + duration);
  sources.push(water);
  nodes.push(water, filter, waterGain);
  // Higher tiers add more sonar voices, rather than only turning up one beep.
  const voices = strength >= 0.84 ? 4 : strength >= 0.4 ? 2 : 1;
  for (let i = 0; i < voices; i++) {
    const at = start + duration * 0.64 + i * 0.11;
    tone(
      "sine",
      510 * Math.pow(1.25, i),
      720 * Math.pow(1.25, i),
      at,
      Math.min(0.3, duration * 0.17),
      0.12 + strength * 0.08,
    );
  }
  const disconnect = () => nodes.forEach((node) => node.disconnect());
  water.onended = disconnect;
  // Muting/navigation can stop a running reward without an abrupt click.
  return () => {
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setTargetAtTime(0.0001, audio.currentTime, 0.008);
    sources.forEach((source) => {
      try {
        source.stop(audio.currentTime + 0.04);
      } catch {}
    });
  };
}
