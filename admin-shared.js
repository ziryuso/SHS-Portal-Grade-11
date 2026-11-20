/**
 * admin-shared.js - shared helpers and status labels.
 */

export const pages = {};

export const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
export const SB = {
    approved: ["Approved", "ok"], pending: ["Pending", "warn"], inactive: ["Inactive", "bad"]
};