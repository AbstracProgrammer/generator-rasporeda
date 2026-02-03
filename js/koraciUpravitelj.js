// This file will manage the specific SAVE logic for each step.

/**
 * Handles the save process for the "Ucionice" (Classrooms) step.
 * It reads data from the modal, validates it, and saves it to the JSON file.
 * @param {HTMLElement} modalContent - The container element of the modal's form.
 * @returns {Promise<object>} An object indicating the result, e.g., { success: true } or { success: false, message: 'Error message' }.
 */
async function spremiKorakUcionice(modalContent) {
  try {
    // 1. Fetch current data robustly
    const response = await fetch('ucionice.json');
    const text = await response.text();
    const ucionice = text ? JSON.parse(text) : [];

    // 2. Get data from form
    const nazivInput = modalContent.querySelector(".input-field input");
    const tipInput = modalContent.querySelector(".autocomplete-input");
    
    const naziv = nazivInput.value.trim();
    const tip = tipInput.value.trim();

    if (!naziv) {
      displayError("Naziv učionice ne može biti prazan.");
      return { success: false, message: "Naziv učionice ne može biti prazan." };
    }

    // 3. Create new object
    const noviId = ucionice.length > 0 ? Math.max(...ucionice.map(u => u.id)) + 1 : 1;
    const novaUcionica = {
      id: noviId,
      naziv: naziv,
      tip: tip ? [tip] : [],
      prioritet: 0,
    };

    // 4. Append to array
    ucionice.push(novaUcionica);

    // 5. Save the whole array back
    const result = await spremiJSON('ucionice.json', ucionice);

    if (result.success) {
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
