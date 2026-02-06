import {
  createMultiSelectAutocompleteInput,
  createStrictAutocompleteInput,
  displayError,
  initializeAutocomplete,
  initializeMultiSelectAutocomplete,
} from "../korakProzor.js";
import { spremiJSON } from "../spremiJSON.js";

// Helper to fetch full data (not just suggestions)
async function fetchJsonData(fileName) {
  try {
    const response = await fetch(`${fileName}.json`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error(`Greška pri dohvatu podataka iz ${fileName}:`, error);
    return [];
  }
}

// Global variables to store full data once fetched to avoid multiple fetches
let allSubjects = [];
let allProfessors = [];
let allPrograms = [];
let allRazredi = [];

let tempAssignments = []; // Store temporarily added assignments
let tempAssignmentIdCounter = 1; // Counter for temporary IDs

// State for the current assignment being built
let selectedClassesForAssignment = [];
window.renderRazredTags = undefined; // Initialize globally to undefined

export async function prikaziKurikulum() {
  const modalContent = document.querySelector(".korak-prozor .modal-content");
  const newItemsDisplay = document.querySelector(
    ".korak-prozor .new-items-display",
  );

  selectedClassesForAssignment = [];

  allSubjects = await fetchJsonData("predmeti");
  allProfessors = await fetchJsonData("profesori");
  allPrograms = await fetchJsonData("program");
  allRazredi = await fetchJsonData("razredi");

  const razredAutocompleteHTML = createMultiSelectAutocompleteInput(
    "Odaberi Razrede",
    "npr. 1.a, 1.b...",
  );

  modalContent.innerHTML = `
    <div class="kurikulum-container">
        <div class="kurikulum-left">
            <div id="razred-selector-wrapper">${razredAutocompleteHTML}</div>
            <div id="assignment-type-wrapper" class="input-field" style="display: none;">
                <span class="field-label">Tip Zadatka</span>
                <div class="radio-group">
                    <label><input type="radio" name="assignmentType" value="simple" checked> Jednostavan Zadatak</label>
                    <label><input type="radio" name="assignmentType" value="parallel"> Paralelne Grupe</label>
                </div>
            </div>
        </div>
        <div id="kurikulum-right-panel" class="kurikulum-right" style="display: none;">
            <div id="simple-assignment-ui"></div>
            <div id="parallel-assignment-ui" style="display: none;"></div>
        </div>
    </div>
  `;

  const razredInput = modalContent.querySelector(
    "#razred-selector-wrapper input",
  );
  const razredTagsContainer = modalContent.querySelector(
    "#razred-selector-wrapper .selected-tags-container",
  );
  const razrediPrijedlozi = allRazredi.map((r) => r.oznaka);

  window.renderRazredTags = initializeMultiSelectAutocomplete(
    razredInput,
    razrediPrijedlozi,
    razredTagsContainer,
    (selectedItem) => {
      if (!selectedClassesForAssignment.includes(selectedItem)) {
        selectedClassesForAssignment.push(selectedItem);
        window.renderRazredTags(selectedClassesForAssignment);
        updateAssignmentUI(modalContent);
      }
    },
    (removedItem) => {
      selectedClassesForAssignment = selectedClassesForAssignment.filter(
        (item) => item !== removedItem,
      );
      window.renderRazredTags(selectedClassesForAssignment);
      updateAssignmentUI(modalContent);
    },
  ).renderSelectedTags;

  modalContent
    .querySelectorAll('input[name="assignmentType"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => updateAssignmentUI(modalContent));
    });

  renderTempAssignments(newItemsDisplay);
}

