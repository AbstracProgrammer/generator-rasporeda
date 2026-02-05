import {
  createStrictAutocompleteInput,
  displayError,
  initializeAutocomplete,
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
let allRazredi = []; // New: store all razredi

let tempAssignments = []; // Store temporarily added assignments
let tempAssignmentIdCounter = 1; // Counter for temporary IDs

export async function prikaziKurikulum() {
  const modalContent = document.querySelector(".korak-prozor .modal-content");
  const newItemsDisplay = document.querySelector(
    ".korak-prozor .new-items-display",
  ); // Get newItemsDisplay

  // Fetch all necessary base data only once when modal is opened
  allSubjects = await fetchJsonData("predmeti");
  allProfessors = await fetchJsonData("profesori");
  allPrograms = await fetchJsonData("program");
  allRazredi = await fetchJsonData("razredi"); // Fetch all razredi

  const razredAutocompleteHTML = createStrictAutocompleteInput(
    "Odaberi Razred",
    "npr. 1.a",
  );
  const programAutocompleteHTML = createStrictAutocompleteInput(
    "Odaberi Program",
    "npr. Opća gimnazija",
  );

  modalContent.innerHTML = `
        <div class="kurikulum-container">
            <div class="kurikulum-left">
                <div id="razred-selector-wrapper">
                    ${razredAutocompleteHTML}
                </div>
                <div id="program-selector-wrapper">
                    ${programAutocompleteHTML}
                </div>
            </div>
            <div class="kurikulum-right">
                <!-- Subjects and professor assignments will be rendered here -->
                <h4>Predmeti programa:</h4>
                <div id="program-subjects-container">
                    <!-- Dynamic subject/professor inputs -->
                </div>
            </div>
        </div>
    `;

  const razredInput = modalContent.querySelector(
    "#razred-selector-wrapper input",
  );
  // razrediPrijedlozi now derived from allRazredi
  const razrediPrijedlozi = allRazredi.map((razred) => razred.oznaka);
  initializeAutocomplete(razredInput, razrediPrijedlozi, true);

  const programInput = modalContent.querySelector(
    "#program-selector-wrapper input",
  );
  const programiPrijedlozi = allPrograms.map((p) => p.naziv); // Use already fetched programs
  initializeAutocomplete(programInput, programiPrijedlozi, true);

  const programSubjectsContainer = modalContent.querySelector(
    "#program-subjects-container",
  );

  // Event listener for program selection
  programInput.addEventListener("blur", () => {
    const selectedProgramName = programInput.value.trim();
    if (selectedProgramName === "") {
      programSubjectsContainer.innerHTML = ""; // Clear if nothing selected
      return;
    }

    const selectedProgram = allPrograms.find(
      (p) => p.naziv.toLowerCase() === selectedProgramName.toLowerCase(),
    );

    if (!selectedProgram) {
      // This should ideally not happen due to strictMode, but as a safeguard
      programSubjectsContainer.innerHTML = "";
      displayError("Odabrani program ne postoji.");
      return;
    }

    renderProgramSubjects(selectedProgram, programSubjectsContainer);
  });

  // Render temporary assignments initially (e.g., when modal re-opens)
  renderTempAssignments(newItemsDisplay);
}

// Function to add a new set of curriculum assignments based on form input
export async function dodajNoviKurikulum(modalBody) {
  const modalContent = modalBody.querySelector(".modal-content");
  const newItemsDisplay = modalBody.querySelector(".new-items-display");

  const razredInput = modalContent.querySelector(
    "#razred-selector-wrapper input",
  );
  const programInput = modalContent.querySelector(
    "#program-selector-wrapper input",
  );
  const programSubjectsContainer = modalContent.querySelector(
    "#program-subjects-container",
  );

  const selectedRazredOznaka = razredInput.value.trim();
  const selectedProgramNaziv = programInput.value.trim();

  // 1. Validation
  if (!selectedRazredOznaka) {
    displayError("Molimo odaberite razred.");
    return;
  }
  if (!selectedProgramNaziv) {
    displayError("Molimo odaberite program.");
    return;
  }

  const razred = allRazredi.find(
    (r) => r.oznaka.toLowerCase() === selectedRazredOznaka.toLowerCase(),
  );
  if (!razred) {
    displayError(`Razred "${selectedRazredOznaka}" nije pronađen.`);
    return;
  }

  const selectedProgram = allPrograms.find(
    (p) => p.naziv.toLowerCase() === selectedProgramNaziv.toLowerCase(),
  );
  if (!selectedProgram) {
    displayError(`Program "${selectedProgramNaziv}" nije pronađen.`);
    return;
  }

  const assignmentsToAdd = [];
  const professorInputs = programSubjectsContainer.querySelectorAll(
    ".program-subject-entry input",
  );

  if (professorInputs.length === 0) {
    displayError("Nema predmeta za dodjelu profesora u odabranom programu.");
    return;
  }

  for (const input of professorInputs) {
    const selectedProfessorName = input.value.trim();
    const subjectEntryDiv = input.closest(".program-subject-entry");
    const subjectId = parseInt(subjectEntryDiv.dataset.subjectId, 10);
    const subject = allSubjects.find((s) => s.id === subjectId);

    if (!selectedProfessorName) {
      displayError(
        `Molimo odaberite profesora za predmet "${subject ? subject.naziv : "nepoznat"}"`,
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

    const programSubject = selectedProgram.popis_predmeta.find(
      (ps) => ps.predmet_id === subjectId,
    );
    if (!programSubject) {
      console.error(`Program subject not found for subject ID: ${subjectId}`);
      continue; // Should not happen if data is consistent
    }

    const newAssignment = {
      id: tempAssignmentIdCounter++, // Assign a temporary ID
      predmet_id: subjectId,
      profesor_id: professor.id,
      razredi_id: [razred.id], // Single class for now
      sati_tjedno: programSubject.weekly_requirement,
      paralelna_grupa_id: null, // Default for now
      program_id: selectedProgram.id, // Add program_id for easier grouping
    };
    assignmentsToAdd.push(newAssignment);
  }

  // Add to temp storage
  tempAssignments.push(...assignmentsToAdd);
  renderTempAssignments(newItemsDisplay);

  // 2. Clear form
  razredInput.value = "";
  programInput.value = "";
  programSubjectsContainer.innerHTML = ""; // Clear rendered subjects
  displayError(""); // Clear any previous error message
}

async function renderProgramSubjects(selectedProgram, container) {
  container.innerHTML = ""; // Clear previous subjects

  const subjectProfessorInputs = []; // To store inputs for later initialization

  for (const programSubject of selectedProgram.popis_predmeta) {
    const subject = allSubjects.find((s) => s.id === programSubject.predmet_id);
    if (!subject) continue; // Skip if subject not found (data inconsistency)

    // Filter professors who can teach this subject
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

  // Initialize all professor autocompletes
  subjectProfessorInputs.forEach((item) => {
    initializeAutocomplete(item.input, item.suggestions, true);
  });
}

function renderTempAssignments(container) {
  container.innerHTML = ""; // Clear existing display

  // Group assignments by class and program for display, as they conceptually belong together
  const groupedAssignments = {}; // Key: "RazredOznaka - ProgramNaziv"

  if (tempAssignments.length === 0) {
    container.style.display = "block"; // Ensure it's visible even if empty
    return;
  }

  container.style.display = "block"; // Show container if there are items

  for (const assignment of tempAssignments) {
    const razred = allRazredi.find((r) => r.id === assignment.razredi_id[0]);
    const program = allPrograms.find((p) => p.id === assignment.program_id);
    const subject = allSubjects.find((s) => s.id === assignment.predmet_id);
    const professor = allProfessors.find(
      (p) => p.id === assignment.profesor_id,
    );

    if (!razred || !program || !subject || !professor) {
      console.warn("Could not find full details for assignment:", assignment);
      continue;
    }

    const groupKey = `${razred.oznaka} - ${program.naziv}`;
    if (!groupedAssignments[groupKey]) {
      groupedAssignments[groupKey] = {
        razredOznaka: razred.oznaka,
        programNaziv: program.naziv,
        assignments: [],
        tempIds: [], // Store temp IDs for this group for deletion
      };
    }
    groupedAssignments[groupKey].assignments.push({
      subjectNaziv: subject.naziv,
      professorName: `${professor.ime} ${professor.prezime}`,
      sati_tjedno: assignment.sati_tjedno,
    });
    groupedAssignments[groupKey].tempIds.push(assignment.id);
  }

  for (const key in groupedAssignments) {
    const group = groupedAssignments[key];
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("new-item-tag", "kurikulum-group-tag");
    groupDiv.innerHTML = `
            <span>${group.razredOznaka} (${group.programNaziv})</span>
            <button class="delete-temp-item-btn" data-group-temp-ids="${group.tempIds.join(",")}">X</button>
            <ul>
                ${group.assignments.map((a) => `<li>${a.subjectNaziv} (${a.sati_tjedno}h) - ${a.professorName}</li>`).join("")}
            </ul>
        `;
    container.appendChild(groupDiv);
  }

  // Add event listeners for delete buttons
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
