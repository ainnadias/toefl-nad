import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

interface AudioPlayerProps {
  src: string;
}

export interface AudioPlayerHandle {
  play: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer(
  { src },
  ref
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useImperativeHandle(ref, () => ({
    play: () => {
      audioRef.current?.play();
    },
  }));

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function replay() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setCurrentTime(audio.currentTime);
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-primary-50 p-4 dark:bg-stone-700">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-md shadow-primary-500/30 hover:bg-primary-600"
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={replay}
        aria-label="Ulangi dari awal"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-600 dark:bg-stone-600 dark:text-primary-200"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <div className="flex flex-1 items-center gap-2">
        <span className="w-10 text-right text-xs font-medium text-stone-500 dark:text-stone-300">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="h-2 flex-1 cursor-pointer accent-primary-500"
          aria-label="Posisi audio"
        />
        <span className="w-10 text-xs font-medium text-stone-500 dark:text-stone-300">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
});

export default AudioPlayer;