function updateAssignmentUI(modalContent) {
  const typeWrapper = modalContent.querySelector("#assignment-type-wrapper");
  const rightPanel = modalContent.querySelector("#kurikulum-right-panel");
  const simpleUIArea = modalContent.querySelector("#simple-assignment-ui");
  const parallelUIArea = modalContent.querySelector("#parallel-assignment-ui");
  const simpleRadio = modalContent.querySelector('input[value="simple"]');

  const numSelected = selectedClassesForAssignment.length;

  if (numSelected === 0) {
    typeWrapper.style.display = "none";
    rightPanel.style.display = "none";
    return;
  }

  rightPanel.style.display = "block";

  if (numSelected === 1) {
    typeWrapper.style.display = "block";
  } else {
    // numSelected > 1 (udruživanje)
    typeWrapper.style.display = "none";
    simpleRadio.checked = true;
  }

  const selectedType = modalContent.querySelector(
    'input[name="assignmentType"]:checked',
  ).value;

  if (selectedType === "simple") {
    simpleUIArea.style.display = "block";
    parallelUIArea.style.display = "none";
    // Pass mode to renderer
    const mode = numSelected > 1 ? "multi-class" : "single-class";
    renderSimpleAssignmentUI(simpleUIArea, mode);
  } else {
    // parallel
    simpleUIArea.style.display = "none";
    parallelUIArea.style.display = "block";
    if (!parallelUIArea.hasChildNodes()) {
      renderParallelAssignmentUI(parallelUIArea);
    }
  }
}

function renderSimpleAssignmentUI(container, mode) {
  container.innerHTML = ""; // Clear previous content

  if (mode === "single-class") {
    // --- UI for assigning a whole PROGRAM to a SINGLE CLASS ---
    const programAutocompleteHTML = createStrictAutocompleteInput(
      "Odaberi Program",
      "npr. Opća gimnazija",
    );
    container.innerHTML = `
      <div id="program-selector-wrapper">${programAutocompleteHTML}</div>
      <h4>Predmeti programa:</h4>
      <div id="program-subjects-container"></div>
    `;

    const programInput = container.querySelector(
      "#program-selector-wrapper input",
    );
    const programiPrijedlozi = allPrograms.map((p) => p.naziv);
    initializeAutocomplete(programInput, programiPrijedlozi, true);

    const programSubjectsContainer = container.querySelector(
      "#program-subjects-container",
    );
    programInput.addEventListener("blur", () => {
      const selectedProgramName = programInput.value.trim();
      const selectedProgram = allPrograms.find(
        (p) => p.naziv.toLowerCase() === selectedProgramName.toLowerCase(),
      );
      if (selectedProgram) {
        renderProgramSubjects(selectedProgram, programSubjectsContainer);
      } else {
        programSubjectsContainer.innerHTML = "";
      }
    });
  } else {
    // mode === 'multi-class'
    // --- UI for assigning a SINGLE SUBJECT to MULTIPLE CLASSES ---
    const subjectAutocompleteHTML = createStrictAutocompleteInput(
      "Odaberi Predmet",
      "npr. Informatika",
    );
    container.innerHTML = `
      <div id="subject-selector-wrapper">${subjectAutocompleteHTML}</div>
      <div id="single-professor-container"></div>
    `;

    const subjectInput = container.querySelector(
      "#subject-selector-wrapper input",
    );
    const subjectSuggestions = allSubjects.map((s) => s.naziv);
    initializeAutocomplete(subjectInput, subjectSuggestions, true);

    const professorContainer = container.querySelector(
      "#single-professor-container",
    );
    subjectInput.addEventListener("blur", () => {
      const selectedSubjectName = subjectInput.value.trim();
      const selectedSubject = allSubjects.find(
        (s) => s.naziv.toLowerCase() === selectedSubjectName.toLowerCase(),
      );
      if (selectedSubject) {
        const qualifiedProfessors = allProfessors.filter((prof) =>
          prof.struka_predmeti_id.includes(selectedSubject.id),
        );
        const professorSuggestions = qualifiedProfessors.map(
          (p) => `${p.ime} ${p.prezime}`,
        );
        const professorHTML = createStrictAutocompleteInput(
          `Profesor za ${selectedSubject.naziv}`,
          "Odaberite profesora",
        );

        professorContainer.innerHTML = professorHTML;
        const professorInput = professorContainer.querySelector("input");
        initializeAutocomplete(professorInput, professorSuggestions, true);
      } else {
        professorContainer.innerHTML = "";
      }
    });
  }
}

