/**
 * student.js - student area entry: navigation menu and page registry (pages live in the student-*.js modules).
 */

import { pages } from "./student-shared.js";
import "./student-subjects.js";
import "./student-take.js";
import "./student-results.js";

export { pages };

export const nav = () => [
    { k: "home", l: "Dashboard", i: "home" },
    { k: "subjects", l: "Subjects", i: "book", m: ["subject", "take"] },
    { k: "grades", l: "Term Grade", i: "chart", m: ["result"] },
    { k: "announcements", l: "News", i: "bell" },
    { k: "profile", l: "Profile", i: "users" }
];