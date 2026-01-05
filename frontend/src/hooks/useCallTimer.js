import { useState, useEffect } from 'react'

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function useCallTimer(startTime) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) {
      setElapsed(0)
      return
    }

    // Calculate initial elapsed time
    const initialElapsed = Math.floor((Date.now() - startTime) / 1000)
    setElapsed(initialElapsed)

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return {
    elapsed,
    formatted: formatTime(elapsed)
  }
}
