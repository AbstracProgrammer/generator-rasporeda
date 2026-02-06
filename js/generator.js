export class GeneratorRasporeda {
  /**
   * @param {object} skola - An object containing all the necessary school data.
   * @param {Array} skola.profesori
   * @param {Array} skola.ucionice
   * @param {Array} skola.razredi
   * @param {Array} skola.kurikulum
   * @param {Array} skola.predmeti
   */
  constructor(skola) {
    this.profesori = new Map(skola.profesori.map((p) => [p.id, p]));
    this.ucionice = skola.ucionice;
    this.razredi = new Map(skola.razredi.map((r) => [r.id, r]));
    this.kurikulum = skola.kurikulum;
    this.predmeti = new Map(skola.predmeti.map((p) => [p.id, p]));

    // Configuration
    this.DANA_U_TJEDNU = 5; // Ponedjeljak - Petak
    this.SATI_DNEVNO = 8; // 8 sati dnevno

    this.tasks = [];
    this.raspored = []; // Will store the final schedule objects

    // State matrices for O(1) lookups
    this.zauzetostProfesora = {};
    this.zauzetostRazreda = {};
    this.zauzetostUcionica = {};

    this._initialize();
  }

  /**
   * Initializes the generator, atomizes tasks, and sets up state matrices.
   */
  _initialize() {
    // 1. Atomize tasks
    this.kurikulum.forEach((zaduzenje) => {
      for (let i = 0; i < zaduzenje.sati_tjedno; i++) {
        // Guard clause: Check if all IDs exist before creating a task
        const profesor = this.profesori.get(zaduzenje.profesor_id);
        const predmet = this.predmeti.get(zaduzenje.predmet_id);
        if (!profesor || !predmet) {
          console.warn(
            `Preskačem zadatak jer profesor (ID: ${zaduzenje.profesor_id}) ili predmet (ID: ${zaduzenje.predmet_id}) ne postoji.`,
          );
          continue;
        }
        zaduzenje.razredi_id.forEach((razredId) => {
          if (!this.razredi.has(razredId)) {
            console.warn(
              `Preskačem zadatak jer razred (ID: ${razredId}) ne postoji.`,
            );
            return; // Skip this specific class assignment
          }
        });

        this.tasks.push({
          zaduzenje_id: zaduzenje.id,
          profesor_id: zaduzenje.profesor_id,
          razredi_id: zaduzenje.razredi_id,
          predmet_id: zaduzenje.predmet_id,
          potreban_tip_ucionice_id: predmet.potreban_tip_ucionice_id,
          paralelna_grupa_id: zaduzenje.paralelna_grupa_id,
          // Unique ID for this specific 1-hour slot
          unique_task_id: `${zaduzenje.id}-${i}`,
        });
      }
    });

    // 2. Initialize state matrices
    // Initialize for Professors
    for (const [profesorId, profesor] of this.profesori.entries()) {
      this.zauzetostProfesora[profesorId] = Array(this.DANA_U_TJEDNU)
        .fill(null)
        .map(() => Array(this.SATI_DNEVNO).fill(false));
      // Pre-fill unavailability from profesor.nedostupan
      if (profesor.nedostupan) {
        for (const dan in profesor.nedostupan) {
          profesor.nedostupan[dan].forEach((sat) => {
            // Assuming dan is 1-based and sat is 1-based from JSON
            if (
              dan - 1 >= 0 &&
              dan - 1 < this.DANA_U_TJEDNU &&
              sat - 1 >= 0 &&
              sat - 1 < this.SATI_DNEVNO
            ) {
              this.zauzetostProfesora[profesorId][dan - 1][sat - 1] = true;
            }
          });
        }
      }
    }
    // Initialize for Classes
    for (const razredId of this.razredi.keys()) {
      this.zauzetostRazreda[razredId] = Array(this.DANA_U_TJEDNU)
        .fill(null)
        .map(() => Array(this.SATI_DNEVNO).fill(false));
    }
    // Initialize for Classrooms
    this.ucionice.forEach((ucionica) => {
      this.zauzetostUcionica[ucionica.id] = Array(this.DANA_U_TJEDNU)
        .fill(null)
        .map(() => Array(this.SATI_DNEVNO).fill(false));
    });
  }

  /**
   * Finds an available classroom for a given task at a specific time.
   * @param {object} task - The task object.
   * @param {number} dan - The day index (0-4).
   * @param {number} sat - The hour index (0-7).
   * @param {Set<number>} [excluded=[]] - A set of classroom IDs to exclude.
   * @returns {number|null} The ID of an available classroom or null.
   */
  _findAvailableClassroom(task, dan, sat, excluded = new Set()) {
    // Sort classrooms: 1. Priority, 2. Type match
    const sortedUcionice = [...this.ucionice].sort((a, b) => {
      if (a.prioritet !== b.prioritet) {
        return b.prioritet - a.prioritet; // Higher priority first
      }
      // Optional: further sorting could be added here
      return 0;
    });

    for (const ucionica of sortedUcionice) {
      if (excluded.has(ucionica.id)) continue;

      // Check 1: Is the classroom occupied at this time?
      if (this.zauzetostUcionica[ucionica.id][dan][sat]) {
        continue;
      }

      // Check 2: Does the classroom meet the type requirement?
      const needsSpecificType = task.potreban_tip_ucionice_id !== null;
      if (needsSpecificType) {
        if (ucionica.tipovi_id.includes(task.potreban_tip_ucionice_id)) {
          return ucionica.id; // Found a suitable, available, specific-type classroom
        }
      } else {
        return ucionica.id; // Found a suitable, available, general-purpose classroom
      }
    }
    return null; // No classroom found
  }

  /**
   * The core recursive backtracking function.
   * @param {number} taskIndex - The index of the task to place from this.tasks.
   * @returns {boolean} - True if a solution is found, otherwise false.
   */
  solve(taskIndex = 0) {
    // === BASE CASE ===
    if (taskIndex >= this.tasks.length) {
      return true; // All tasks have been placed successfully.
    }

    const task = this.tasks[taskIndex];

    // === RECURSIVE STEP ===
    // Iterate through all possible time slots (days and hours)
    for (let dan = 0; dan < this.DANA_U_TJEDNU; dan++) {
      for (let sat = 0; sat < this.SATI_DNEVNO; sat++) {
        // --- 1. CHECK CONSTRAINTS ---

        // Is the professor available?
        if (this.zauzetostProfesora[task.profesor_id][dan][sat]) {
          continue;
        }

        // Are all classes in this task available?
        const allClassesAvailable = task.razredi_id.every(
          (razredId) => !this.zauzetostRazreda[razredId][dan][sat],
        );
        if (!allClassesAvailable) {
          continue;
        }

        // Find a suitable classroom
        const ucionicaId = this._findAvailableClassroom(task, dan, sat);
        if (ucionicaId === null) {
          continue;
        }

        // --- 2. PLACE TASK & UPDATE STATE ---
        this.zauzetostProfesora[task.profesor_id][dan][sat] = true;
        task.razredi_id.forEach((razredId) => {
          this.zauzetostRazreda[razredId][dan][sat] = true;
        });
        this.zauzetostUcionica[ucionicaId][dan][sat] = true;

        this.raspored[taskIndex] = {
          task: task,
          dan: dan,
          sat: sat,
          ucionica_id: ucionicaId,
        };

        // --- 3. RECURSE ---
        if (this.solve(taskIndex + 1)) {
          return true; // If the rest of the tasks can be placed, we've found a solution.
        }

        // --- 4. BACKTRACK ---
        // If the recursive call failed, undo the placement and try the next slot.
        this.zauzetostProfesora[task.profesor_id][dan][sat] = false;
        task.razredi_id.forEach((razredId) => {
          this.zauzetostRazreda[razredId][dan][sat] = false;
        });
        this.zauzetostUcionica[ucionicaId][dan][sat] = false;
        this.raspored[taskIndex] = null; // Clear the assignment
      }
    }

    // If we've looped through all days and hours and couldn't place the task, fail.
    return false;
  }

  /**
   * Handles the special case of parallel group tasks.
   * This is a more complex version of solve that needs to be integrated.
   * For now, it's a separate concept. A full implementation would merge this
   * logic into the main `solve` function.
   */
  _solveParallel(taskIndex, parallelTasks) {
    // Logic for parallel groups
    // 1. Find all professors, classes for the group.
    // 2. Find a time slot where ALL are free.
    // 3. Find a set of unique, available, suitable classrooms.
    // 4. Place ALL, recurse, backtrack ALL.
    // This is a placeholder for the more complex logic.
    console.log(
      "Solving for parallel group is not yet fully implemented in the main flow.",
      parallelTasks,
    );
    return this.solve(taskIndex + parallelTasks.length); // Naive skip for now
  }

  /**
   * Converts the internal schedule representation into a user-friendly format.
   * @returns {Array<object>} - The final timetable.
   */
  getRaspored() {
    if (
      this.raspored.length !== this.tasks.length ||
      this.raspored.some((r) => r === null)
    ) {
      return []; // Return empty if solution not found or incomplete
    }

    return this.raspored.map((entry) => {
      const { task, dan, sat, ucionica_id } = entry;
      const profesor = this.profesori.get(task.profesor_id);
      const predmet = this.predmeti.get(task.predmet_id);
      const ucionica = this.ucionice.find((u) => u.id === ucionica_id);

      // Map razred IDs to their 'oznaka'
      const razrediOznake = task.razredi_id
        .map((id) => this.razredi.get(id)?.oznaka || `Nepoznat ID: ${id}`)
        .join(", ");

      return {
        zaduzenje_id: task.zaduzenje_id,
        predmet: predmet ? predmet.naziv : "Nepoznat",
        profesor: profesor ? `${profesor.ime} ${profesor.prezime}` : "Nepoznat",
        razred: razrediOznake,
        ucionica: ucionica ? ucionica.naziv : "Nepoznata",
        dan: dan + 1, // Convert 0-indexed to 1-indexed for user
        sat: sat + 1, // Convert 0-indexed to 1-indexed for user
      };
    });
  }
}
