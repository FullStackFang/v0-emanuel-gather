// A host's avatar: their Microsoft photo when one is available, otherwise a
// sapphire disc with their initials. Pure markup, so it renders in both Server
// and Client Components (the header uses it in both).
export function Avatar({
  initials,
  avatarUrl,
  size = 32,
  className = '',
}: {
  initials: string
  avatarUrl?: string | null
  size?: number
  className?: string
}) {
  const dims = { width: size, height: size }

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Microsoft avatar, not a local asset
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={dims}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full bg-primary-600 font-semibold leading-none text-white shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.18)] ${className}`}
      style={{ ...dims, fontSize: Math.round(size * 0.4) }}
    >
      {initials}
    </span>
  )
}
