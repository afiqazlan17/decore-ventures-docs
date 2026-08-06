export interface StaffUser {
  name: string;
  email: string;
}

export const STAFF: StaffUser[] = [
  { name: "Afiq", email: "afiq@decore.my" },
  { name: "Gee", email: "naziah@decore.my" },
  { name: "Hanis", email: "hanis@decore.my" },
  { name: "Chem", email: "chem@decore.my" },
];

export const SHARED_PASSWORD = "decore2026";

export const AUTH_STORAGE_KEY = "decore_staff_user";

export function findStaffByEmail(email: string): StaffUser | undefined {
  return STAFF.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
}
