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
