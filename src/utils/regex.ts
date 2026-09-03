// Escapes regex metacharacters so user input can be safely used inside a MongoDB $regex query.
export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
