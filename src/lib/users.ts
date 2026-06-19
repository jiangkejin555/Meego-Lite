export interface UserDisplay {
  name: string;
  deletedAt?: string | Date | null;
}

export function formatUserName(user: UserDisplay) {
  return user.deletedAt ? `${user.name}（已删除）` : user.name;
}

export function getUserInitials(user: UserDisplay) {
  return user.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
