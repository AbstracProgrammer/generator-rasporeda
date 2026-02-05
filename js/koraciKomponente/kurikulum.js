import {
  createStrictAutocompleteInput,
  displayError,
  initializeAutocomplete,
} from "../korakProzor.js";
import { dohvatiPrijedloge } from "../upraviteljPrijedloga.js";

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

export async function prikaziKurikulum() {
  const modalContent = document.querySelector(".korak-prozor .modal-content");
  console.log(modalContent);

  // Fetch all necessary base data only once when modal is opened
  allSubjects = await fetchJsonData("predmeti");
  allProfessors = await fetchJsonData("profesori");
  allPrograms = await fetchJsonData("program");

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
  const razrediPrijedlozi = await dohvatiPrijedloge(
    "razredi",
    (razred) => razred.oznaka,
  );
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

  // Initial render if program is already selected (e.g. on modal re-open with data)
  // This part is for later, when we handle editing existing curriculum items.
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
