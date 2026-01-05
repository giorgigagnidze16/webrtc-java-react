export function PulseRings({ ringCount = 3 }) {
  return (
    <div className="pulse-rings">
      {Array.from({ length: ringCount }).map((_, i) => (
        <div key={i} className="pulse-ring" />
      ))}
    </div>
  )
}
