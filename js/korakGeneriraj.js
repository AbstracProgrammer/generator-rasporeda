// This file will orchestrate the building of each step's modal content.

/**
 * Creates the HTML string for a single classroom card.
 * @param {object} ucionica - The classroom object.
 * @returns {string} HTML string for the card.
 */
function renderUcionicaCard(ucionica) {
  const tipoviText =
    ucionica.tip && ucionica.tip.length > 0
      ? ucionica.tip.join(", ")
      : "Nije specificiran";

  return `
    <div class="existing-item-card ucionica-card">
      <div class="naziv">${ucionica.naziv}</div>
      <div class="tip">Tip: ${tipoviText}</div>
    </div>
  `;
}

/**
 * Builds and displays the form for the "Učionice" (Classrooms) step.
 * It dynamically populates autocomplete suggestions and displays existing items.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
async function prikaziKorakUcionice(modalBody) {
  // Define containers for left and right columns
  const formContainer = modalBody.querySelector(
    ".modal-form-container .modal-content",
  );
  const existingItemsContainer = modalBody.querySelector(
    ".existing-items-container",
  );

  // --- Left Column: Form ---
  let prijedloziTipovaUcionica = await dohvatiPrijedloge(
    "ucionice.json",
    (item) => item.tip,
  );

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
  prikaziPostojeceStavke(
    existingItemsContainer,
    "ucionice.json",
    renderUcionicaCard,
  );
}
