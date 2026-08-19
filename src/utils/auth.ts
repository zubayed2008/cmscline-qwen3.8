import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Retrieves the current session on the server side.
 * Returns null if no session exists.
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Checks if the current user is authenticated.
 * Returns the session if authenticated, otherwise throws an error.
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Checks if the current user has the Admin role.
 * Returns true if the user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.role === 'Admin';
}

/**
 * Requires the current user to be an Admin.
 * Throws an error if not authenticated or not an admin.
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== 'Admin') {
    throw new Error('Forbidden: Admin access required');
  }

  return session;
}