# Lab 2: GitHub Team Setup & Workflow Tutorials

This document contains step-by-step instructions for the live exercises covered in the Lab 2 seminar. Follow these sections sequentially to set up your environment, initialize your team repository, and practice professional Git workflows.

## Part 1: Individual Setup & Configuration

Before working with the team, you must configure your local environment.

### 1. Verify Installation
Open your terminal and check if Git is installed.
* **Command:** `git --version`
* If installed, you will see a version number (e.g., `git version 2.34.1`).
* If not, install it based on your OS.

### 2. Configure Identity
Tell Git who you are. This ensures your name appears correctly on team commits.
1.  **Set Name:** `git config --global user.name "Your Name"`
2.  **Set Email:** `git config --global user.email "your@email.com"`
    * *Important:* Use the exact email address you used to sign up for GitHub.
3.  **Verify:** `git config --list`. You should see your user and email at the top.

### 3. Authentication (PAT)
GitHub does not accept your login password in the terminal; you need a Personal Access Token (PAT).
1.  Go to **GitHub.com** -> **Settings** (top right profile icon).
2.  Select **Developer Settings** (bottom left sidebar).
3.  Select **Personal Access Tokens** -> **Tokens (classic)**.
4.  **Expiration:** Set to "Custom" (end of semester).
5.  **Permissions:** Check the `repo` box (required to push/pull code).
6.  Click **Generate new token (classic)**.
7.  **Copy the Token:** Copy it immediately. You will not see it again.

> **Note:** If you prefer SSH keys or PAT fails, refer to the slides or GitHub documentation for **Method 2: SSH Setup**.

---

## Part 2: Team Repository Setup

**STOP:** Ensure your entire group is ready before proceeding.

### Step 1: Naming
* Decide on a unique, professional team name.
* Include your group number (e.g., `TeamName-G1`) to avoid conflicts.

### Step 2: Creation (Lead Member ONLY)
**Only one person** creates the team. Everyone else joins it later.
1.  **Lead Member:** Click the GitHub Classroom assignment link provided in the lab.
2.  Identify yourself in the roster list.
3.  When prompted to "Create a new team," enter the **Team Name** decided in Step 1.
4.  Click **Create team** and accept the assignment.

### Step 3: Joining (All Other Members)
1.  Click the **same assignment link** used by the Lead Member.
2.  Identify yourself in the roster list.
3.  **Do not create a team.** Look for the existing team name created by the Lead Member.
4.  Click **Join** next to your team name.

---

## Part 3: Individual Workflow Basics

Now that the repo exists, practice the basic "Save Cycle" individually.

### 1. Clone the Repository
1.  On the GitHub repo page, click the green **<> Code** button and copy the URL (HTTPS).
2.  In your terminal, navigate to where you want the project folder.
3.  **Command:** `git clone <URL>`
    * Enter your GitHub username and your **PAT** (Token) as the password.
4.  **Enter the folder:** `cd <folder-name>`

### 2. The Save Cycle (Add, Commit, Push)
1.  **Create a file:** `touch <YourLastName>.txt`
2.  **Edit:** Open this new file in your text editor (VS Code, Notepad, etc.) and add your name/major.
3.  **Check Status:** `git status` (The file should be red/untracked).
4.  **Stage:** `git add <YourLastName>.txt`
    * Check status again (`git status`); it should be green.
5.  **Commit:** `git commit -m "Added student <YourName> info file"`
6.  **Push:** `git push`

---

## Part 4: Setup "Develop" Branch

**Lead Member Only:**
Before the team can practice branching, the shared "Develop" branch must exist.
1.  Ensure you are on main: `git checkout main`
2.  Create the branch: `git checkout -b develop`
3.  Push it to GitHub: `git push -u origin develop`

**Everyone Else:**
1.  Update your local repo: `git pull`
2.  Switch to the new branch: `git checkout develop`

---

## Part 5: Branching & Merging (Local Practice)

We will now practice working in "parallel universes" (branches) locally.

### 1. Create and Switch Branches
1.  **Create Branch:** `git checkout -b <YourLastName>-feature`
2.  **Verify:** Type `git branch` and look for the asterisk (*) next to your new branch.