function renderParallelAssignmentUI(container) {
  container.innerHTML = `
        <p>Funkcionalnost za paralelne grupe još nije implementirana.</p>
        <button type="button" class="button" id="add-group-btn">+ Dodaj Grupu</button>
        <div id="group-cards-container"></div>
    `;
}

// Function to add a new set of curriculum assignments based on form input
export async function dodajNoviKurikulum(modalBody) {
  const modalContent = modalBody.querySelector(".modal-content");
  const newItemsDisplay = modalBody.querySelector(".new-items-display");
  const razredInput = modalContent.querySelector(
    "#razred-selector-wrapper input",
  );

  const assignmentType = modalContent.querySelector(
    'input[name="assignmentType"]:checked',
  ).value;

  if (selectedClassesForAssignment.length === 0) {
    displayError("Molimo odaberite barem jedan razred.");
    return;
  }
  const razredIds = selectedClassesForAssignment
    .map((oznaka) => {
      const r = allRazredi.find(
        (r) => r.oznaka.toLowerCase() === oznaka.toLowerCase(),
      );
      return r ? r.id : null;
    })
    .filter((id) => id !== null);
  if (razredIds.length !== selectedClassesForAssignment.length) {
    displayError("Jedan ili više odabranih razreda nije pronađen.");
    return;
  }

  const assignmentsToAdd = [];
  const mode =
    selectedClassesForAssignment.length > 1 ? "multi-class" : "single-class";

  if (assignmentType === "simple" && mode === "single-class") {
    // --- Logic for Single Class, Program-based assignment ---
    const programInput = modalContent.querySelector(
      "#program-selector-wrapper input",
    );
    const programSubjectsContainer = modalContent.querySelector(
      "#program-subjects-container",
    );
    const selectedProgramNaziv = programInput ? programInput.value.trim() : "";

    if (!selectedProgramNaziv) {
      displayError("Molimo odaberite program.");
      return;
    }
    const selectedProgram = allPrograms.find(
      (p) => p.naziv.toLowerCase() === selectedProgramNaziv.toLowerCase(),
    );
    if (!selectedProgram) {
      displayError(`Program "${selectedProgramNaziv}" nije pronađen.`);
      return;
    }

    const professorInputs = programSubjectsContainer.querySelectorAll(
      ".program-subject-entry input",
    );
    if (professorInputs.length === 0) {
      displayError("Nema predmeta za dodjelu.");
      return;
    }

    for (const input of professorInputs) {
      const selectedProfessorName = input.value.trim();
      const subjectEntryDiv = input.closest(".program-subject-entry");
      const subjectId = parseInt(subjectEntryDiv.dataset.subjectId, 10);
      const programSubject = selectedProgram.popis_predmeta.find(
        (ps) => ps.predmet_id === subjectId,
      );
      const subject = allSubjects.find((s) => s.id === subjectId);

      if (!selectedProfessorName) {
        displayError(
          `Molimo odaberite profesora za predmet "${subject.naziv}"`,
        );
        return;
      }
      const professor = allProfessors.find(
        (p) =>
          `${p.ime} ${p.prezime}`.toLowerCase() ===
          selectedProfessorName.toLowerCase(),
      );
      if (!professor) {
        displayError(`Profesor "${selectedProfessorName}" nije pronađen.`);
        return;
      }

      assignmentsToAdd.push({
        id: tempAssignmentIdCounter++,
        predmet_id: subjectId,
        profesor_id: professor.id,
        razredi_id: razredIds,
        sati_tjedno: programSubject.weekly_requirement,
        paralelna_grupa_id: null,
        program_id: selectedProgram.id,
        temp_group_key: `${razredIds.join(",")}-${selectedProgram.id}`,
      });
    }
    // Clear form
    programInput.value = "";
    programSubjectsContainer.innerHTML = "";
  } else if (assignmentType === "simple" && mode === "multi-class") {
    // --- Logic for Multi Class, Single Subject assignment ---
    const subjectInput = modalContent.querySelector(
      "#subject-selector-wrapper input",
    );
    const professorInput = modalContent.querySelector(
      "#single-professor-container input",
    );

    const selectedSubjectName = subjectInput ? subjectInput.value.trim() : "";
    const selectedProfessorName = professorInput
      ? professorInput.value.trim()
      : "";

    if (!selectedSubjectName) {
      displayError("Molimo odaberite predmet.");
      return;
    }
    if (!selectedProfessorName) {
      displayError("Molimo odaberite profesora.");
      return;
    }

    const subject = allSubjects.find(
      (s) => s.naziv.toLowerCase() === selectedSubjectName.toLowerCase(),
    );
    const professor = allProfessors.find(
      (p) =>
        `${p.ime} ${p.prezime}`.toLowerCase() ===
        selectedProfessorName.toLowerCase(),
    );

    if (!subject) {
      displayError(`Predmet "${selectedSubjectName}" nije pronađen.`);
      return;
    }
    if (!professor) {
      displayError(`Profesor "${selectedProfessorName}" nije pronađen.`);
      return;
    }

    // For multi-class, we don't have a program to get hours from, ask user? For now, default to 1
    const satiTjedno =
      parseInt(
        prompt(`Unesite broj sati tjedno za predmet "${subject.naziv}":`, "1"),
        10,
      ) || 1;

    assignmentsToAdd.push({
      id: tempAssignmentIdCounter++,
      predmet_id: subject.id,
      profesor_id: professor.id,
      razredi_id: razredIds,
      sati_tjedno: satiTjedno,
      paralelna_grupa_id: null,
      temp_group_key: `${razredIds.join(",")}-${subject.id}`,
    });
    // Clear form
    subjectInput.value = "";
    professorInput.value = "";
    modalContent.querySelector("#single-professor-container").innerHTML = "";
  } else {
    displayError("Paralelne grupe još nisu podržane za dodavanje.");
    return;
  }

  tempAssignments.push(...assignmentsToAdd);

  // Clear common parts and re-render
  selectedClassesForAssignment = [];
  if (window.renderRazredTags) {
    window.renderRazredTags(selectedClassesForAssignment);
  }
  razredInput.value = "";
  updateAssignmentUI(modalContent); // Hide the right panel again

  renderTempAssignments(newItemsDisplay);
  displayError("");
}

