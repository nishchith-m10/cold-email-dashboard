/**
 * Client-safe super admin check.
 * Uses NEXT_PUBLIC_SUPER_ADMIN_IDS so it works in both server and client components.
 * For server-side logic requiring @clerk/nextjs/server, use lib/workspace-access.ts.
 */

const SUPER_ADMIN_IDS: string[] = process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS
  ? process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS.split(',').map(id => id.trim())
  : [];

export function isSuperAdmin(userId: string): boolean {
  return SUPER_ADMIN_IDS.includes(userId);
}
