// This file will orchestrate the building of each step's modal content.

// Array for autocomplete suggestions
let prijedloziTipova = ["Opća", "Informatička", "Kemijska", "Sportska dvorana", "Radionica"];

/**
 * Builds and displays the form for the "Učionice" (Classrooms) step.
 * @param {HTMLElement} modalContent - The container element within the modal to fill.
 */
function prikaziKorakUcionice(modalContent) {
  // 1. Clear previous content
  modalContent.innerHTML = "";

  // 2. Build the HTML for the step using components
  const nazivInputHtml = createSimpleInput("Naziv učionice:", "Npr. U-15");
  const tipInputHtml = createAutocompleteInput("Tip učionice:", "Npr. Opća, Informatička...");

  modalContent.innerHTML = nazivInputHtml + tipInputHtml;

  // 3. Initialize functionality for the created components
  const addButton = modalContent.querySelector(".add-button");
  const autocompleteInput = modalContent.querySelector(".autocomplete-input");

  // Initialize the add button to modify the suggestions array
  initializeAddButton(addButton, prijedloziTipova);

  // Initialize the autocomplete suggestions
  initializeAutocomplete(autocompleteInput, prijedloziTipova);
}
