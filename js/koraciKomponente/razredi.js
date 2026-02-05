import { displayError } from "../korakProzor.js";
import { spremiJSON } from "../spremiJSON.js";

let privremeniUnosiRazredi = []; // Dedicated temporary storage for classes

/**
 * Renders the temporary class sections into the display area.
 */
export function prikaziPrivremeneUnoseRazredi() {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  privremeniUnosiRazredi.forEach((item, index) => {
    const tag = document.createElement("div");
    tag.classList.add("new-item-tag");

    const textSpan = document.createElement("span");
    textSpan.textContent = `Odjeljenje: ${item.oznaka} (1-${item.godine}. godina)`;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      privremeniUnosiRazredi.splice(index, 1);
      prikaziPrivremeneUnoseRazredi();
    };

    tag.appendChild(textSpan);
    tag.appendChild(deleteBtn);
    display.appendChild(tag);
  });
}

/**
 * Handles adding a new class section group temporarily.
 * @param {HTMLElement} modalContent - The modal's form content element.
 */
export async function dodajNovoOdjeljenje(modalContent) {
  const oznakaInput = modalContent.querySelector("#class-section-identifier");
  const godineInput = modalContent.querySelector("#class-years-count");
  const oznaka = oznakaInput.value.trim();
  const godine = parseInt(godineInput.value, 10);

  if (!oznaka) {
    return displayError("Oznaka odjeljenja ne može biti prazna.");
  }
  if (isNaN(godine) || godine < 1 || godine > 8) {
    return displayError("Broj godina mora biti između 1 i 8.");
  }

  try {
    const response = await fetch("razredi.json");
    const text = await response.text();
    const postojeciRazredi = text ? JSON.parse(text) : [];

    // Check for uniqueness in both existing and temporary data
    const vecPostoji =
      postojeciRazredi.some(
        (r) => r.odjeljenje.toLowerCase() === oznaka.toLowerCase(),
      ) ||
      privremeniUnosiRazredi.some(
        (r) => r.oznaka.toLowerCase() === oznaka.toLowerCase(),
      );

    if (vecPostoji) {
      return displayError(`Odjeljenje s oznakom "${oznaka}" već postoji.`);
    }

    privremeniUnosiRazredi.push({ oznaka, godine });
    prikaziPrivremeneUnoseRazredi();

    // Clear inputs
    oznakaInput.value = "";
    godineInput.value = "4";
    oznakaInput.focus();
  } catch (error) {
    displayError("Greška pri provjeri postojećih razreda: " + error.message);
  }
}

/**
 * Handles the final save action for the "Razredi" step.
 * @returns {Promise<object>} A result object { success: true/false }.
 */
