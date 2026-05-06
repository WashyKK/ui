import { cookies } from "next/headers";

export function isAdminRequest(): boolean {
  return cookies().get("admin")?.value === "1";
}

export function isManagerRequest(): boolean {
  return cookies().get("manager")?.value === "1";
}

export function canManageProducts(): boolean {
  return isAdminRequest() || isManagerRequest();
}
