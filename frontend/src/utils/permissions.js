/**
 * Role-based permissions for CRM
 * Matches backend ROLE_PERMISSIONS
 */

export const ROLE_PERMISSIONS = {
  admin: {
    profile: ["read", "write"],
    notifications: ["read", "write"],
    appearance: ["read", "write"],
    security: ["read", "write"],
    company: ["read", "write"],
    scheduling: ["read", "write"],
    zones: ["read", "write"],
    documents: ["read", "write"],
    email: ["read", "write"],
    billing: ["read", "write"],
    integrations: ["read", "write"],
    api: ["read", "write"],
    data: ["read", "write"],
    advanced: ["read", "write"],
    team: ["read", "write"],
  },
  manager: {
    profile: ["read", "write"],
    notifications: ["read", "write"],
    appearance: ["read", "write"],
    security: ["read", "write"],
    scheduling: ["read", "write"],
    zones: ["read"],
    documents: ["read"],
    email: ["read"],
    billing: ["read"],
    integrations: ["read"],
    api: ["read"],
    data: ["read"],
    advanced: ["read"],
    team: ["read"],
  },
  commercial: {
    profile: ["read", "write"],
    notifications: ["read", "write"],
    appearance: ["read", "write"],
    security: ["read", "write"],
    scheduling: ["read"],
  },
  operator: {
    profile: ["read", "write"],
    notifications: ["read", "write"],
    appearance: ["read", "write"],
    security: ["read", "write"],
    scheduling: ["read"],
  },
  accountant: {
    profile: ["read", "write"],
    notifications: ["read", "write"],
    appearance: ["read", "write"],
    security: ["read", "write"],
    billing: ["read"],
    data: ["read"],
  },
};

/**
 * Check if user has permission for a section and action
 * @param {string} role - User role
 * @param {string} section - Section name
 * @param {string} action - "read" or "write"
 * @returns {boolean}
 */
export const hasPermission = (role, section, action = "read") => {
  const normalizedRole = (role || "operator").toLowerCase();
  const permissions = ROLE_PERMISSIONS[normalizedRole] || {};
  const sectionPerms = permissions[section] || [];
  return sectionPerms.includes(action);
};

/**
 * Get all accessible sections for a role
 * @param {string} role - User role
 * @returns {object} Sections with their permissions
 */
export const getAccessibleSections = (role) => {
  const normalizedRole = (role || "operator").toLowerCase();
  return ROLE_PERMISSIONS[normalizedRole] || {};
};

/**
 * Check if user can read a section
 */
export const canRead = (role, section) => hasPermission(role, section, "read");

/**
 * Check if user can write/modify a section
 */
export const canWrite = (role, section) => hasPermission(role, section, "write");
