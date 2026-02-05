import {
  displayError,
  createSimpleInput,
  createAutocompleteInput,
  initializeAutocomplete,
} from "../korakProzor.js";
import { spremiJSON } from "../spremiJSON.js";
import { provjeriDupliNaziv, pronadjiIliStvoriId } from "../utils.js";
import { dohvatiPrijedloge } from "../upraviteljPrijedloga.js";

let privremeniUnosiUcionice = []; // Dedicated temporary storage for classrooms

/**
 * Renders the items from the temporary list into the display area in the modal.
 */
export async function prikaziPrivremeneUnoseUcionice() {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  const response = await fetch("tipoviUcionica.json");
  const text = await response.text();
  const tipovi = text ? JSON.parse(text) : [];
  const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

  privremeniUnosiUcionice.forEach((item, index) => {
    const tag = document.createElement("div");
    tag.classList.add("new-item-tag");

    const textSpan = document.createElement("span");
    const nazivTipa =
      item.tipovi_id.length > 0 ? tipoviMapa.get(item.tipovi_id[0]) : "";
    const tipText = nazivTipa ? ` (${nazivTipa})` : "";
    textSpan.textContent = item.naziv + tipText;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      privremeniUnosiUcionice.splice(index, 1);
      prikaziPrivremeneUnoseUcionice();
    };

    tag.appendChild(textSpan);
    tag.appendChild(deleteBtn);
    display.appendChild(tag);
  });
}

/**
 * Validates form data and creates a new classroom object using generic helpers.
 * @param {HTMLElement} modalContent - The content container of the modal's form.
 * @param {Array} postojeciPodaci - Array of existing classrooms from the JSON file.
 * @returns {Promise<object|null>} A new classroom object or null if validation fails.
 */
export async function validirajIStvoriUcionicu(modalContent, postojeciPodaci) {
  const nazivInput = modalContent.querySelector(".input-field input");
  const tipInput = modalContent.querySelector(".autocomplete-input");
  const naziv = nazivInput.value.trim();
  const nazivTipa = tipInput.value.trim();

  if (!naziv) {
    displayError("Naziv učionice ne može biti prazan.");
    return null;
  }

  if (provjeriDupliNaziv(naziv, postojeciPodaci, privremeniUnosiUcionice)) {
    displayError("Učionica s tim nazivom već postoji.");
    return null;
  }

  const tipId = await pronadjiIliStvoriId("tipoviUcionica.json", nazivTipa);

  return {
    id: -1,
    naziv: naziv,
    tipovi_id: tipId ? [tipId] : [],
    prioritet: 0,
  };
}

/**
 * Handles "Spremi i dodaj novi" button click for classrooms.
 * @param {HTMLElement} modalContent - The modal's form content element.
 */
export async function dodajNovuUcionicu(modalContent) {
  try {
    const response = await fetch("ucionice.json");
    const text = await response.text();
    const ucionice = text ? JSON.parse(text) : [];

    const novaPrivremenaUcionica = await validirajIStvoriUcionicu(
      modalContent,
      ucionice,
    );

    if (novaPrivremenaUcionica) {
      privremeniUnosiUcionice.push(novaPrivremenaUcionica);
      prikaziPrivremeneUnoseUcionice();

      const noviTipNaziv = modalContent
        .querySelector(".autocomplete-input")
        .value.trim();
      const suggestions = modalContent.suggestionsReference;
      if (
        noviTipNaziv &&
        !suggestions.some((s) => s.toLowerCase() === noviTipNaziv.toLowerCase())
      ) {
        suggestions.push(noviTipNaziv);
      }

      modalContent.querySelector(".input-field input").value = "";
      modalContent.querySelector(".autocomplete-input").value = "";
      modalContent.querySelector(".input-field input").focus();
    }
  } catch (error) {
    displayError("Greška pri provjeri podataka: " + error.message);
  }
}

/**
 * Handles the final "Spremi i zatvori" action for classrooms.
 * @returns {Promise<object>} A result object { success: true/false }.
 */
