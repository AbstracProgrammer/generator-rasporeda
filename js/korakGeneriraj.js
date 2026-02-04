// This file will orchestrate the building of each step's modal content.

/**
 * Builds and displays the form for the "Učionice" (Classrooms) step.
 * It dynamically populates autocomplete suggestions and displays existing items.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
async function prikaziKorakUcionice(modalBody) {
  // Define containers for left and right columns
  const formContainer = modalBody.querySelector('.modal-form-container .modal-content');
  const existingItemsContainer = modalBody.querySelector('.existing-items-container');

  // --- Left Column: Form ---
  // Fetch type *names* for suggestions from the new central file
  let prijedloziTipovaUcionica = await dohvatiPrijedloge('tipoviUcionica.json', (item) => item.naziv);
  
  formContainer.innerHTML = ""; // Clear previous form content

  const nazivInputHtml = createSimpleInput("Naziv učionice:", "Npr. U-15");
  const tipInputHtml = createAutocompleteInput(
    "Tip učionice:",
    "Npr. Opća, Informatička...",
  );

  formContainer.innerHTML = nazivInputHtml + tipInputHtml;

  const autocompleteInput = formContainer.querySelector(".autocomplete-input");
  formContainer.suggestionsReference = prijedloziTipovaUcionica;
  initializeAutocomplete(autocompleteInput, formContainer.suggestionsReference);

  // --- Right Column: Existing Items ---
  // Call the new specific function to display existing classrooms
  prikaziPostojeceUcionice(existingItemsContainer);
}

/**
 * Builds and displays the form for the "Predmeti" (Subjects) step.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
async function prikaziKorakPredmeti(modalBody) {
  const formContainer = modalBody.querySelector('.modal-form-container .modal-content');
  const existingItemsContainer = modalBody.querySelector('.existing-items-container');

  // --- Left Column: Form ---
  // Fetch type *names* for suggestions for strict autocomplete
  let prijedloziTipovaUcionica = await dohvatiPrijedloge('tipoviUcionica.json', (item) => item.naziv);
  
  formContainer.innerHTML = ""; // Clear previous form content

  const nazivInputHtml = createSimpleInput("Naziv predmeta:", "Npr. Matematika");
  const tipUcioniceInputHtml = createStrictAutocompleteInput(
    "Potreban tip učionice:",
    "Npr. Opća, Informatička... (ostavi prazno ako nije specifično)",
  );

  formContainer.innerHTML = nazivInputHtml + tipUcioniceInputHtml;

  const autocompleteInput = formContainer.querySelector(".autocomplete-input");
  // No suggestionsReference needed here as strict autocomplete does not add new
  initializeAutocomplete(autocompleteInput, prijedloziTipovaUcionica, true); // Strict mode!

  // --- Right Column: Existing Items ---
  prikaziPostojecePredmete(existingItemsContainer); // New function for Predmeti
}

/**
 * Builds and displays the form for the "Profesori" (Teachers) step.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
async function prikaziKorakProfesori(modalBody) {
    const formContainer = modalBody.querySelector('.modal-form-container .modal-content');
    const existingItemsContainer = modalBody.querySelector('.existing-items-container');

    // --- Left Column: Form ---
    let prijedloziPredmeta = await dohvatiPrijedloge('predmeti.json', (item) => item.naziv);

    formContainer.innerHTML = ""; // Clear previous form content

    const imeInputHtml = createSimpleInput("Ime profesora:", "Npr. Ivan");
    const prezimeInputHtml = createSimpleInput("Prezime profesora:", "Npr. Horvat");
    const strukaInputHtml = createMultiSelectAutocompleteInput(
        "Predaje predmete:",
        "Npr. Matematika, Fizika..."
    );

    formContainer.innerHTML = imeInputHtml + prezimeInputHtml + strukaInputHtml;

    const strukaAutocompleteInput = formContainer.querySelector(".multi-select-autocomplete .autocomplete-input");
    const selectedTagsContainer = formContainer.querySelector(".selected-tags-container");

    // Initialize an array to hold selected subject names for the current form instance
    formContainer.selectedSubjectNames = [];

    const multiSelectFunctions = initializeMultiSelectAutocomplete(
        strukaAutocompleteInput,
        prijedloziPredmeta,
        selectedTagsContainer,
        (itemText) => {
            if (!formContainer.selectedSubjectNames.includes(itemText)) {
                formContainer.selectedSubjectNames.push(itemText);
                multiSelectFunctions.renderSelectedTags(formContainer.selectedSubjectNames);
            }
        },
        (itemText) => {
            formContainer.selectedSubjectNames = formContainer.selectedSubjectNames.filter(name => name !== itemText);
            multiSelectFunctions.renderSelectedTags(formContainer.selectedSubjectNames);
        }
    );

    // --- Right Column: Existing Items ---
    // prikaziPostojeceProfesore(existingItemsContainer); // Will be implemented later
}
