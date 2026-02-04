// This file will manage the specific SAVE logic for each step.

// A temporary local storage for new items added during a single modal session
let privremeniUnosi = {
  ucionice: [],
  predmeti: [],
  profesori: [], // Added for 'Profesori' step
  razredi: [],
};

// --- GENERIC HELPER FUNCTIONS ---

/**
 * A generic function to check for duplicate names in both existing and temporary data.
 * @param {string} noviNaziv - The new name to check.
 * @param {Array} postojeciPodaci - Array of objects from the main JSON file.
 * @param {Array} privremeniPodaci - Array of objects from the temporary list.
 * @param {string} [poljeZaNaziv='naziv'] - The name of the property that holds the name.
 * @returns {boolean} True if a duplicate is found, false otherwise.
 */
function provjeriDupliNaziv(
  noviNaziv,
  postojeciPodaci,
  privremeniPodaci,
  poljeZaNaziv = "naziv",
) {
  const sviNazivi = [
    ...postojeciPodaci.map((p) => p[poljeZaNaziv].toLowerCase()),
    ...privremeniPodaci.map((p) => p[poljeZaNaziv].toLowerCase()),
  ];
  return sviNazivi.includes(noviNaziv.toLowerCase());
}

/**
 * A generic function to find an item's ID by its name in any JSON file. If it doesn't exist, it creates it.
 * @param {string} fileName - The JSON file to search in.
 * @param {string} nazivStavke - The name of the item to find/create.
 * @param {string} [poljeZaNaziv='naziv'] - The name of the property that holds the name.
 * @returns {Promise<number|null>} The ID of the item.
 */
async function pronadjiIliStvoriId(
  fileName,
  nazivStavke,
  poljeZaNaziv = "naziv",
) {
  if (!nazivStavke) return null;

  const response = await fetch(fileName);
  const text = await response.text();
  let stavke = text ? JSON.parse(text) : [];

  const postojecaStavka = stavke.find(
    (s) => s[poljeZaNaziv].toLowerCase() === nazivStavke.toLowerCase(),
  );

  if (postojecaStavka) {
    return postojecaStavka.id;
  } else {
    const noviId =
      stavke.length > 0 ? Math.max(...stavke.map((s) => s.id)) + 1 : 1;
    const novaStavka = { id: noviId, [poljeZaNaziv]: nazivStavke };
    stavke.push(novaStavka);

    await spremiJSON(fileName, stavke);
    return noviId;
  }
}

// --- UČIONICE SPECIFIC FUNCTIONS ---

/**
 * Renders the items from the temporary list into the display area in the modal.
 * @param {string} step The key for the privremeniUnosi object (e.g., 'ucionice').
 */
