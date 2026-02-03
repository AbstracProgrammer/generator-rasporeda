// This file will orchestrate the building of each step's modal content.

// Array for autocomplete suggestions
let prijedloziTipovaUcionica = [];

/**
 * Builds and displays the form for the "Učionice" (Classrooms) step.
 * It dynamically populates autocomplete suggestions from existing data.
 * @param {HTMLElement} modalContent - The container element within the modal to fill.
 */
async function prikaziKorakUcionice(modalContent) {
  // 1. Fetch existing data to create suggestions
  let prijedloziTipovaUcionica = [];
  try {
    const response = await fetch("ucionice.json");
    const text = await response.text();
    const ucionice = text ? JSON.parse(text) : [];

    // Use a Set to get unique tip values from all classroom objects
    const sviTipovi = ucionice.flatMap((u) => u.tip);
    prijedloziTipovaUcionica = [...new Set(sviTipovi)];
    console.log(prijedloziTipovaUcionica);
  } catch (error) {
    console.error("Greška pri dohvatu postojećih tipova učionica:", error);
    // Continue with an empty suggestions array
  }

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
  const addButton = modalContent.querySelector(".add-button");
  const autocompleteInput = modalContent.querySelector(".autocomplete-input");

  // Initialize the add button to modify the suggestions array
  initializeAddButton(addButton, prijedloziTipovaUcionica);

  // Initialize the autocomplete suggestions
  initializeAutocomplete(autocompleteInput, prijedloziTipovaUcionica);
}
