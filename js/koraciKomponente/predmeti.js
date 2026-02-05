import {
  createSimpleInput,
  createStrictAutocompleteInput,
  displayError,
  initializeAutocomplete,
} from "../korakProzor.js";
import { spremiJSON } from "../spremiJSON.js";
import { dohvatiPrijedloge } from "../upraviteljPrijedloga.js";
import { provjeriDupliNaziv } from "../utils.js";

let privremeniUnosiPredmeti = []; // Dedicated temporary storage for subjects

/**
 * Renders the items from the temporary list into the display area in the modal.
 */
export async function prikaziPrivremeneUnosePredmeti() {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  const response = await fetch("tipoviUcionica.json");
  const text = await response.text();
  const tipovi = text ? JSON.parse(text) : [];
  const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

  privremeniUnosiPredmeti.forEach((item, index) => {
    const tag = document.createElement("div");
    tag.classList.add("new-item-tag");

    const textSpan = document.createElement("span");
    const nazivTipa = item.potreban_tip_ucionice_id
      ? tipoviMapa.get(item.potreban_tip_ucionice_id)
      : "Nije specificiran";
    const tipText =
      nazivTipa !== "Nije specificiran" ? ` (Tip učionice: ${nazivTipa})` : "";
    textSpan.textContent = item.naziv + tipText;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      privremeniUnosiPredmeti.splice(index, 1);
      prikaziPrivremeneUnosePredmeti();
    };

    tag.appendChild(textSpan);
    tag.appendChild(deleteBtn);
    display.appendChild(tag);
  });
}

/**
 * Validates form data and creates a new subject object.
 * @param {HTMLElement} modalContent - The content container of the modal's form.
 * @param {Array} postojeciPodaci - Array of existing subjects from the JSON file.
 * @returns {Promise<object|null>} A new subject object or null if validation fails.
 */
export async function validirajIStvoriPredmet(modalContent, postojeciPodaci) {
  const nazivInput = modalContent.querySelector(".input-field input");
  const tipUcioniceInput = modalContent.querySelector(".autocomplete-input");
  const naziv = nazivInput.value.trim();
  const tipUcioniceNaziv = tipUcioniceInput.value.trim();

  if (!naziv) {
    displayError("Naziv predmeta ne može biti prazan.");
    return null;
  }

  if (provjeriDupliNaziv(naziv, postojeciPodaci, privremeniUnosiPredmeti)) {
    displayError("Predmet s tim nazivom već postoji.");
    return null;
  }

  let potrebanTipUcioniceId = null;
  if (tipUcioniceNaziv) {
    // For Predmeti, type MUST exist, so we only find, not create.
    const response = await fetch("tipoviUcionica.json");
    const text = await response.text();
    let tipovi = text ? JSON.parse(text) : [];
    const postojeciTip = tipovi.find(
      (t) => t.naziv.toLowerCase() === tipUcioniceNaziv.toLowerCase(),
    );

    if (postojeciTip) {
      potrebanTipUcioniceId = postojeciTip.id;
    } else {
      displayError("Odabrani tip učionice ne postoji. Odaberite s popisa.");
      return null;
    }
  }

  return {
    id: -1,
    naziv: naziv,
    potreban_tip_ucionice_id: potrebanTipUcioniceId,
  };
}

/**
 * Handles "Spremi i dodaj novi" button click for subjects.
 * @param {HTMLElement} modalContent - The modal's form content element.
 */
export async function dodajNoviPredmet(modalContent) {
  try {
    const response = await fetch("predmeti.json");
    const text = await response.text();
    const predmeti = text ? JSON.parse(text) : [];

    const noviPrivremeniPredmet = await validirajIStvoriPredmet(
      modalContent,
      predmeti,
    );

    if (noviPrivremeniPredmet) {
      privremeniUnosiPredmeti.push(noviPrivremeniPredmet);
      prikaziPrivremeneUnosePredmeti();

      modalContent.querySelector(".input-field input").value = ""; // Clear subject name
      modalContent.querySelector(".autocomplete-input").value = ""; // Clear type input
      modalContent.querySelector(".input-field input").focus();
    }
  } catch (error) {
    displayError("Greška pri provjeri podataka: " + error.message);
  }
}

/**
 * Handles the final "Spremi i zatvori" action for subjects.
 * Merges temporary items with existing data and saves everything.
 * @returns {Promise<object>} A result object { success: true/false }.
 */
