import { cookies } from "next/headers";

/**
 * Authorization checks for the admin surfaces.
 *
 * These are async even though `cookies()` is still synchronous on Next 14, and
 * that is deliberate. In Next 16 `cookies()` returns a promise, and a
 * *synchronous* version of this file becomes an auth bypass that the compiler
 * cannot see:
 *
 *     if (!canManageProducts()) return unauthorized();   // returns a Promise
 *     // !Promise.resolve(false) === false, so the guard never fires
 *
 * `tsc --strict` exits 0 on that, there are no tests here, and eslint is not
 * type-aware — so the first sign would be an unauthenticated DELETE on a
 * product. Converting now, on a version where both shapes work, means the
 * framework upgrade cannot silently disarm eight call sites.
 *
 * Every caller must `await`. Do not make these synchronous again.
 */
export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("admin")?.value === "1";
}

export async function isManagerRequest(): Promise<boolean> {
  const jar = await cookies();
  return jar.get("manager")?.value === "1";
}

export async function canManageProducts(): Promise<boolean> {
  return (await isAdminRequest()) || (await isManagerRequest());
}
