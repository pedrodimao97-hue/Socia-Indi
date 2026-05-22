import type { User } from "../types";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ user, size = "md" }: { user: Pick<User, "name" | "avatarUrl">; size?: "sm" | "md" | "lg" }) {
  if (user.avatarUrl) {
    return <img className={`avatar avatar-${size}`} src={user.avatarUrl} alt={user.name} />;
  }

  return <span className={`avatar avatar-${size} avatar-fallback`}>{initials(user.name)}</span>;
}
