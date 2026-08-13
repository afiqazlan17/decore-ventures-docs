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

export const AUTH_STORAGE_KEY = "decore_staff_user";