export async function spremiKorakUcionice() {
  try {
    const response = await fetch("ucionice.json");
    const text = await response.text();
    let ucionice = text ? JSON.parse(text) : [];

    // Block only if both temporary and permanent lists are empty
    if (privremeniUnosiUcionice.length === 0 && ucionice.length === 0) {
      displayError("Nema unesenih učionica.");
      return { success: false, message: "Nema unesenih učionica." };
    }

    // If there's nothing new to save, just allow the modal to close
    if (privremeniUnosiUcionice.length === 0) {
      return { success: true };
    }

    // Proceed with saving new items
    let kombiniraniPodaci = [...ucionice, ...privremeniUnosiUcionice];

    kombiniraniPodaci.forEach((ucionica, index) => {
      ucionica.id = index + 1;
    });

    const result = await spremiJSON("ucionice.json", kombiniraniPodaci);

    if (result.success) {
      privremeniUnosiUcionice = [];
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

/**
 * Edits an existing classroom.
 * @param {number} ucionicaId - The ID of the classroom to edit.
 * @param {object} noviPodaci - An object with {naziv, nazivTipa}.
 * @returns {Promise<object>} A result object.
 */
export async function urediUcionicu(ucionicaId, noviPodaci) {
  try {
    const ucioniceRes = await fetch("ucionice.json");
    const ucioniceText = await ucioniceRes.text();
    let ucionice = ucioniceText ? JSON.parse(ucioniceText) : [];

    const index = ucionice.findIndex((u) => u.id === ucionicaId);
    if (index === -1) throw new Error("Učionica nije pronađena.");

    // Check for duplicate name, excluding the current item
    if (
      provjeriDupliNaziv(
        noviPodaci.naziv,
        ucionice.filter((u) => u.id !== ucionicaId),
        [],
      )
    ) {
      throw new Error("Učionica s tim nazivom već postoji.");
    }

    const tipId = await pronadjiIliStvoriId(
      "tipoviUcionica.json",
      noviPodaci.nazivTipa,
    );

    ucionice[index].naziv = noviPodaci.naziv;
    ucionice[index].tipovi_id = tipId ? [tipId] : [];

    const result = await spremiJSON("ucionice.json", ucionice);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError("Greška pri uređivanju: " + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Deletes a classroom after checking for dependencies.
 * @param {number} ucionicaId - The ID of the classroom to delete.
 * @returns {Promise<object>} A result object.
 */
export async function obrisiUcionicu(ucionicaId) {
  try {
    // Fetch all necessary data in parallel
    const [profesoriRes, ucioniceRes, predmetiRes, tipoviRes] =
      await Promise.all([
        fetch("profesori.json"),
        fetch("ucionice.json"),
        fetch("predmeti.json"),
        fetch("tipoviUcionica.json"),
      ]);

    const profesori = await profesoriRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const ucionice = await ucioniceRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const predmeti = await predmetiRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const tipovi = await tipoviRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

    // 1. Dependency Check: Is it a fixed classroom for a teacher?
    const ovisnostProfesor = profesori.find(
      (p) => p.fiksna_ucionica_id === ucionicaId,
    );
    if (ovisnostProfesor) {
      throw new Error(
        `Nije moguće obrisati. Učionica je dodijeljena profesoru ${ovisnostProfesor.ime} ${ovisnostProfesor.prezime}.`,
      );
    }

    // 2. Dependency Check: Is it the last room of a required type?
    const ucionicaZaBrisanje = ucionice.find((u) => u.id === ucionicaId);
    if (ucionicaZaBrisanje && ucionicaZaBrisanje.tipovi_id.length > 0) {
      for (const tipId of ucionicaZaBrisanje.tipovi_id) {
        // Find all subjects that require this specific type
        const predmetiKojiTrebajuTip = predmeti.filter(
          (p) => p.potreban_tip_ucionice_id === tipId,
        );

        if (predmetiKojiTrebajuTip.length > 0) {
          // Check if any other classroom has this type
          const drugeUcioniceSTimTipom = ucionice.filter(
            (u) => u.id !== ucionicaId && u.tipovi_id.includes(tipId),
          );

          if (drugeUcioniceSTimTipom.length === 0) {
            const nazivTipa = tipoviMapa.get(tipId) || `ID: ${tipId}`;
            const nazivPredmeta = predmetiKojiTrebajuTip
              .map((p) => p.naziv)
              .join(", ");
            throw new Error(
              `Nije moguće obrisati. Ovo je zadnja učionica tipa "${nazivTipa}" koji je potreban za predmet(e): ${nazivPredmeta}.`,
            );
          }
        }
      }
    }

    // --- TODO: Future Dependency Check for kurikulum.json ---

    // Proceed with deletion
    const filtriraneUcionice = ucionice.filter((u) => u.id !== ucionicaId);

    const result = await spremiJSON("ucionice.json", filtriraneUcionice);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError(error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Builds and displays the form for the "Učionice" (Classrooms) step.
 * It dynamically populates autocomplete suggestions and displays existing items.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
export async function prikaziKorakUcionice(modalBody) {
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
 * Fetches both classrooms and their types, then renders them into the container.
 * @param {HTMLElement} container - The HTML element to populate (e.g., .existing-items-container).
 */
export async function prikaziPostojeceUcionice(container) {
  container.innerHTML = "Učitavanje...";

  try {
    const [ucioniceRes, tipoviRes] = await Promise.all([
      fetch("ucionice.json"),
      fetch("tipoviUcionica.json"),
    ]);

    const ucionice = await ucioniceRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const tipovi = await tipoviRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));

    if (ucionice.length === 0) {
      container.innerHTML = "Nema unesenih učionica.";
      return;
    }

    const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

    container.innerHTML = ""; // Clear loading message

    ucionice.forEach((ucionica) => {
      const card = document.createElement("div");
      card.className = "existing-item-card ucionica-card";
      card.dataset.id = ucionica.id;

      renderClassroomDisplayMode(card, ucionica, tipoviMapa);
      container.appendChild(card);
    });
  } catch (error) {
    console.error(`Greška pri prikazivanju postojećih učionica:`, error);
    container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
  }
}

/** Renders the default display view of a classroom card */
function renderClassroomDisplayMode(card, ucionica, tipoviMapa) {
  const nazivTipa =
    ucionica.tipovi_id.length > 0
      ? tipoviMapa.get(ucionica.tipovi_id[0]) || "Nepoznat"
      : "Nije specificiran";

  card.innerHTML = `
        <div class="card-content">
            <div class="naziv">${ucionica.naziv}</div>
            <div class="tip">Tip: ${nazivTipa}</div>
        </div>
        <div class="card-actions">
            <img src="assets/edit.png" alt="Uredi" class="edit-btn">
            <img src="assets/delete.png" alt="Obriši" class="delete-btn">
        </div>
    `;

  card
    .querySelector(".edit-btn")
    .addEventListener("click", () =>
      renderClassroomEditMode(card, ucionica, tipoviMapa),
    );
  card.querySelector(".delete-btn").addEventListener("click", async () => {
    if (
      confirm(
        `Jeste li sigurni da želite obrisati učionicu "${ucionica.naziv}"?`,
      )
    ) {
      const result = await obrisiUcionicu(ucionica.id);
      if (result.success) {
        prikaziPostojeceUcionice(card.parentElement); // Re-render the whole list
      }
    }
  });
}

/** Renders the editing view of a classroom card */
function renderClassroomEditMode(card, ucionica, tipoviMapa) {
  const nazivTipa =
    ucionica.tipovi_id.length > 0 ? tipoviMapa.get(ucionica.tipovi_id[0]) : "";
  card.classList.add("edit-mode");

  card.innerHTML = `
        <div class="card-edit-form">
            <input type="text" class="edit-naziv" value="${ucionica.naziv}">
            <input type="text" class="edit-tip" value="${nazivTipa || ""}" placeholder="Unesi tip">
        </div>
        <div class="card-actions">
            <img src="assets/save.svg" alt="Spremi" class="save-edit-btn">
            <button class="cancel-edit-btn delete-temp-item-btn">X</button>
        </div>
    `;

  card.querySelector(".save-edit-btn").addEventListener("click", async () => {
    const noviNaziv = card.querySelector(".edit-naziv").value.trim();
    const noviNazivTipa = card.querySelector(".edit-tip").value.trim();

    if (!noviNaziv) {
      return displayError("Naziv ne može biti prazan.");
    }

    const result = await urediUcionicu(ucionica.id, {
      naziv: noviNaziv,
      nazivTipa: noviNazivTipa,
    });
    if (result.success) {
      // This is a simplified refresh. A more complex app might just update the single item.
      prikaziPostojeceUcionice(card.parentElement);
    }
  });

  card.querySelector(".cancel-edit-btn").addEventListener("click", () => {
    card.classList.remove("edit-mode");
    renderClassroomDisplayMode(card, ucionica, tipoviMapa);
  });
}