async function prikaziPrivremeneUnose(step) {
  // This function should be made generic or moved to korakPrikaziDodano.js
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  const response = await fetch("tipoviUcionica.json");
  const text = await response.text();
  const tipovi = text ? JSON.parse(text) : [];
  const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

  privremeniUnosi[step].forEach((item, index) => {
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
      privremeniUnosi[step].splice(index, 1);
      prikaziPrivremeneUnose(step);
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
async function validirajIStvoriUcionicu(modalContent, postojeciPodaci) {
  const nazivInput = modalContent.querySelector(".input-field input");
  const tipInput = modalContent.querySelector(".autocomplete-input");
  const naziv = nazivInput.value.trim();
  const nazivTipa = tipInput.value.trim();

  if (!naziv) {
    displayError("Naziv učionice ne može biti prazan.");
    return null;
  }

  if (provjeriDupliNaziv(naziv, postojeciPodaci, privremeniUnosi.ucionice)) {
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
async function dodajNovuUcionicu(modalContent) {
  try {
    const response = await fetch("ucionice.json");
    const text = await response.text();
    const ucionice = text ? JSON.parse(text) : [];

    const novaPrivremenaUcionica = await validirajIStvoriUcionicu(
      modalContent,
      ucionice,
    );

    if (novaPrivremenaUcionica) {
      privremeniUnosi.ucionice.push(novaPrivremenaUcionica);
      prikaziPrivremeneUnose("ucionice");

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
async function spremiKorakUcionice() {
  try {
    const response = await fetch("ucionice.json");
    const text = await response.text();
    let ucionice = text ? JSON.parse(text) : [];

    // Block only if both temporary and permanent lists are empty
    if (privremeniUnosi.ucionice.length === 0 && ucionice.length === 0) {
      displayError("Nema unesenih učionica.");
      return { success: false, message: "Nema unesenih učionica." };
    }

    // If there's nothing new to save, just allow the modal to close
    if (privremeniUnosi.ucionice.length === 0) {
      return { success: true };
    }

    // Proceed with saving new items
    let kombiniraniPodaci = [...ucionice, ...privremeniUnosi.ucionice];

    kombiniraniPodaci.forEach((ucionica, index) => {
      ucionica.id = index + 1;
    });

    const result = await spremiJSON("ucionice.json", kombiniraniPodaci);

    if (result.success) {
      privremeniUnosi.ucionice = [];
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

// --- LOGIC FOR EDITING AND DELETING ---
/**
 * Edits an existing classroom.
 * @param {number} ucionicaId - The ID of the classroom to edit.
 * @param {object} noviPodaci - An object with {naziv, nazivTipa}.
 * @returns {Promise<object>} A result object.
 */
async function urediUcionicu(ucionicaId, noviPodaci) {
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
async function obrisiUcionicu(ucionicaId) {
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

// --- PREDMETI SPECIFIC FUNCTIONS ---

/**
 * Validates form data and creates a new subject object.
 * @param {HTMLElement} modalContent - The content container of the modal's form.
 * @param {Array} postojeciPodaci - Array of existing subjects from the JSON file.
 * @returns {Promise<object|null>} A new subject object or null if validation fails.
 */
async function validirajIStvoriPredmet(modalContent, postojeciPodaci) {
  const nazivInput = modalContent.querySelector(".input-field input");
  const tipUcioniceInput = modalContent.querySelector(".autocomplete-input");
  const naziv = nazivInput.value.trim();
  const tipUcioniceNaziv = tipUcioniceInput.value.trim();

  if (!naziv) {
    displayError("Naziv predmeta ne može biti prazan.");
    return null;
  }

  if (provjeriDupliNaziv(naziv, postojeciPodaci, privremeniUnosi.predmeti)) {
    displayError("Predmet s tim nazivom već postoji.");
    return null;
  }

  let potrebanTipUcioniceId = null;
  if (tipUcioniceNaziv) {
    // For Predmeti, type MUST exist, so we only find, not create.
    // We need a specific helper to find existing ID without creation.
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
async function dodajNoviPredmet(modalContent) {
  try {
    const response = await fetch("predmeti.json");
    const text = await response.text();
    const predmeti = text ? JSON.parse(text) : [];

    const noviPrivremeniPredmet = await validirajIStvoriPredmet(
      modalContent,
      predmeti,
    );

    if (noviPrivremeniPredmet) {
      privremeniUnosi.predmeti.push(noviPrivremeniPredmet);
      prikaziPrivremeneUnosePredmeti("predmeti"); // New function to display temp subjects

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
async function spremiKorakPredmeti() {
  try {
    const response = await fetch("predmeti.json");
    const text = await response.text();
    let predmeti = text ? JSON.parse(text) : [];

    if (privremeniUnosi.predmeti.length === 0 && predmeti.length === 0) {
      displayError("Nema unesenih predmeta.");
      return { success: false, message: "Nema unesenih predmeta." };
    }

    if (privremeniUnosi.predmeti.length === 0) {
      return { success: true };
    }

    let kombiniraniPodaci = [...predmeti, ...privremeniUnosi.predmeti];

    kombiniraniPodaci.forEach((predmet, index) => {
      predmet.id = index + 1;
    });

    const result = await spremiJSON("predmeti.json", kombiniraniPodaci);

    if (result.success) {
      privremeniUnosi.predmeti = [];
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
async function urediPredmet(predmetId, noviPodaci) {
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
async function obrisiPredmet(predmetId) {
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
 * Renders the items from the temporary list into the display area in the modal.
 * @param {string} step The key for the privremeniUnosi object (e.g., 'predmeti').
 */
async function prikaziPrivremeneUnosePredmeti(step) {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  const response = await fetch("tipoviUcionica.json");
  const text = await response.text();
  const tipovi = text ? JSON.parse(text) : [];
  const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

  privremeniUnosi[step].forEach((item, index) => {
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
      privremeniUnosi[step].splice(index, 1);
      prikaziPrivremeneUnosePredmeti(step);
    };

    tag.appendChild(textSpan);
    tag.appendChild(deleteBtn);
    display.appendChild(tag);
  });
}

// --- PROFESORI SPECIFIC FUNCTIONS ---

/**
 * Renders the items from the temporary list into the display area in the modal.
 * @param {string} step The key for the privremeniUnosi object (e.g., 'profesori').
 * @param {Array} allSubjects - Array of all subjects to map subject IDs to names.
 */
async function prikaziPrivremeneUnoseProfesori(step, allSubjects) {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  const subjectMap = new Map(allSubjects.map((s) => [s.id, s.naziv]));

  // Fetch classrooms to get names for fixed_classroom_id
  const ucioniceResponse = await fetch("ucionice.json");
  const ucioniceText = await ucioniceResponse.text();
  const allUcionice = ucioniceText ? JSON.parse(ucioniceText) : [];
  const ucioniceMap = new Map(allUcionice.map((u) => [u.id, u.naziv]));

  // Helper to format unavailable times
  const formatirajNedostupnost = (nedostupanObjekt) => {
    if (Object.keys(nedostupanObjekt).length === 0) {
      return "";
    }

    const dayNamesShort = {
      1: "Pon",
      2: "Uto",
      3: "Sri",
      4: "Čet",
      5: "Pet",
    };

    let parts = [];
    for (const dayKey in nedostupanObjekt) {
      const day = parseInt(dayKey);
      const hours = nedostupanObjekt[dayKey];
      if (hours.length === 7) {
        // Assuming 7 hours for a full day
        parts.push(`${dayNamesShort[day]} (cijeli dan)`);
      } else if (hours.length > 0) {
        hours.sort((a, b) => a - b);
        let ranges = [];
        let start = hours[0];
        let end = hours[0];

        for (let i = 1; i < hours.length; i++) {
          if (hours[i] === end + 1) {
            end = hours[i];
          } else {
            ranges.push(start === end ? `${start}.` : `${start}.-${end}.`);
            start = hours[i];
            end = hours[i];
          }
        }
        ranges.push(start === end ? `${start}.` : `${start}.-${end}.`);

        parts.push(`${dayNamesShort[day]}: ${ranges.join(", ")} sat`);
      }
    }
    return `Nedostupan: ${parts.join("; ")}`;
  };

  privremeniUnosi[step].forEach((item, index) => {
    const tag = document.createElement("div");
    tag.classList.add("new-item-tag");

    const textSpan = document.createElement("span");
    const subjectNames = item.struka_predmeti_id
      .map((id) => subjectMap.get(id))
      .filter(Boolean)
      .join(", ");

    let teacherInfo = `${item.ime} ${item.prezime} (${subjectNames || "Nema predmeta"})`;

    if (item.fiksna_ucionica_id) {
      const ucionicaNaziv =
        ucioniceMap.get(item.fiksna_ucionica_id) ||
        `ID:${item.fiksna_ucionica_id}`;
      teacherInfo += `, Učionica: ${ucionicaNaziv}`;
    }

    const nedostupanString = formatirajNedostupnost(item.nedostupan);
    if (nedostupanString) {
      teacherInfo += `, ${nedostupanString}`;
    }

    textSpan.textContent = teacherInfo;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      privremeniUnosi[step].splice(index, 1);
      prikaziPrivremeneUnoseProfesori(step, allSubjects);
    };

    tag.appendChild(textSpan);
    tag.appendChild(deleteBtn);
    display.appendChild(tag);
  });
}

/**
 * Validates form data and creates a new teacher object.
 * @param {HTMLElement} modalContent - The content container of the modal's form.
 * @param {Array} allTeachers - Array of existing teachers from the JSON file.
 * @param {Array} allSubjects - Array of all subjects to get subject IDs.
 * @returns {Promise<object|null>} A new teacher object or null if validation fails.
 */
async function validirajIStvoriProfesora(
  modalContent,
  allTeachers,
  allSubjects,
) {
  const imeInput = modalContent.querySelector("div:nth-of-type(1) input"); // First simple input
  const prezimeInput = modalContent.querySelector("div:nth-of-type(2) input"); // Second simple input
  const ime = imeInput.value.trim();
  const prezime = prezimeInput.value.trim();
  const selectedSubjects = modalContent.selectedSubjectNames || []; // From multi-select autocomplete

  if (!ime || !prezime) {
    displayError("Ime i prezime profesora ne mogu biti prazni.");
    return null;
  }

  // No duplicate name check for teachers as per requirements

  const subjectMap = new Map(
    allSubjects.map((s) => [s.naziv.toLowerCase(), s.id]),
  );
  const strukaPredmetiId = selectedSubjects
    .map((name) => subjectMap.get(name.toLowerCase()))
    .filter(Boolean); // Filter out any subjects not found

  // Process unavailable times
  const unavailableTimesToggle = modalContent.querySelector(
    "#teacher-unavailable-toggle",
  );
  let nedostupanObjekt = {};
  if (
    unavailableTimesToggle &&
    unavailableTimesToggle.checked &&
    modalContent.currentUnavailableTimes
  ) {
    modalContent.currentUnavailableTimes.forEach((entry) => {
      let hours = [];
      if (entry.fullDay) {
        hours = Array.from({ length: 7 }, (_, i) => i + 1); // Hours 1 to 7
      } else {
        for (let i = entry.startHour; i <= entry.endHour; i++) {
          hours.push(i);
        }
      }
      nedostupanObjekt[entry.day.toString()] = hours;
    });
  }

  // Process fixed classroom
  const teacherFixedClassroomToggle = modalContent.querySelector(
    "#teacher-fixed-classroom-toggle",
  );
  let fiksnaUcionicaId = null;
  if (teacherFixedClassroomToggle && teacherFixedClassroomToggle.checked) {
    const fixedClassroomAutocompleteInput = modalContent.querySelector(
      ".fixed-classroom-section .autocomplete-input",
    );
    const fiksnaUcionicaNaziv = fixedClassroomAutocompleteInput.value.trim();

    if (fiksnaUcionicaNaziv) {
      const ucioniceResponse = await fetch("ucionice.json");
      const ucioniceText = await ucioniceResponse.text();
      let ucionice = ucioniceText ? JSON.parse(ucioniceText) : [];
      const postojecaUcionica = ucionice.find(
        (u) => u.naziv.toLowerCase() === fiksnaUcionicaNaziv.toLowerCase(),
      );

      if (postojecaUcionica) {
        fiksnaUcionicaId = postojecaUcionica.id;
      } else {
        displayError(
          "Odabrana fiksna učionica ne postoji. Odaberite s popisa.",
        );
        return null;
      }
    } else {
      displayError(
        "Ako je označeno, naziv fiksne učionice ne može biti prazan.",
      );
      return null;
    }
  }

  return {
    id: -1,
    ime: ime,
    prezime: prezime,
    struka_predmeti_id: strukaPredmetiId,
    nedostupan: nedostupanObjekt,
    fiksna_ucionica_id: fiksnaUcionicaId,
  };
}

/**
 * Handles "Spremi i dodaj novi" button click for teachers.
 * @param {HTMLElement} modalContent - The modal's form content element.
 */
async function dodajNovogProfesora(modalContent) {
  try {
    const response = await fetch("profesori.json");
    const text = await response.text();
    const allTeachers = text ? JSON.parse(text) : [];

    const subjectsResponse = await fetch("predmeti.json");
    const subjectsText = await subjectsResponse.text();
    const allSubjects = subjectsText ? JSON.parse(subjectsText) : [];

    const noviPrivremeniProfesor = await validirajIStvoriProfesora(
      modalContent,
      allTeachers,
      allSubjects,
    );

    if (noviPrivremeniProfesor) {
      privremeniUnosi.profesori.push(noviPrivremeniProfesor);
      prikaziPrivremeneUnoseProfesori("profesori", allSubjects);

      modalContent.querySelector("#teacher-ime").value = ""; // Clear ime
      modalContent.querySelector("#teacher-prezime").value = ""; // Clear prezime
      modalContent.querySelector(
        ".multi-select-autocomplete .autocomplete-input",
      ).value = ""; // Clear subject input
      modalContent.selectedSubjectNames = []; // Clear selected subjects
      modalContent.querySelector(".selected-tags-container").innerHTML = ""; // Clear tags display

      // Reset unavailable times UI
      const teacherUnavailableToggle = modalContent.querySelector(
        "#teacher-unavailable-toggle",
      );
      const unavailableTimesSection = modalContent.querySelector(
        ".unavailable-times-section",
      );
      const addedUnavailableTimesDisplay = modalContent.querySelector(
        ".added-unavailable-times-display",
      );

      if (teacherUnavailableToggle) teacherUnavailableToggle.checked = false;
      if (unavailableTimesSection)
        unavailableTimesSection.style.display = "none";
      if (addedUnavailableTimesDisplay)
        addedUnavailableTimesDisplay.innerHTML = "";
      modalContent.currentUnavailableTimes = []; // Clear internal array

      // Reset fixed classroom UI
      const teacherFixedClassroomToggle = modalContent.querySelector(
        "#teacher-fixed-classroom-toggle",
      );
      const fixedClassroomSection = modalContent.querySelector(
        ".fixed-classroom-section",
      );
      const fixedClassroomAutocompleteInput = modalContent.querySelector(
        ".fixed-classroom-section .autocomplete-input",
      );

      if (teacherFixedClassroomToggle)
        teacherFixedClassroomToggle.checked = false;
      if (fixedClassroomSection) fixedClassroomSection.style.display = "none";
      if (fixedClassroomAutocompleteInput)
        fixedClassroomAutocompleteInput.value = "";

      modalContent.querySelector("div:nth-of-type(1) input").focus();
    }
  } catch (error) {
    displayError("Greška pri provjeri podataka: " + error.message);
  }
}

/**
 * Handles the final "Spremi i zatvori" action for teachers.
 * @returns {Promise<object>} A result object { success: true/false }.
 */
async function spremiKorakProfesori() {
  try {
    const response = await fetch("profesori.json");
    const text = await response.text();
    let allTeachers = text ? JSON.parse(text) : [];

    if (privremeniUnosi.profesori.length === 0 && allTeachers.length === 0) {
      displayError("Nema unesenih profesora.");
      return { success: false, message: "Nema unesenih profesora." };
    }

    if (privremeniUnosi.profesori.length === 0) {
      return { success: true };
    }

    let kombiniraniPodaci = [...allTeachers, ...privremeniUnosi.profesori];

    kombiniraniPodaci.forEach((profesor, index) => {
      profesor.id = index + 1;
    });

    const result = await spremiJSON("profesori.json", kombiniraniPodaci);

    if (result.success) {
      privremeniUnosi.profesori = [];
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
 * Edits an existing teacher.
 * @param {number} teacherId - The ID of the teacher to edit.
 * @param {object} newTeacherData - An object with {ime, prezime, selectedSubjectNames}.
 * @param {Array} allSubjects - Array of all subjects to map subject names to IDs.
 * @returns {Promise<object>} A result object.
 */
async function urediProfesora(teacherId, newTeacherData, allSubjects) {
  try {
    const profesoriRes = await fetch("profesori.json");
    const profesoriText = await profesoriRes.text();
    let profesori = profesoriText ? JSON.parse(profesoriText) : [];

    const index = profesori.findIndex((p) => p.id === teacherId);
    if (index === -1) throw new Error("Profesor nije pronađen.");

    // Ensure there is at least one subject
    if (newTeacherData.selectedSubjectNames.length === 0) {
      throw new Error("Profesor mora imati barem jedan predmet.");
    }

    const subjectMap = new Map(
      allSubjects.map((s) => [s.naziv.toLowerCase(), s.id]),
    );
    const strukaPredmetiId = newTeacherData.selectedSubjectNames
      .map((name) => subjectMap.get(name.toLowerCase()))
      .filter(Boolean);

    profesori[index].ime = newTeacherData.ime;
    profesori[index].prezime = newTeacherData.prezime;
    profesori[index].struka_predmeti_id = strukaPredmetiId;
    profesori[index].nedostupan = newTeacherData.nedostupan || {};
    profesori[index].fiksna_ucionica_id = newTeacherData.fiksna_ucionica_id; // Save the fixed classroom ID

    const result = await spremiJSON("profesori.json", profesori);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError("Greška pri uređivanju: " + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Deletes a teacher after checking for dependencies.
 * @param {number} teacherId - The ID of the teacher to delete.
 * @returns {Promise<object>} A result object.
 */
async function obrisiProfesora(teacherId) {
  try {
    // Dependency Check: kurikulum.json (for assigned lessons)
    const kurikulumRes = await fetch("kurikulum.json");
    const kurikulumText = await kurikulumRes.text();
    const kurikulum = kurikulumText ? JSON.parse(kurikulumText) : [];

    const ovisnostKurikulum = kurikulum.find(
      (a) => a.profesor_id === teacherId,
    );
    if (ovisnostKurikulum) {
      throw new Error(
        `Nije moguće obrisati. Profesor je dodijeljen u kurikulumu.`,
      );
    }

    // Dependency Check: profesori.json (for fiksna_ucionica_id - though this is a self-reference,
    // it's checked when deleting a classroom, not a teacher) - No direct check needed here.

    const profesoriRes = await fetch("profesori.json");
    const profesoriText = await profesoriRes.text();
    let profesori = profesoriText ? JSON.parse(profesoriText) : [];

    const filtriraniProfesori = profesori.filter((p) => p.id !== teacherId);

    const result = await spremiJSON("profesori.json", filtriraniProfesori);
    if (!result.success) throw new Error(result.message);

    return { success: true };
  } catch (error) {
    displayError(error.message);
    return { success: false };
  }
}

// --- RAZREDI SPECIFIC FUNCTIONS ---

/**
 * Renders the temporary class sections into the display area.
 * @param {string} step - The key for privremeniUnosi ('razredi').
 */
function prikaziPrivremeneUnoseRazredi(step) {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  privremeniUnosi[step].forEach((item, index) => {
    const tag = document.createElement("div");
    tag.classList.add("new-item-tag");

    const textSpan = document.createElement("span");
    textSpan.textContent = `Odjeljenje: ${item.oznaka} (1-${item.godine}. godina)`;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      privremeniUnosi[step].splice(index, 1);
      prikaziPrivremeneUnoseRazredi(step);
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
async function dodajNovoOdjeljenje(modalContent) {
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
      privremeniUnosi.razredi.some(
        (r) => r.oznaka.toLowerCase() === oznaka.toLowerCase(),
      );

    if (vecPostoji) {
      return displayError(`Odjeljenje s oznakom "${oznaka}" već postoji.`);
    }

    privremeniUnosi.razredi.push({ oznaka, godine });
    prikaziPrivremeneUnoseRazredi("razredi");

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
async function spremiKorakRazredi() {
  try {
    const response = await fetch("razredi.json");
    const text = await response.text();
    let postojeciRazredi = text ? JSON.parse(text) : [];

    if (privremeniUnosi.razredi.length === 0 && postojeciRazredi.length === 0) {
      displayError("Nema unesenih razreda.");
      return { success: false, message: "Nema unesenih razreda." };
    }
    if (privremeniUnosi.razredi.length === 0) {
      return { success: true }; // Nothing new to save
    }

    const noviRazredi = [];
    privremeniUnosi.razredi.forEach((odjeljenje) => {
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
      privremeniUnosi.razredi = []; // Clear temporary entries on successful save
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
async function obrisiOdjeljenje(odjeljenjeOznaka) {
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
async function urediOdjeljenje(staraOznaka, novaOznaka, noveGodine) {
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