async function renderProgramSubjects(selectedProgram, container) {
  container.innerHTML = ""; // Clear previous subjects

  const subjectProfessorInputs = []; // To store inputs for later initialization

  for (const programSubject of selectedProgram.popis_predmeta) {
    const subject = allSubjects.find((s) => s.id === programSubject.predmet_id);
    if (!subject) continue; // Skip if subject not found (data inconsistency)

    const qualifiedProfessors = allProfessors.filter(
      (prof) =>
        prof.struka_predmeti_id && prof.struka_predmeti_id.includes(subject.id),
    );
    const professorSuggestions = qualifiedProfessors.map(
      (prof) => `${prof.ime} ${prof.prezime}`,
    );

    const professorInputHTML = createStrictAutocompleteInput(
      `Profesor za ${subject.naziv} (${programSubject.weekly_requirement}h)`,
      "Odaberite profesora",
    );

    const subjectEntryDiv = document.createElement("div");
    subjectEntryDiv.classList.add("program-subject-entry"); // For styling
    subjectEntryDiv.dataset.subjectId = subject.id; // Store subject ID for later use
    subjectEntryDiv.innerHTML = professorInputHTML;
    container.appendChild(subjectEntryDiv);

    const professorInput = subjectEntryDiv.querySelector("input");
    subjectProfessorInputs.push({
      input: professorInput,
      suggestions: professorSuggestions,
    });
  }

  subjectProfessorInputs.forEach((item) => {
    initializeAutocomplete(item.input, item.suggestions, true);
  });
}

