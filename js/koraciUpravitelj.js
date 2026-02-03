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
async function prikaziPrivremeneUnose(step) {
  const display = document.querySelector(".new-items-display");
  display.innerHTML = "";

  // Fetch all types to map IDs to names
  const response = await fetch('tipoviUcionica.json');
  const text = await response.text();
  const tipovi = text ? JSON.parse(text) : [];
  const tipoviMapa = new Map(tipovi.map(t => [t.id, t.naziv]));

  privremeniUnosi[step].forEach((item, index) => {
    const tag = document.createElement("div");
    tag.classList.add("new-item-tag");
    
    const textSpan = document.createElement("span");
    const nazivTipa = item.tipovi_id.length > 0 ? tipoviMapa.get(item.tipovi_id[0]) : '';
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
 * Finds the ID of a classroom type by its name. If it doesn't exist, it creates it.
 * @param {string} nazivTipa - The name of the type to find or create.
 * @returns {Promise<number|null>} The ID of the type, or null if input was empty.
 */
async function pronadjiIliStvoriTipId(nazivTipa) {
    if (!nazivTipa) return null;

    const response = await fetch('tipoviUcionica.json');
    const text = await response.text();
    let tipovi = text ? JSON.parse(text) : [];

    const postojeciTip = tipovi.find(t => t.naziv.toLowerCase() === nazivTipa.toLowerCase());

    if (postojeciTip) {
        return postojeciTip.id;
    } else {
        const noviId = tipovi.length > 0 ? Math.max(...tipovi.map(t => t.id)) + 1 : 1;
        const noviTip = { id: noviId, naziv: nazivTipa };
        tipovi.push(noviTip);
        
        await spremiJSON('tipoviUcionica.json', tipovi);
        return noviId;
    }
}


/**
 * Validates form data and creates a new classroom object.
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

  const sviNazivi = [
    ...postojeciPodaci.map(u => u.naziv.toLowerCase()),
    ...privremeniUnosi.ucionice.map(u => u.naziv.toLowerCase())
  ];
  if (sviNazivi.includes(naziv.toLowerCase())) {
    displayError("Učionica s tim nazivom već postoji.");
    return null;
  }
  
  const tipId = await pronadjiIliStvoriTipId(nazivTipa);

  return {
    id: -1,
    naziv: naziv,
    tipovi_id: tipId ? [tipId] : [], // Use new property
    prioritet: 0,
  };
}

/**
 * Handles "Spremi i dodaj novi" button click.
 * @param {HTMLElement} modalContent - The modal's form content element.
 */
async function dodajNovuUcionicu(modalContent) {
  try {
    const response = await fetch('ucionice.json');
    const text = await response.text();
    const ucionice = text ? JSON.parse(text) : [];

    const novaPrivremenaUcionica = await validirajIStvoriUcionicu(modalContent, ucionice);

    if (novaPrivremenaUcionica) {
      privremeniUnosi.ucionice.push(novaPrivremenaUcionica);
      prikaziPrivremeneUnose('ucionice');

      const noviTipNaziv = modalContent.querySelector(".autocomplete-input").value.trim();
      const suggestions = modalContent.suggestionsReference;
      if (noviTipNaziv && !suggestions.some(s => s.toLowerCase() === noviTipNaziv.toLowerCase())) {
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
 * Handles the final "Spremi i zatvori" action.
 * @returns {Promise<object>} A result object { success: true/false }.
 */
async function spremiKorakUcionice() {
  try {
    const response = await fetch('ucionice.json');
    const text = await response.text();
    let ucionice = text ? JSON.parse(text) : [];

    let kombiniraniPodaci = [...ucionice, ...privremeniUnosi.ucionice];

    kombiniraniPodaci.forEach((ucionica, index) => {
      ucionica.id = index + 1;
    });

    const result = await spremiJSON('ucionice.json', kombiniraniPodaci);

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

/**
 * Edits an existing classroom.
 * @param {number} ucionicaId - The ID of the classroom to edit.
 * @param {object} noviPodaci - An object with {naziv, nazivTipa}.
 * @returns {Promise<object>} A result object.
 */
async function urediUcionicu(ucionicaId, noviPodaci) {
    try {
        const ucioniceRes = await fetch('ucionice.json');
        const ucioniceText = await ucioniceRes.text();
        let ucionice = ucioniceText ? JSON.parse(ucioniceText) : [];

        const index = ucionice.findIndex(u => u.id === ucionicaId);
        if (index === -1) throw new Error("Učionica nije pronađena.");

        const tipId = await pronadjiIliStvoriTipId(noviPodaci.nazivTipa);

        ucionice[index].naziv = noviPodaci.naziv;
        ucionice[index].tipovi_id = tipId ? [tipId] : [];

        const result = await spremiJSON('ucionice.json', ucionice);
        if (!result.success) throw new Error(result.message);

        return { success: true };
    } catch (error) {
        displayError("Greška pri uređivanju: " + error.message);
        return { success: false };
    }
}

/**
 * Deletes a classroom after checking for dependencies.
 * @param {number} ucionicaId - The ID of the classroom to delete.
 * @returns {Promise<object>} A result object.
 */
async function obrisiUcionicu(ucionicaId) {
    try {
        // 1. Dependency Check
        const profesoriRes = await fetch('profesori.json');
        const profesoriText = await profesoriRes.text();
        const profesori = profesoriText ? JSON.parse(profesoriText) : [];

        const ovisnost = profesori.find(p => p.fiksna_ucionica_id === ucionicaId);
        if (ovisnost) {
            throw new Error(`Nije moguće obrisati. Učionica je dodijeljena profesoru ${ovisnost.ime} ${ovisnost.prezime}.`);
        }

        // 2. Deletion
        const ucioniceRes = await fetch('ucionice.json');
        const ucioniceText = await ucioniceRes.text();
        let ucionice = ucioniceText ? JSON.parse(ucioniceText) : [];

        const filtriraneUcionice = ucionice.filter(u => u.id !== ucionicaId);

        // 3. Save
        const result = await spremiJSON('ucionice.json', filtriraneUcionice);
        if (!result.success) throw new Error(result.message);

        return { success: true };
    } catch (error) {
        displayError(error.message);
        return { success: false };
    }
}
