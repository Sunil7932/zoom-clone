import { colorFromName, initials } from "@/lib/cn";

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

/** Circular initials avatar with a deterministic colour fallback. */
export function Avatar({ name, color, size = 40, className = "" }: AvatarProps) {
  const bg = color || colorFromName(name);
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white select-none ${className}`}
      style={{
        backgroundColor: bg,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
