import { useEffect, useRef, useState } from 'react';
import { MUSIC } from './score';
import './music.css';

type Phase = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
const storageKey = `${MUSIC.id}:volume`;
function savedVolume() {
  try {
    const raw = localStorage.getItem(storageKey);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 30;
  } catch { return 30; }
}

export default function MusicPanel() {
  const audio = useRef<HTMLAudioElement>(null);
  const context = useRef<AudioContext>();
  const gain = useRef<GainNode>();
  const intent = useRef(false);
  const request = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [volume, setVolume] = useState(savedVolume);

  useEffect(() => {
    const element = audio.current!;
    const pause = () => {
      intent.current = false;
      request.current++;
      element.pause();
      setPhase(previous => previous === 'idle' ? 'idle' : 'paused');
    };
    const hidden = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pause);
      intent.current = false;
      request.current++;
      element.pause();
      gain.current?.disconnect();
      void context.current?.close().catch(() => {});
    };
  }, []);

  const toggle = () => {
    const element = audio.current!;
    const current = ++request.current;
    if (intent.current) {
      intent.current = false;
      element.pause();
      setPhase('paused');
      return;
    }
    intent.current = true;
    setPhase('loading');
    try {
      // Both calls remain inside the user gesture, including Safari's unlock.
      if (!context.current && window.AudioContext) {
        const ctx = new AudioContext();
        const level = ctx.createGain();
        const source = ctx.createMediaElementSource(element);
        source.connect(level);
        level.connect(ctx.destination);
        level.gain.value = volume / 100;
        element.volume = 1;
        context.current = ctx;
        gain.current = level;
      }
      if (!gain.current) element.volume = volume / 100;
      if (element.error) element.load();
      const playback = element.play();
      const resume = context.current?.resume();
      void Promise.all([playback, resume]).then(() => {
        if (request.current !== current || !intent.current) return;
        if (document.hidden) { intent.current = false; element.pause(); setPhase('paused'); }
        else setPhase('playing');
      }).catch(() => {
        if (request.current !== current) return;
        intent.current = false;
        element.pause();
        setPhase('error');
      });
    } catch {
      intent.current = false;
      element.pause();
      setPhase('error');
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    if (gain.current && context.current) gain.current.gain.setTargetAtTime(value / 100, context.current.currentTime, .05);
    else if (audio.current) audio.current.volume = value / 100;
    try { localStorage.setItem(storageKey, String(value)); } catch { /* Optional device preference. */ }
  };
  const playing = phase === 'playing' || phase === 'loading';
  const label = playing ? '暂停音乐' : phase === 'error' ? '重试音乐' : phase === 'paused' ? '继续音乐' : '开启音乐';

  return <section className="music-panel" aria-label="园林背景音乐">
    <audio ref={audio} src={`${import.meta.env.BASE_URL}audio/${MUSIC.id}.mp3`} preload="none" loop
      onPlaying={() => { if (intent.current && !document.hidden) setPhase('playing'); else audio.current?.pause(); }}
      onPause={() => {
        if (audio.current?.paused && intent.current) { intent.current = false; request.current++; }
        setPhase(previous => previous === 'playing' ? 'paused' : previous);
      }}
      onWaiting={() => { if (intent.current) setPhase('loading'); }}
      onError={() => { intent.current = false; request.current++; setPhase('error'); }} />
    <div className="music-track"><span className="music-kicker">园中听音</span><span className="music-title">{MUSIC.title}</span><span className="music-style">{MUSIC.style}</span></div>
    <div className="music-controls">
      <button type="button" className="music-toggle" data-testid="music-toggle" onClick={toggle} aria-pressed={playing}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">{playing ? <path d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/> : <path d="m7 4 9 6-9 6V4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>}</svg>{label}
      </button>
      <label className="music-volume">音量<input type="range" data-testid="music-volume" min="0" max="100" step="5" value={volume} aria-label="背景音乐音量" aria-valuetext={`${volume}%`} onChange={event => changeVolume(Number(event.target.value))}/></label>
    </div>
    <p className={`music-message${phase === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">{phase === 'error' ? '音乐暂时无法播放，请重试。' : phase === 'loading' ? '正在载入音乐…' : ''}</p>
  </section>;
}