### 2. Make Changes on Branch
1.  Create a new file: `touch <YourLastName>feature.txt`
2.  Add text to the file, then stage and commit:
    * `git add <YourLastName>feature.txt`
    * `git commit -m "Working on a secret feature"`

### 3. The "Magic" Switch
1.  Switch back to develop: `git checkout develop`
    * *Notice:* Your new file has disappeared.
2.  Switch back to your feature: `git checkout <YourLastName>-feature`
    * *Notice:* The file is back.

### 4. Merging
1.  Switch to the destination branch: `git checkout develop`
2.  Merge your work: `git merge <YourLastName>-feature`

---

## Part 6: Managing Merge Conflicts

We will intentionally break the code to learn how to fix it.

### 1. Create the Conflict
1.  Ensure you are on `develop`. Change **Line 1** of `<YourLastName>.txt` to: `"Develop Branch version"`.
2.  Commit: `git add .` then `git commit -m "Update develop"`
3.  Create a new branch: `git checkout -b <YourLastName>-conflict-branch`
4.  In the same file, change **Line 1** to: `"Conflict Branch version"`.
5.  Commit: `git add .` then `git commit -m "Update conflict branch"`

### 2. The Collision
1.  Switch back: `git checkout develop`
2.  Attempt merge: `git merge <YourLastName>-conflict-branch`
    * **Result:** You will see `CONFLICT (content): Merge conflict...`.

### 3. The Resolution
1.  Open the file in your editor. You will see markers like `<<<<<<<`, `=======`, and `>>>>>>>`.
2.  **Edit:** Delete the markers and rewrite Line 1 to the final desired text (e.g., "The combined final version").
3.  **Finalize:**
    * `git add <YourLastName>.txt`
    * `git commit -m "Fixed conflict"`

---

## Part 7: Professional Workflow (Issues & Code Review)

### 1. Setup Issues (Lead Member Only)
1.  Go to repo **Settings** -> **General**.
2.  Under **Features**, check **Issues**.
3.  Click **Set up templates** -> Add **Bug Report** and **Feature Request**.
4.  **Propose changes** (commit to develop).

### 2. Issue-First Development
1.  **Create Issue:** Go to the **Issues** tab -> **New Issue**.
    * Title: "Add greeting message to <YourName>.txt"
    * Assign: Click **Assign Yourself**
    * Submit.
2.  **Note the ID:** Look at the issue title (e.g., `#1`).
3.  **Create Linked Branch:**
    * `git checkout -b <IssueID>-<YourName>-greeting` (e.g., `1-Ricardo-greeting`)
4.  **Solve & Commit:**
    * Add a greeting to your text file.
    * Commit with reference: `git commit -m "Added personal greeting. #<IssueID>"`
5.  **Push:**
    * `git push -u origin <branchname>` (The `-u` connects your local branch to the cloud).

### 3. Pull Requests (PR) & Review
Work with a partner (Student A and Student B).

1.  **Student A (Open PR):**
    * On GitHub, click **Compare & Pull Request**.
    * Assign Student B as the **Reviewer** (right sidebar).
2.  **Student B (Review):**
    * Go to the PR. Click **Files Changed** tab.
    * Hover over a line, click **[+]**, and leave a comment requesting a change (e.g., "Fix typo").
    * Click **Review changes** -> **Request changes**.
3.  **Student A (Fix):**
    * Make changes locally, commit, and push again (`git push`).
4.  **Student B (Merge):**
    * Check PR again. Click **Approve** and **Merge pull request**.

---

## Part 8: Final Team Exercise

Practice the full role-based flow.

* **Student A (Release Manager):** Protects `main`. Merges stable code from `develop`.
* **Student B & C (Developers):** Work on feature branches off `develop`.

**The Flow:**
1.  **Sync:** Student B & C run `git pull`.
2.  **Branch:** `git checkout -b feature-<Initials>` (ensure you branch off `develop`!).
3.  **The Race:** Both B & C edit the same file and push.
4.  **Integration:** Both open Pull Requests to `develop`.
    * *Note:* The second person to merge may encounter a conflict-practice solving it!
5.  **Release:** Once `develop` is stable, Student A merges `develop` into `main`.
