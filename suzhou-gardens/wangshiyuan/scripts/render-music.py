#!/usr/bin/env python3
"""Render this garden's original score. No recordings, samples or network calls.

Optional reproduction tools: Python 3, NumPy, SciPy, ffmpeg. The web app uses
the committed MP3 and does not need these tools to install, build or run.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

CONFIG = {'id': 'wangshiyuan-moonlit-pool', 'title': '一池月色', 'style': '疏淡琴音 · 小园静夜', 'seed': 61044, 'bpm': 46, 'transpose': -5, 'brightness': 0.4, 'lead': 'pluck', 'water': False, 'roots': [48, 57, 48, 55, 50, 57, 55, 48], 'accompaniment': [[2.2, 7]], 'melody': [[[0.4, 72, 4]], [[1.5, 69, 3]], [[0.5, 67, 3.5]], [[1, 64, 3]], [[0.4, 67, 3], [3.5, 69, 2]], [[1, 64, 3.5]], [[0.5, 62, 3.5]], [[1, 60, 4.2]]]}
RATE = 44100


def render():
    rng = np.random.default_rng(CONFIG['seed'])
    beat = 60 / CONFIG['bpm']
    bar = beat * 4
    length = bar * 16
    size = round(length * RATE)
    mix = np.zeros((size, 2), dtype=np.float64)

    def note(start, midi, duration, voice, level, pan=0):
        count = min(round(duration * RATE), size - round(start * RATE))
        if count <= 0:
            return
        t = np.arange(count) / RATE
        hz = 440 * 2 ** ((midi - 69) / 12)
        if voice == 'flute':
            # Soft breath, gentle vibrato and a shaped, unhurried phrase.
            vibrato = .0018 * np.sin(2 * np.pi * 4.1 * t) * np.minimum(t / .8, 1)
            phase = 2 * np.pi * np.cumsum(hz * (1 + vibrato)) / RATE
            tone = np.sin(phase) + .16 * np.sin(2 * phase) + .055 * np.sin(3 * phase)
            breath = signal.sosfilt(signal.butter(2, [900, 5200], 'bandpass', fs=RATE, output='sos'), rng.normal(size=count))
            envelope = np.minimum(t / .23, 1) * np.minimum((duration - t) / .55, 1)
            sound = (tone + .055 * breath) * np.clip(envelope, 0, 1) * .42
        elif voice == 'pad':
            envelope = np.sin(np.pi * np.minimum(t / duration, 1)) ** 2
            sound = (np.sin(2 * np.pi * hz * t) + .13 * np.sin(2 * np.pi * hz * 2 * t)) * envelope * .3
        else:
            # Inharmonic, progressively damped partials produce a soft pluck.
            bright = CONFIG['brightness'] if voice == 'pluck' else .4
            sound = np.zeros(count)
            for harmonic in range(1, 9):
                freq = hz * harmonic * (1 + .00013 * harmonic ** 2)
                decay = (2.5 if voice == 'pluck' else 3.5) / (1 + harmonic * .31)
                sound += bright ** (harmonic - 1) / harmonic * np.sin(2 * np.pi * freq * t + .05 * np.sin(2 * np.pi * 3 * t)) * np.exp(-t / decay)
            attack = np.minimum(t / .012, 1)
            release = np.minimum(np.maximum(duration - t, 0) / .18, 1)
            sound *= attack * release * .6
        gains = np.sqrt([(1 - pan) / 2, (1 + pan) / 2])
        offset = round(start * RATE)
        mix[offset:offset + count] += sound[:, None] * gains * level

    # Two related eight-bar phrases, with different replies in the second half.
    for b in range(16):
        root = CONFIG['roots'][b % 8] + CONFIG['transpose']
        note(b * bar + .08, root - 12, bar * .93, 'bass', .30, -.12)
        if b % 2 == 0:
            note(b * bar + beat * 1.4, root + 7, bar * 1.3, 'pad', .075, .22)
        for index, (at, pitch, hold) in enumerate(CONFIG['melody'][b % 8]):
            answer = (12 if b >= 8 and b % 4 == 2 and index == 0 else 0)
            start = b * bar + at * beat + (.04 if index % 2 else 0)
            note(start, pitch + CONFIG['transpose'] + answer, hold * beat,
                 CONFIG['lead'], .55 if CONFIG['lead'] == 'flute' else .68,
                 .12 * np.sin(b + index))
        # Space between melody notes remains audible; accompaniment is sparse.
        for at, interval in CONFIG['accompaniment']:
            note(b * bar + at * beat, root + interval, beat * 2.8, 'pluck', .14, -.3)

    if CONFIG['water']:
        noise = rng.normal(size=size)
        water = signal.sosfilt(signal.butter(2, [180, 1800], 'bandpass', fs=RATE, output='sos'), noise)
        water *= .006 * (1 + .2 * np.sin(np.arange(size) / RATE * .7))
        mix[:, 0] += water
        mix[:, 1] += np.roll(water, 160)
    # Quiet stereo room reflections; no sampled impulse responses.
    dry = mix.copy()
    for delay, gain in [(.17, .14), (.31, .12), (.49, .09), (.73, .06), (1.07, .045), (1.47, .025)]:
        shift = round(delay * RATE)
        mix[shift:] += dry[:-shift, ::-1] * gain
    mix = signal.sosfilt(signal.butter(2, 7200, 'lowpass', fs=RATE, output='sos'), mix, axis=0)
    # Gentle phrase-boundary fades avoid clicks when HTMLAudio loops the track.
    fade = round(RATE * 1.4)
    mix[:fade] *= np.linspace(0, 1, fade)[:, None]
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix *= .52 / max(np.abs(mix).max(), .001)
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    root = Path(__file__).resolve().parents[1]
    output = root / 'public/audio' / (CONFIG['id'] + '.mp3')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / 'score.wav'
        wavfile.write(wav, RATE, pcm)
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                        '-codec:a', 'libmp3lame', '-b:a', '80k', '-ar', '44100',
                        '-metadata', 'title=' + CONFIG['title'], '-metadata', 'artist=Suzhou Gardens original synthesized score',
                        str(output)], check=True)
    receipt = {'id': CONFIG['id'], 'title': CONFIG['title'], 'duration_seconds': round(length, 3),
               'bpm': CONFIG['bpm'], 'channels': 2, 'sample_rate': RATE, 'codec': 'MP3',
               'bitrate': 80000, 'bytes': output.stat().st_size,
               'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
               'peak_dbfs_before_encoding': round(20 * np.log10(np.abs(mix).max()), 2),
               'rms_dbfs_before_encoding': round(20 * np.log10(np.sqrt(np.mean(mix ** 2))), 2),
               'origin': 'Original notes and additive synthesis; no third-party samples or music recordings'}
    report = root / 'docs/reviews/music-1/audio-asset.json'
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == '__main__':
    render()
