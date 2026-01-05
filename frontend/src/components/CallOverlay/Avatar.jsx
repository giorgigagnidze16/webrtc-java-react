function getInitials(name) {
  if (!name) return '?'

  // Split by spaces or hyphens
  const parts = name.split(/[-\s]+/).filter(Boolean)

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  // Single word - take first two chars or just first
  return name.slice(0, 2).toUpperCase()
}

export function Avatar({ name, size = 'medium' }) {
  const initials = getInitials(name)

  const sizeClass = {
    small: 'small',
    medium: '',
    large: 'large'
  }[size] || ''

  return (
    <div className={`call-avatar ${sizeClass}`}>
      {initials}
    </div>
  )
}
