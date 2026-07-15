export const ROLES = {
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  ZYN: "ZYN",
};

// Pages each role may visit.
export const PAGE_ACCESS = {
  "/": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.ZYN],
  "/entry": [ROLES.ADMIN, ROLES.ENGINEER],
  "/data": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.ZYN],
  "/diesel-log": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.ZYN],
  "/log-entry": [ROLES.ADMIN, ROLES.ENGINEER],
  "/log-data": [ROLES.ADMIN, ROLES.ENGINEER, ROLES.ZYN],
  "/settings": [ROLES.ADMIN],
};

export function canAccessPage(role, pathname) {
  if (!role) return false;
  if (pathname === "/login") return true;
  for (const [prefix, roles] of Object.entries(PAGE_ACCESS)) {
    if (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)) {
      return roles.includes(role);
    }
  }
  return true;
}

export function canWriteEntry(role) {
  return role === ROLES.ADMIN || role === ROLES.ENGINEER;
}

export function canWriteSettings(role) {
  return role === ROLES.ADMIN;
}

// Admin and Engineer can log new maintenance activity; only Admin may edit
// an entry once it has been saved.
export function canCreateMaintenanceLog(role) {
  return role === ROLES.ADMIN || role === ROLES.ENGINEER;
}

export function canEditMaintenanceLog(role) {
  return role === ROLES.ADMIN;
}

export function roleLabel(role) {
  if (role === ROLES.ADMIN) return "Admin";
  if (role === ROLES.ENGINEER) return "Engineer";
  if (role === ROLES.ZYN) return "ZYN";
  return role ?? "";
}