export async function spremiKorakPredmeti() {
  try {
    const response = await fetch("predmeti.json");
    const text = await response.text();
    let predmeti = text ? JSON.parse(text) : [];

    if (privremeniUnosiPredmeti.length === 0 && predmeti.length === 0) {
      displayError("Nema unesenih predmeta.");
      return { success: false, message: "Nema unesenih predmeta." };
    }

    if (privremeniUnosiPredmeti.length === 0) {
      return { success: true };
    }

    let kombiniraniPodaci = [...predmeti, ...privremeniUnosiPredmeti];

    kombiniraniPodaci.forEach((predmet, index) => {
      predmet.id = index + 1;
    });

    const result = await spremiJSON("predmeti.json", kombiniraniPodaci);

    if (result.success) {
      privremeniUnosiPredmeti = [];
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
 * Edits an existing subject.
 * @param {number} predmetId - The ID of the subject to edit.
 * @param {object} noviPodaci - An object with {naziv, nazivTipaUcionice}.
 * @returns {Promise<object>} A result object.
 */
export async function urediPredmet(predmetId, noviPodaci) {
  try {
    const predmetiRes = await fetch("predmeti.json");
    const predmetiText = await predmetiRes.text();
    let predmeti = predmetiText ? JSON.parse(predmetiText) : [];

    const index = predmeti.findIndex((p) => p.id === predmetId);
    if (index === -1) throw new Error("Predmet nije pronađen.");

    if (
      provjeriDupliNaziv(
        noviPodaci.naziv,
        predmeti.filter((p) => p.id !== predmetId),
        [],
      )
    ) {
      throw new Error("Predmet s tim nazivom već postoji.");
    }

    let potrebanTipUcioniceId = null;
    if (noviPodaci.nazivTipaUcionice) {
      const response = await fetch("tipoviUcionica.json");
      const text = await response.text();
      let tipovi = text ? JSON.parse(text) : [];
      const postojeciTip = tipovi.find(
        (t) =>
          t.naziv.toLowerCase() === noviPodaci.nazivTipaUcionice.toLowerCase(),
      );

      if (postojeciTip) {
        potrebanTipUcioniceId = postojeciTip.id;
      } else {
        throw new Error(
          "Odabrani tip učionice ne postoji. Odaberite s popisa.",
        );
      }
    }

    predmeti[index].naziv = noviPodaci.naziv;
    predmeti[index].potreban_tip_ucionice_id = potrebanTipUcioniceId;

    const result = await spremiJSON("predmeti.json", predmeti);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError("Greška pri uređivanju: " + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Deletes a subject after checking for dependencies.
 * @param {number} predmetId - The ID of the subject to delete.
 * @returns {Promise<object>} A result object.
 */
export async function obrisiPredmet(predmetId) {
  try {
    // Fetch all necessary data in parallel
    const [programRes, profesoriRes, predmetiRes] = await Promise.all([
      fetch("program.json"),
      fetch("profesori.json"),
      fetch("predmeti.json"),
    ]);

    const programi = await programRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const profesori = await profesoriRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const predmeti = await predmetiRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));

    // 1. Dependency Check: Is it part of a program?
    const ovisnostProgram = programi.find((p) =>
      p.popis_predmeta.some((item) => item.predmet_id === predmetId),
    );
    if (ovisnostProgram) {
      throw new Error(
        `Nije moguće obrisati. Predmet se koristi u programu "${ovisnostProgram.naziv}".`,
      );
    }

    // 2. Dependency Check: Is it taught by a teacher?
    const ovisnostProfesor = profesori.find((p) =>
      p.struka_predmeti_id.includes(predmetId),
    );
    if (ovisnostProfesor) {
      throw new Error(
        `Nije moguće obrisati. Predmet je dodijeljen profesoru ${ovisnostProfesor.ime} ${ovisnostProfesor.prezime}.`,
      );
    }

    // --- TODO: Future Dependency Check for kurikulum.json ---

    // Proceed with deletion
    const filtriraniPredmeti = predmeti.filter((p) => p.id !== predmetId);

    const result = await spremiJSON("predmeti.json", filtriraniPredmeti);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError(error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Builds and displays the form for the "Predmeti" (Subjects) step.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
export async function prikaziKorakPredmeti(modalBody) {
  const formContainer = modalBody.querySelector(
    ".modal-form-container .modal-content",
  );
  const existingItemsContainer = modalBody.querySelector(
    ".existing-items-container",
  );

  // --- Left Column: Form ---
  // Fetch type *names* for suggestions for strict autocomplete
  let prijedloziTipovaUcionica = await dohvatiPrijedloge(
    "tipoviUcionica",
    (item) => item.naziv,
  );

  formContainer.innerHTML = ""; // Clear previous form content

  const nazivInputHtml = createSimpleInput(
    "Naziv predmeta:",
    "Npr. Matematika",
  );
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
 * Fetches subjects and their required classroom types, then renders them.
 * @param {HTMLElement} container - The HTML element to populate.
 */
export async function prikaziPostojecePredmete(container) {
  container.innerHTML = "Učitavanje...";

  try {
    const [predmetiRes, tipoviRes] = await Promise.all([
      fetch("predmeti.json"),
      fetch("tipoviUcionica.json"),
    ]);

    const predmeti = await predmetiRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const tipovi = await tipoviRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));

    if (predmeti.length === 0) {
      container.innerHTML = "Nema unesenih predmeta.";
      return;
    }

    const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

    container.innerHTML = ""; // Clear loading message

    predmeti.forEach((predmet) => {
      const card = document.createElement("div");
      card.className = "existing-item-card predmet-card";
      card.dataset.id = predmet.id;

      renderPredmetDisplayMode(card, predmet, tipoviMapa);
      container.appendChild(card);
    });
  } catch (error) {
    console.error(`Greška pri prikazivanju postojećih predmeta:`, error);
    container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
  }
}

/** Renders the default display view of a subject card */
function renderPredmetDisplayMode(card, predmet, tipoviMapa) {
  const nazivTipaUcionice = predmet.potreban_tip_ucionice_id
    ? tipoviMapa.get(predmet.potreban_tip_ucionice_id) || "Nepoznat"
    : "Nije specificiran";

  card.innerHTML = `
        <div class="card-content">
            <div class="naziv">${predmet.naziv}</div>
            <div class="tip potreban-tip">Potreban tip učionice: ${nazivTipaUcionice}</div>
        </div>
        <div class="card-actions">
            <img src="assets/edit.png" alt="Uredi" class="edit-btn">
            <img src="assets/delete.png" alt="Obriši" class="delete-btn">
        </div>
    `;

  card
    .querySelector(".edit-btn")
    .addEventListener("click", () =>
      renderPredmetEditMode(card, predmet, tipoviMapa),
    );
  card.querySelector(".delete-btn").addEventListener("click", async () => {
    if (
      confirm(`Jeste li sigurni da želite obrisati predmet "${predmet.naziv}"?`)
    ) {
      const result = await obrisiPredmet(predmet.id);
      if (result.success) {
        prikaziPostojecePredmete(card.parentElement); // Re-render the whole list
      }
    }
  });
}

/** Renders the editing view of a subject card */

function renderPredmetEditMode(card, predmet, tipoviMapa) {
  const nazivTipaUcionice = predmet.potreban_tip_ucionice_id
    ? tipoviMapa.get(predmet.potreban_tip_ucionice_id)
    : "";

  card.classList.add("edit-mode");

  card.innerHTML = `

        <div class="card-edit-form">

            <input type="text" class="edit-naziv" value="${predmet.naziv}">

            <div class="autocomplete-wrapper"> <!-- Replicating structure from createStrictAutocompleteInput -->

                <input type="text" class="edit-tip-ucionice autocomplete-input" value="${nazivTipaUcionice || ""}" placeholder="Potreban tip učionice" autocomplete="off">

                <div class="suggestions-list" style="display: none;"></div>

            </div>

        </div>

        <div class="card-actions">

            <img src="assets/save.svg" alt="Spremi" class="save-edit-btn">

            <button class="cancel-edit-btn delete-temp-item-btn">X</button>

        </div>

    `;

  // Initialize strict autocomplete for the type input

  const tipUcioniceInput = card.querySelector(".edit-tip-ucionice");

  const suggestionsListElement = card.querySelector(".suggestions-list"); // Explicitly find the element

  fetch("tipoviUcionica.json")
    .then((res) => res.text())

    .then((text) => {
      const tipovi = text ? JSON.parse(text) : [];

      const prijedloziTipova = tipovi.map((t) => t.naziv);

      initializeAutocomplete(
        tipUcioniceInput,
        prijedloziTipova,
        true,
        suggestionsListElement,
      ); // Pass explicitly
    })

    .catch((error) =>
      console.error(
        "Greška pri dohvatu tipova učionica za uređivanje predmeta:",
        error,
      ),
    );

  card.querySelector(".save-edit-btn").addEventListener("click", async () => {
    const noviNaziv = card.querySelector(".edit-naziv").value.trim();

    const noviNazivTipaUcionice = card
      .querySelector(".edit-tip-ucionice")
      .value.trim();

    if (!noviNaziv) {
      return displayError("Naziv predmeta ne može biti prazan.");
    }

    const result = await urediPredmet(predmet.id, {
      naziv: noviNaziv,
      nazivTipaUcionice: noviNazivTipaUcionice,
    });

    if (result.success) {
      prikaziPostojecePredmete(card.parentElement);
    }
  });

  card.querySelector(".cancel-edit-btn").addEventListener("click", () => {
    card.classList.remove("edit-mode");

    renderPredmetDisplayMode(card, predmet, tipoviMapa);
  });
}