function renderTempAssignments(container) {
  container.innerHTML = ""; // Clear existing display

  if (tempAssignments.length === 0) {
    container.style.display = "block";
    return;
  }
  container.style.display = "block";

  const groupedByTempKey = {};
  for (const assignment of tempAssignments) {
    const key = assignment.temp_group_key || `ungrouped-${assignment.id}`;
    if (!groupedByTempKey[key]) {
      groupedByTempKey[key] = {
        razredi_id: assignment.razredi_id,
        program_id: assignment.program_id, // May be undefined for parallel groups
        assignments: [],
        tempIds: [],
      };
    }
    groupedByTempKey[key].assignments.push(assignment);
    groupedByTempKey[key].tempIds.push(assignment.id);
  }

  for (const key in groupedByTempKey) {
    const group = groupedByTempKey[key];
    const firstAssignment = group.assignments[0]; // Use first for common data

    const razredOznake = group.razredi_id
      .map((id) => {
        const razred = allRazredi.find((r) => r.id === id);
        return razred ? razred.oznaka : "Nepoznat";
      })
      .join(", ");

    // For simple assignments, program is consistent. For parallel, it might differ.
    const program = allPrograms.find(
      (p) => p.id === firstAssignment.program_id,
    );
    const programNaziv = program ? program.naziv : "Paralelna grupa";

    const groupDiv = document.createElement("div");
    groupDiv.classList.add("new-item-tag", "kurikulum-group-tag");
    groupDiv.innerHTML = `
        <span>${razredOznake} (${programNaziv})</span>
        <button class="delete-temp-item-btn" data-group-temp-ids="${group.tempIds.join(",")}">X</button>
        <ul>
            ${group.assignments
              .map((a) => {
                const subject = allSubjects.find((s) => s.id === a.predmet_id);
                const professor = allProfessors.find(
                  (p) => p.id === a.profesor_id,
                );
                return `<li>${subject.naziv} (${a.sati_tjedno}h) - ${professor.ime} ${professor.prezime}</li>`;
              })
              .join("")}
        </ul>
    `;
    container.appendChild(groupDiv);
  }

  container.querySelectorAll(".delete-temp-item-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const tempIdsToDelete = e.target.dataset.groupTempIds
        .split(",")
        .map(Number);
      tempAssignments = tempAssignments.filter(
        (a) => !tempIdsToDelete.includes(a.id),
      );
      renderTempAssignments(container);
    });
  });
}
export async function spremiKorakKurikulum() {
  try {
    let existingKurikulum = await fetchJsonData("kurikulum"); // Get existing data

    // Filter out any tempAssignments that might be exact duplicates of existing ones
    // A simple duplicate check for the sake of this task
    const newAssignmentsFiltered = tempAssignments.filter(
      (tempAssign) =>
        !existingKurikulum.some(
          (existingAssign) =>
            existingAssign.predmet_id === tempAssign.predmet_id &&
            existingAssign.profesor_id === tempAssign.profesor_id &&
            existingAssign.razredi_id.every(
              (id, idx) => id === tempAssign.razredi_id[idx],
            ) &&
            // Note: program_id is not part of the kurikulum.json schema, so don't compare it for existing
            // This check is to avoid adding the exact same assignment if it was already saved
            existingAssign.sati_tjedno === tempAssign.sati_tjedno &&
            (existingAssign.paralelna_grupa_id ===
              tempAssign.paralelna_grupa_id ||
              (!existingAssign.paralelna_grupa_id &&
                !tempAssign.paralelna_grupa_id)),
        ),
    );

    let combinedKurikulum = [...existingKurikulum, ...newAssignmentsFiltered];

    // Re-assign all IDs to ensure uniqueness and sequentiality
    let currentId = 1;
    combinedKurikulum = combinedKurikulum.map((assignment) => {
      const { program_id, ...rest } = assignment; // Destructure to omit program_id
      return { ...rest, id: currentId++ };
    });

    const result = await spremiJSON("kurikulum.json", combinedKurikulum);

    if (result.success) {
      tempAssignments = []; // Clear temporary state after successful save
      tempAssignmentIdCounter = 1;
      // Ideally, the UI should also be refreshed to show the newly saved items as "existing"
      // For now, this is sufficient.
      return { success: true };
    } else {
      return { success: false, message: result.message };
    }
  } catch (error) {
    console.error("Greška pri spremanju koraka Kurikulum:", error);
    return { success: false, message: error.message };
  }
}
