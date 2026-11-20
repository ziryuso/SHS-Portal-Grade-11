/**
 * teacher.js - teacher area entry: navigation menu and page registry (pages live in the teacher-*.js modules).
 */
import { generalProfile } from "./profile.js";
import { gradesTeacher, gradeSheet } from "./grades.js";
import { S } from "./core.js";
import { pages } from "./teacher-shared.js";
import "./teacher-dashboard.js";
import "./teacher-class.js";
import "./teacher-editor.js";
import "./teacher-grading.js";
import "./teacher-theme.js";

export { pages };

export const nav = () => {
    // Scope the teacher theme: only when the signed-in user is not a student.
    document.body.classList.toggle("is-teacher", !document.body.classList.contains("is-student"));
    return buildNav();
};
const buildNav = () => [
    { k: "home", l: "Dashboard", i: "home" },
    { k: "classes", l: "My Classes", i: "book", m: ["load", "editor", "grade"] },
    { k: "grades", l: "Term Grades", i: "chart", m: ["gradesheet"] },
    ...(S.advSecs.length ? [{ k: "advisory", l: "Advisory", i: "users" }] : []),
    { k: "announcements", l: "News", i: "bell" }
];
pages.profile = generalProfile;
pages.grades = gradesTeacher;
pages.gradesheet = gradeSheet;
