import { useState, useEffect, useRef } from 'react';

/**
 * Hook to measure live audio level and detect speaking from a MediaStream.
 * Uses Web Audio API AnalyserNode.
 */
export function useAudioActivity(
  stream: MediaStream | null,
  isMuted: boolean = false,
  threshold: number = 15
): { isSpeaking: boolean; audioLevel: number } {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || isMuted) {
      setIsSpeaking(false);
      setAudioLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      setIsSpeaking(false);
      setAudioLevel(0);
      return;
    }

    let isMounted = true;
    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      // Resume if suspended (browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      const checkAudio = () => {
        if (!isMounted || !analyser) return;

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));

        setAudioLevel(normalized);

        if (average > threshold) {
          speakingCounter = Math.min(speakingCounter + 1, 10);
        } else {
          speakingCounter = Math.max(speakingCounter - 1, 0);
        }

        setIsSpeaking(speakingCounter > 2);

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      // Graceful fallback if Web Audio is unsupported or audio device is in use
    }

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (source) {
        source.disconnect();
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      audioContextRef.current = null;
    };
  }, [stream, isMuted, threshold]);

  return { isSpeaking, audioLevel };
}
