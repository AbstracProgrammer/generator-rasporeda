// This file will manage the specific SAVE logic for each step.

// A temporary local storage for new items added during a single modal session
let privremeniUnosi = {
  ucionice: [],
  // predmeti: [], etc. for other steps
};

/**
 * Renders the items from the temporary list into the display area in the modal.
 * @param {string} step The key for the privremeniUnosi object (e.g., 'ucionice').
 */
function prikaziPrivremeneUnose(step) {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";
  privremeniUnosi[step].forEach(item => {
    const tag = document.createElement("div");
    tag.classList.add("new-item-tag");
    tag.textContent = item.naziv; // Display the name of the item
    display.appendChild(tag);
  });
}

/**
 * Validates form data and creates a new classroom object.
 * @param {HTMLElement} modalContent - The content container of the modal.
 * @param {Array} postojeciPodaci - Array of existing classrooms from the JSON file.
 * @returns {object|null} A new classroom object or null if validation fails.
 */
function validirajIStvoriUcionicu(modalContent, postojeciPodaci) {
  const nazivInput = modalContent.querySelector(".input-field input");
  const tipInput = modalContent.querySelector(".autocomplete-input");
  const naziv = nazivInput.value.trim();
  const tip = tipInput.value.trim();

  if (!naziv) {
    displayError("Naziv učionice ne može biti prazan.");
    return null;
  }

  // Check for duplicates in both existing and temporary data (case-insensitive)
  const sviNazivi = [
    ...postojeciPodaci.map(u => u.naziv.toLowerCase()),
    ...privremeniUnosi.ucionice.map(u => u.naziv.toLowerCase())
  ];
  if (sviNazivi.includes(naziv.toLowerCase())) {
    displayError("Učionica s tim nazivom već postoji.");
    return null;
  }

  // Create a temporary object without a final ID
  return {
    id: -1, // Temporary ID, will be recalculated on final save
    naziv: naziv,
    tip: tip ? [tip] : [],
    prioritet: 0,
  };
}

/**
 * Handles "Spremi i dodaj novi" button click.
 * Validates and adds a new classroom to the temporary list.
 * @param {HTMLElement} modalContent - The modal's content element.
 */
async function dodajNovuUcionicu(modalContent) {
  try {
    const response = await fetch('ucionice.json');
    const text = await response.text();
    const ucionice = text ? JSON.parse(text) : [];

    const novaPrivremenaUcionica = validirajIStvoriUcionicu(modalContent, ucionice);

    if (novaPrivremenaUcionica) {
      privremeniUnosi.ucionice.push(novaPrivremenaUcionica);
      prikaziPrivremeneUnose('ucionice');
      // Clear input fields for the next entry
      modalContent.querySelector(".input-field input").value = "";
      modalContent.querySelector(".autocomplete-input").value = "";
      modalContent.querySelector(".input-field input").focus();
    }
  } catch (error) {
    displayError("Greška pri provjeri podataka: " + error.message);
  }
}

/**
 * Handles the final "Spremi i zatvori" action.
 * Merges temporary items with existing data and saves everything.
 * @returns {Promise<object>} A result object { success: true/false, ... }.
 */
async function spremiKorakUcionice() {
  try {
    const response = await fetch('ucionice.json');
    const text = await response.text();
    let ucionice = text ? JSON.parse(text) : [];

    // Combine existing data with new temporary entries
    let kombiniraniPodaci = [...ucionice, ...privremeniUnosi.ucionice];

    // Recalculate IDs for all entries to ensure uniqueness and correct sequence
    kombiniraniPodaci.forEach((ucionica, index) => {
      ucionica.id = index + 1;
    });

    const result = await spremiJSON('ucionice.json', kombiniraniPodaci);

    if (result.success) {
      privremeniUnosi.ucionice = []; // Clear temporary list on successful save
      return { success: true };
    } else {
      displayError(result.message || "Došlo je do greške na serveru.");
      return { success: false, message: result.message };
    }

  } catch (error) {
    displayError("Greška pri spremanju: " + error.message);
    return { success: false, message: error.message };
  }
}
