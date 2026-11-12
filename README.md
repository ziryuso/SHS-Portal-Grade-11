# Section Portal

A free class website for one section. Students create an account with Google, read the posted modules, answer tests, and see their score. The teacher posts modules, tests and announcements, and sees every student who signed up.

GitHub Pages only hosts static files, so this app uses **Firebase** (free Spark plan) for Google sign-in and the database.

## What it does

**Students**
- Click **Sign in / Create account with Google**. On the first sign-in they type their full name once, and their account is created.
- See announcements, to-do tests, completed tests with scores, and all modules.
- A test linked to a module stays **locked** until the student opens the module and presses **I finished reading** (available after 30 seconds). The questions are also locked in the database, not only hidden on screen.
- After submitting, the score shows right away. Each test can be answered once.

**Teacher** (the Gmail in `TEACHER_EMAILS`)
- **Students**: everyone who created an account, with modules read and tests done.
- **Modules**: add links or files; see how many students read each one.
- **Tests**: upload a ready-made file or type questions, choose the module students must read first, save, then **Post to students**.
- **Announcements**: post or delete messages shown at the top of every student dashboard.

## Files
- `index.html` – the whole app
- `config.js` – your Firebase keys, teacher email, section name
- `firestore.rules` – database security rules (**must be republished**, see Step 2)
- `las/` – (optional) a folder for your LAS PDFs

## Setup (about 15 minutes)

### Step 1. Create the Firebase project
1. Go to https://console.firebase.google.com and click **Add project**.
2. Open **Build > Authentication > Get started > Sign-in method**, enable **Google**, and save.
3. Open **Build > Firestore Database > Create database**. Choose production mode and the nearest region.

### Step 2. Connect the app
1. Project settings (gear icon) > **Your apps** > click the web icon `</>` > register the app.
2. Copy the `firebaseConfig` values into `config.js`.
3. In `config.js`, set `TEACHER_EMAILS` to your Gmail and `SECTION` to your section name.
4. Open `firestore.rules`, make sure the Gmail in `isTeacher()` matches, then paste the whole file into **Firestore > Rules** and click **Publish**. Do this again whenever you replace the file.

### Step 3. Upload to GitHub
1. Create a repository (for example `grade11-portal`).
2. Upload `index.html`, `config.js`, and your `las/` folder (**Add file > Upload files**).
3. **Settings > Pages > Deploy from a branch > main / (root)**. Save.
4. Your site will be at `https://YOUR-USERNAME.github.io/grade11-portal/`.

### Step 4. Allow the website to sign in
In Firebase: **Authentication > Settings > Authorized domains > Add domain** and add `YOUR-USERNAME.github.io`.

## Adding modules / LAS
Teacher dashboard > **Modules** > add a title, topic, and a link. Use either:
- a Google Drive/PDF link (set Drive sharing to "Anyone with the link"), or
- a path to a file in your repo, such as `las/lesson1.pdf`.

## Locking a test behind a module
On **Tests > Create a test**, pick the module under **Students must read this module before the test unlocks**. Choose "No module required" for a test that is always open. One test can require one module.

## Creating a test from a file
Upload a `.docx` or `.txt` using this format. Questions go into the editor so you can check them before saving.

```
1. What is the mean of 2, 4, 6?
A. 3
B. 4
C. 5
D. 6
Answer: B

2. The normal curve is symmetric.
A. True
B. False
Answer: A

3. What is the center of a standard normal distribution?
Answer: 0 | zero
```
- Questions with A–D choices become **multiple choice**.
- Two choices "True" and "False" become **True/False**.
- No choices means **short answer**. Capital letters are ignored, and you can list several accepted answers separated by `|`.

**A test can use at most two of these types** (for example, multiple choice + short answer). The editor shows which types are in use and will not save a test with three.

Then click **Save test**, and **Post to students** when ready. It starts as a draft.

## Important limitations
- **Not AI-generated.** "Upload a ready-made test" reads questions you have written in the format above.
- **"Read" means opened and confirmed.** The app cannot see inside a PDF or Drive link, so it records that the student opened it, waited 30 seconds, and pressed the button. Change `MIN_READ_SECONDS` in `index.html` to adjust the wait.
- **Grading happens in the browser.** Questions are locked until the module is read, but once unlocked, a technically skilled student could read answers in the browser tools. Fine for class activities, not for high-stakes exams.
- Each student can submit a test once. To allow a retake, delete that student's document in Firestore **scores** (named `testId_studentUid`).
- Tests saved with the older version of this app still open, but they are not locked behind a module. Re-create them to use the lock.
- Firestore's free plan is more than enough for one section.
