// This file will orchestrate the building of each step's modal content.

// Array for autocomplete suggestions
let prijedloziTipovaUcionica = [];

/**
 * Builds and displays the form for the "Učionice" (Classrooms) step.
 * It dynamically populates autocomplete suggestions from existing data.
 * @param {HTMLElement} modalContent - The container element within the modal to fill.
 */
async function prikaziKorakUcionice(modalContent) {
  // Fetch existing data to create suggestions using the generic manager
  let prijedloziTipovaUcionica = await dohvatiPrijedloge('ucionice.json', (item) => item.tip);
  
  // 2. Clear previous content
  modalContent.innerHTML = "";

  // 3. Build the HTML for the step using components
  const nazivInputHtml = createSimpleInput("Naziv učionice:", "Npr. U-15");
  const tipInputHtml = createAutocompleteInput(
    "Tip učionice:",
    "Npr. Opća, Informatička...",
  );

  modalContent.innerHTML = nazivInputHtml + tipInputHtml;

  // 4. Initialize functionality for the created components
  const autocompleteInput = modalContent.querySelector(".autocomplete-input");

  // Attach the suggestions array to the modal content so it can be accessed by other functions
  modalContent.suggestionsReference = prijedloziTipovaUcionica;

  // Initialize the autocomplete suggestions
  initializeAutocomplete(autocompleteInput, modalContent.suggestionsReference);
}