export async function spremiKorakRazredi() {
  try {
    const response = await fetch("razredi.json");
    const text = await response.text();
    let postojeciRazredi = text ? JSON.parse(text) : [];

    if (privremeniUnosiRazredi.length === 0 && postojeciRazredi.length === 0) {
      displayError("Nema unesenih razreda.");
      return { success: false, message: "Nema unesenih razreda." };
    }
    if (privremeniUnosiRazredi.length === 0) {
      return { success: true }; // Nothing new to save
    }

    const noviRazredi = [];
    privremeniUnosiRazredi.forEach((odjeljenje) => {
      for (let i = 1; i <= odjeljenje.godine; i++) {
        noviRazredi.push({
          id: -1, // Placeholder ID
          godina: i,
          odjeljenje: odjeljenje.oznaka,
          oznaka: `${i}.${odjeljenje.oznaka}`,
        });
      }
    });

    let kombiniraniPodaci = [...postojeciRazredi, ...noviRazredi];

    // Re-assign all IDs to ensure they are unique and sequential
    kombiniraniPodaci.forEach((razred, index) => {
      razred.id = index + 1;
    });

    const result = await spremiJSON("razredi.json", kombiniraniPodaci);

    if (result.success) {
      privremeniUnosiRazredi = []; // Clear temporary entries on successful save
      return { success: true };
    } else {
      displayError(result.message || "Došlo je do greške na serveru.");
      return { success: false, message: result.message };
    }
  } catch (error) {
    displayError("Greška pri spremanju razreda: " + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Deletes a class section and all its associated years.
 * @param {string} odjeljenjeOznaka - The identifier of the section to delete (e.g., 'a').
 * @returns {Promise<object>} A result object.
 */
export async function obrisiOdjeljenje(odjeljenjeOznaka) {
  try {
    // TODO: Add dependency checks for kurikulum.json
    // const kurikulumRes = await fetch('kurikulum.json');
    // ... find if any razred.id from this odjeljenje is used.

    const response = await fetch("razredi.json");
    const text = await response.text();
    let razredi = text ? JSON.parse(text) : [];

    const filtriraniRazredi = razredi.filter(
      (r) => r.odjeljenje.toLowerCase() !== odjeljenjeOznaka.toLowerCase(),
    );

    // Re-assign IDs
    filtriraniRazredi.forEach((razred, index) => {
      razred.id = index + 1;
    });

    const result = await spremiJSON("razredi.json", filtriraniRazredi);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError(error.message);
    return { success: false };
  }
}

/**
 * Edits an entire class section.
 * @param {string} staraOznaka - The original section identifier.
 * @param {string} novaOznaka - The new section identifier.
 * @param {number} noveGodine - The new number of years for the section.
 * @returns {Promise<object>} A result object.
 */
export async function urediOdjeljenje(staraOznaka, novaOznaka, noveGodine) {
  try {
    const response = await fetch("razredi.json");
    const text = await response.text();
    let razredi = text ? JSON.parse(text) : [];

    // Check if the new name already exists (and it's not the same as the old one)
    if (staraOznaka.toLowerCase() !== novaOznaka.toLowerCase()) {
      if (
        razredi.some(
          (r) => r.odjeljenje.toLowerCase() === novaOznaka.toLowerCase(),
        )
      ) {
        throw new Error(`Odjeljenje s oznakom "${novaOznaka}" već postoji.`);
      }
    }

    // Remove old entries for the section
    let ostatakRazreda = razredi.filter(
      (r) => r.odjeljenje.toLowerCase() !== staraOznaka.toLowerCase(),
    );

    // Create new entries
    const noviRazredi = [];
    for (let i = 1; i <= noveGodine; i++) {
      noviRazredi.push({
        id: -1, // Placeholder
        godina: i,
        odjeljenje: novaOznaka,
        oznaka: `${i}.${novaOznaka}`,
      });
    }

    let kombiniraniPodaci = [...ostatakRazreda, ...noviRazredi];

    // Re-assign all IDs
    kombiniraniPodaci.forEach((razred, index) => {
      razred.id = index + 1;
    });

    const result = await spremiJSON("razredi.json", kombiniraniPodaci);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError("Greška pri uređivanju: " + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Builds and displays the form for the "Razredi" (Classes) step.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
export async function prikaziKorakRazredi(modalBody) {
    const formContainer = modalBody.querySelector('.modal-form-container .modal-content');
    const existingItemsContainer = modalBody.querySelector('.existing-items-container');

    formContainer.innerHTML = `
        <div class="input-field">
            <span class="field-label">Oznaka odjeljenja:</span>
            <input type="text" id="class-section-identifier" placeholder="Npr. a, b, g...">
        </div>
        <div class="input-field">
            <span class="field-label">Broj godina:</span>
            <input type="number" id="class-years-count" min="1" max="8" value="4">
        </div>
    `;
    
    // The "Dodaj novi" button in .modal-actions will now be used as the "+" button
    // We will handle its logic specifically in the index.js dispatcher.

    // Display existing and temporary classes
    prikaziPostojeceRazrede(existingItemsContainer);
}

/**
 * Fetches and displays existing class sections, grouped by their identifier.
 * @param {HTMLElement} container - The HTML element to populate.
 */
export async function prikaziPostojeceRazrede(container) {
    container.innerHTML = 'Učitavanje...';
    try {
        const response = await fetch('razredi.json');
        const text = await response.text();
        const razredi = text ? JSON.parse(text) : [];

        if (razredi.length === 0) {
            container.innerHTML = 'Nema unesenih razreda.';
            return;
        }

        // Group classes by 'odjeljenje'
        const grupiraniRazredi = razredi.reduce((acc, razred) => {
            const odjeljenje = razred.odjeljenje;
            if (!acc[odjeljenje]) {
                acc[odjeljenje] = [];
            }
            acc[odjeljenje].push(razred);
            return acc;
        }, {});

        container.innerHTML = ""; // Clear loading message

        for (const odjeljenje in grupiraniRazredi) {
            const card = document.createElement('div');
            card.className = 'existing-item-card razred-card';
            card.dataset.odjeljenje = odjeljenje;

            const grupa = grupiraniRazredi[odjeljenje];
            renderRazredDisplayMode(card, grupa);
            container.appendChild(card);
        }

    } catch (error) {
        console.error(`Greška pri prikazivanju postojećih razreda:`, error);
        container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
    }
}

/** Renders the display view for a class section card */
function renderRazredDisplayMode(card, grupa) {
    const odjeljenje = grupa[0].odjeljenje;
    const godine = grupa.map(r => r.godina).sort((a, b) => a - b);
    const godineText = `(${godine.join(', ')}. godina)`;

    card.innerHTML = `
        <div class="card-content">
            <div class="naziv">Odjeljenje: ${odjeljenje}</div>
            <div class="tip">${godineText}</div>
        </div>
        <div class="card-actions">
            <img src="assets/edit.png" alt="Uredi" class="edit-btn">
            <img src="assets/delete.png" alt="Obriši" class="delete-btn">
        </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => renderRazredEditMode(card, grupa));
    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Jeste li sigurni da želite obrisati cijelo odjeljenje "${odjeljenje}"?`)) {
            const result = await obrisiOdjeljenje(odjeljenje);
            if (result.success) {
                prikaziPostojeceRazrede(card.parentElement);
            }
        }
    });
}

/** Renders the editing view for a class section card */
function renderRazredEditMode(card, grupa) {
    const odjeljenje = grupa[0].odjeljenje;
    const brojGodina = grupa.length;
    card.classList.add('edit-mode');

    card.innerHTML = `
        <div class="card-edit-form">
            <input type="text" class="edit-oznaka" value="${odjeljenje}">
            <input type="number" class="edit-godine" value="${brojGodina}" min="1" max="8">
        </div>
        <div class="card-actions">
            <img src="assets/save.svg" alt="Spremi" class="save-edit-btn">
            <button class="cancel-edit-btn delete-temp-item-btn">X</button>
        </div>
    `;

    card.querySelector('.save-edit-btn').addEventListener('click', async () => {
        const novaOznaka = card.querySelector('.edit-oznaka').value.trim();
        const noveGodine = parseInt(card.querySelector('.edit-godine').value, 10);

        if (!novaOznaka) {
            return displayError("Oznaka ne može biti prazna.");
        }
        if (isNaN(noveGodine) || noveGodine < 1 || noveGodine > 8) {
            return displayError("Broj godina mora biti između 1 i 8.");
        }

        const result = await urediOdjeljenje(odjeljenje, novaOznaka, noveGodine);
        if (result.success) {
            // Fetch the latest razredi data to update just this card
            const response = await fetch('razredi.json');
            const text = await response.text();
            const allRazredi = text ? JSON.parse(text) : [];

            // Find the updated group for the edited section
            const updatedGrupa = allRazredi.filter(r => r.odjeljenje.toLowerCase() === novaOznaka.toLowerCase());
            
            if (updatedGrupa.length > 0) {
                card.classList.remove('edit-mode');
                renderRazredDisplayMode(card, updatedGrupa);
            } else {
                // If the group was effectively deleted or changed so much it no longer exists, re-render parent
                prikaziPostojeceRazrede(card.parentElement);
            }
        }
    });

    card.querySelector('.cancel-edit-btn').addEventListener('click', () => {
        card.classList.remove('edit-mode');
        renderRazredDisplayMode(card, grupa);
    });
}