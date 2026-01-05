import { useEffect, useRef } from 'react'

export function useRingtone(isPlaying, soundFile = '/ringtone.mp3') {
  const audioRef = useRef(null)

  useEffect(() => {
    if (isPlaying) {
      // Create audio element if it doesn't exist or sound changed
      if (!audioRef.current || audioRef.current.src !== soundFile) {
        audioRef.current = new Audio(soundFile)
        audioRef.current.loop = true
        audioRef.current.volume = 0.7
      }

      // Play the sound
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked, ignore error
      })
    } else {
      // Stop the sound
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [isPlaying, soundFile])
}