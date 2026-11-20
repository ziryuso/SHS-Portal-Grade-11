/**
 * admin.js - administrator area entry: navigation menu and page registry (pages live in the admin-*.js modules).
 */
import { generalProfile } from "./profile.js";
import { gradesAdmin } from "./grades.js";
import { pages } from "./admin-shared.js";
import "./admin-calendar.js";
import "./admin-people.js";
import "./admin-curriculum.js";
import "./admin-loads.js";
import "./admin-settings.js";

export { pages };

export const nav = () => [
    {
        k: "home", l: "Dashboard", i: "home"
    },
    {
        k: "approvals", l: "Approvals", i: "check"
    },
    {
        k: "grades", l: "Grades", i: "chart"
    },
    {
        k: "accounts", l: "Accounts", i: "users"
    },
    {
        k: "curriculum", l: "Curriculum", i: "book"
    },
    {
        k: "loads", l: "Sections & Loads", i: "grid"
    },
    {
        k: "announcements", l: "News", i: "bell"
    },
    {
        k: "settings", l: "Settings", i: "settings"
    },
    {
        k: "logs", l: "Logs & Storage", i: "shield"
    }
];
pages.grades = gradesAdmin;pages.profile = generalProfile;