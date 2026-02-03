# PROJECT CONTEXT: Automatic School Timetable Generator

## 1. Project Overview

The goal is to build an automatic high-school timetable generator using a web-based interface.

- **Role:** You are an expert software architect and coding partner guiding the development.
- **Tech Stack:**
  - **Frontend:** HTML, CSS, Vanilla JavaScript (ES6+).
  - **Backend:** PHP (strictly for serving JSON files, no logic).
  - **Data:** JSON files used as a database.

## 2. Architecture & Data Structures

The system relies on 6 core JSON files.

### A. Data Models (JSON Structure)

They are empty when program is first started, whey users enters information they will be filled.

1.  **`ucionice.json`** (Classrooms):
    - `id`: unique int
    - `naziv`: name that the user gave for the classroom
    - `tip`: array of strings (e.g., `["opca", "kemija"]`) - determines capability.
    - `prioritet`: int (0 or 1) - 0 = not a priority, 1 = priority / fill first.
2.  **`predmeti.json`** (Subjects):
    - `id`: unique int
    - `naziv`: name that the user gave for the subject
    - `potreban_tip_ucionice`: string (matches values in `ucionice.json`).
3.  **`profesori.json`** (Teachers):
    - `id`: unique int
    - `ime`: name of the teacher
    - `prezime`: surname of the teacher
    - `struka_predmeti_id`: array of subject IDs they can teach.
    - `nedostupan`: object defining unavailable times (e.g., `{"1": [1, 2]}` means Monday 1st and 2nd hour unavailable).
    - `fiksna_ucionica_id`: ID or null (if teacher is bound to a specific room).
4.  **`razredi.json`** (Classes):
    - `id`: unique int
    - `godina`: year of the class
    - `odjeljenje`: what class they are inside the year (one year, multiple classes)
    - `oznaka`: "full name" of a class. Format: {`godina`}.{`odjeljenje`}
5.  **`program.json`** (weekly workload of a school program):
    - `id`: unique int
    - `naziv`: name of the program
    - `predmet_id`: key should be a ID of a SUBJECT and the value should a number that represents the amount of times that subject need to be scheduled weekly
6.  **`kurikulum.json`** (Assignments/Workload) - _The Key Input_ NOT COMPLETELY DEFINED YET:
    - `razredi_id`: array of class IDs (handles merged classes).
    - `profesor_id`: int.
    - `predmet_id`: int.
    - `sati_tjedno`: int.
    - `paralelna_grupa_id`: string or null. (CRITICAL: If two assignments share this ID, they MUST be scheduled at the same time).

## 3. Algorithm Requirements (Backtracking)

The generator must solve the **Timetabling Problem (NP-Hard)** using a backtracking approach or heuristic search inside the browser (JS).

### Hard Constraints (Must solve):

1.  **No Conflicts:** A class, professor, or room cannot be in two places at once.
2.  **Room Suitability:** Subject requiring "kemija" must be in a room with type "kemija".
3.  **Availability:** Teachers cannot teach during their restricted hours defined in JSON.
4.  **Parallel Groups:** Assignments sharing `paralelna_grupa_id` (e.g., Ethics/Religion) MUST happen simultaneously.
5.  **Merged Classes:** Assignments with multiple `razredi_id` (e.g., German for 1.a + 1.b) occupy all those classes simultaneously.

### Soft Constraints (Optimize for):

1.  **No Gaps:** Classes should have continuous schedules (no free hours between lessons).
2.  **Block Hours:** If a subject has more than 2 hours weekly, it should have block hours. However, at 4 hours weeky it should have 1 block hour and 2 "normal" hours.
3.  **Distribution:** Lessons should be spread evenly across the week.
4.  **Room Stability:** Prefer keeping the same room for the same subject if possible.

## 4. Scope & Limitations

- Student count and room capacity are explicitly **excluded** to simplify logic (assumed valid by user).
- No database (MySQL), strictly JSON manipulation.
- Logic runs client-side (JS).

## 5. Development Guidelines

- If I changed the code you written, don't reverse it. Keep it the way it is.
- Write modular, clean ES6+ JavaScript.
- when adding JavaScript tag put it in head tag and use defer keyword.
- Don't comment every line of code, comment only something that is hard to understand like an algorithm or something that has a specific implementation. Don't commend something obvious, especially when the function name is self-explanitory.
- Use English language when writing code, classes, etc. However use Croatian when writing to JSON and writing comments.
- Always use classes css/template.css when generating new HTML, for example if you generate a button, you have to use the .button
- Make sure that the elements are always responsive, use methods like clamp() function in CSS
