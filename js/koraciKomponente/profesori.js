import {
  displayError,
  createSimpleInput,
  createMultiSelectAutocompleteInput,
  createStrictAutocompleteInput,
  initializeMultiSelectAutocomplete,
  initializeAutocomplete,
} from "../korakProzor.js";
import { spremiJSON } from "../spremiJSON.js";
import { dohvatiPrijedloge } from "../upraviteljPrijedloga.js";

// No provjeriDupliNaziv for teachers as per requirements
// No pronadjiIliStvoriId for teachers directly, it uses ucionice.json for fixed classroom

let privremeniUnosiProfesori = []; // Dedicated temporary storage for teachers

/**
 * Renders the items from the temporary list into the display area in the modal.
 * @param {Array} allSubjects - Array of all subjects to map subject IDs to names.
 */
export async function prikaziPrivremeneUnoseProfesori(allSubjects) {
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

  privremeniUnosiProfesori.forEach((item, index) => {
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
      privremeniUnosiProfesori.splice(index, 1);
      prikaziPrivremeneUnoseProfesori(allSubjects);
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
export async function validirajIStvoriProfesora(
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

  const subjectMap = new Map(
    allSubjects.map((s) => [s.naziv.toLowerCase(), s.id]),
  );
  const strukaPredmetiId = selectedSubjects
    .map((name) => subjectMap.get(name.toLowerCase()))
    .filter(Boolean); // Filter out any subjects not found

  if (strukaPredmetiId.length === 0) {
    displayError("Profesor mora predavati barem jedan predmet.");
    return null;
  }


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
export async function dodajNovogProfesora(modalContent) {
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
      privremeniUnosiProfesori.push(noviPrivremeniProfesor);
      prikaziPrivremeneUnoseProfesori(allSubjects);

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
export async function spremiKorakProfesori() {
  try {
    const response = await fetch("profesori.json");
    const text = await response.text();
    let allTeachers = text ? JSON.parse(text) : [];

    if (privremeniUnosiProfesori.length === 0 && allTeachers.length === 0) {
      displayError("Nema unesenih profesora.");
      return { success: false, message: "Nema unesenih profesora." };
    }

    if (privremeniUnosiProfesori.length === 0) {
      return { success: true };
    }

    let kombiniraniPodaci = [...allTeachers, ...privremeniUnosiProfesori];

    kombiniraniPodaci.forEach((profesor, index) => {
      profesor.id = index + 1;
    });

    const result = await spremiJSON("profesori.json", kombiniraniPodaci);

    if (result.success) {
      privremeniUnosiProfesori = [];
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
export async function urediProfesora(teacherId, newTeacherData, allSubjects) {
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
export async function obrisiProfesora(teacherId) {
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

/**
 * Builds and displays the form for the "Profesori" (Teachers) step.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
export async function prikaziKorakProfesori(modalBody) {
    const formContainer = modalBody.querySelector('.modal-form-container .modal-content');
    const existingItemsContainer = modalBody.querySelector('.existing-items-container');

    // --- Left Column: Form ---
    let prijedloziPredmeta = await dohvatiPrijedloge('predmeti.json', (item) => item.naziv);

    const imeInputHtml = createSimpleInput("Ime profesora:", "Npr. Ivan", "teacher-ime");
    const prezimeInputHtml = createSimpleInput("Prezime profesora:", "Npr. Horvat", "teacher-prezime");
    const strukaInputHtml = createMultiSelectAutocompleteInput(
        "Predaje predmete:",
        "Npr. Matematika, Fizika..."
    );

    // Unavailable Times Section HTML
    const unavailableHtml = `
        <div class="input-field checkbox-field">
            <label for="teacher-unavailable-toggle" class="field-label">Profesor ima definirane nedostupnosti</label>
            <input type="checkbox" id="teacher-unavailable-toggle" class="custom-checkbox">
        </div>
        <div class="unavailable-times-section" style="display: none;">
            <div class="unavailable-input-row">
                <div class="select-wrapper">
                    <label for="unavailable-day" class="field-label">Dan:</label>
                    <select id="unavailable-day">
                        <option value="1">Ponedjeljak</option>
                        <option value="2">Utorak</option>
                        <option value="3">Srijeda</option>
                        <option value="4">Četvrtak</option>
                        <option value="5">Petak</option>
                    </select>
                </div>
                <div class="input-field checkbox-field">
                    <label for="full-day-unavailable" class="field-label">Cijeli dan nedostupan</label>
                    <input type="checkbox" id="full-day-unavailable" class="custom-checkbox">
                </div>
                <div class="unavailable-hour-controls">
                    <div class="select-wrapper">
                        <label for="unavailable-start-hour" class="field-label">Početni sat:</label>
                        <select id="unavailable-start-hour">
                            ${Array.from({ length: 7 }, (_, i) => `<option value="${i + 1}">${i + 1}. sat</option>`).join('')}
                        </select>
                    </div>
                    <div class="select-wrapper">
                        <label for="unavailable-end-hour" class="field-label">Krajnji sat:</label>
                        <select id="unavailable-end-hour">
                            ${Array.from({ length: 7 }, (_, i) => `<option value="${i + 1}">${i + 1}. sat</option>`).join('')}
                        </select>
                    </div>
                    <button class="button add-unavailable-time-btn">+</button>
                </div>
            </div>
            <div class="added-unavailable-times-display"></div>
        </div>
    `;

    const fixedClassroomHtml = `
        <div class="input-field checkbox-field">
            <label for="teacher-fixed-classroom-toggle" class="field-label">Profesor ima fiksnu učionicu</label>
            <input type="checkbox" id="teacher-fixed-classroom-toggle" class="custom-checkbox">
        </div>
        <div class="fixed-classroom-section" style="display: none;">
            ${createStrictAutocompleteInput("Fiksna učionica:", "Npr. U-15, Laboratorij za kemiju...")}
        </div>
    `;

    // Set innerHTML only once with all generated HTML
    formContainer.innerHTML = imeInputHtml + prezimeInputHtml + strukaInputHtml + unavailableHtml + fixedClassroomHtml;

    // --- Query elements AFTER innerHTML is set ---
    const strukaAutocompleteInput = formContainer.querySelector(".multi-select-autocomplete .autocomplete-input");
    const selectedTagsContainer = formContainer.querySelector(".selected-tags-container");
    const suggestionsListElement = formContainer.querySelector(".multi-select-autocomplete .suggestions-list");

    const teacherUnavailableToggle = formContainer.querySelector('#teacher-unavailable-toggle');
    const unavailableTimesSection = formContainer.querySelector('.unavailable-times-section');
    const fullDayUnavailableCheckbox = formContainer.querySelector('#full-day-unavailable');
    const startHourSelect = formContainer.querySelector('#unavailable-start-hour');
    const endHourSelect = formContainer.querySelector('#unavailable-end-hour');
    const addUnavailableTimeBtn = formContainer.querySelector('.add-unavailable-time-btn');
    const addedUnavailableTimesDisplay = formContainer.querySelector('.added-unavailable-times-display');
    const unavailableDaySelect = formContainer.querySelector('#unavailable-day');

    const teacherFixedClassroomToggle = formContainer.querySelector('#teacher-fixed-classroom-toggle');
    const fixedClassroomSection = formContainer.querySelector('.fixed-classroom-section');
    const fixedClassroomAutocompleteInput = fixedClassroomSection.querySelector('.autocomplete-input');

    // Fetch classroom suggestions for strict autocomplete
    let prijedloziUcionica = await dohvatiPrijedloge('ucionice.json', (item) => item.naziv);
    initializeAutocomplete(fixedClassroomAutocompleteInput, prijedloziUcionica, true); // Strict mode!

    const dayNames = {
        1: "Ponedjeljak", 2: "Utorak", 3: "Srijeda", 4: "Četvrtak", 5: "Petak"
    };

    // Initialize an array to hold selected subject names for the current form instance
    formContainer.selectedSubjectNames = [];

    const multiSelectFunctions = initializeMultiSelectAutocomplete(
        strukaAutocompleteInput,
        prijedloziPredmeta,
        selectedTagsContainer,
        (itemText) => {
            if (!formContainer.selectedSubjectNames.includes(itemText)) {
                formContainer.selectedSubjectNames.push(itemText);
                multiSelectFunctions.renderSelectedTags(formContainer.selectedSubjectNames);
            }
        },
        (itemText) => {
            formContainer.selectedSubjectNames = formContainer.selectedSubjectNames.filter(name => name !== itemText);
            multiSelectFunctions.renderSelectedTags(formContainer.selectedSubjectNames);
        },
        suggestionsListElement // Explicitly pass the suggestions list element
    );

    // Initialize current unavailable times array for this form instance
    formContainer.currentUnavailableTimes = [];

    // Helper to render currentUnavailableTimes
    const renderUnavailableTimes = () => {
        addedUnavailableTimesDisplay.innerHTML = '';
        formContainer.currentUnavailableTimes.forEach((entry, index) => {
            const timeTag = document.createElement('div');
            timeTag.classList.add('new-item-tag'); // Reuse existing style

            let text = `${dayNames[entry.day]}: `;
            if (entry.fullDay) {
                text += 'Cijeli dan';
            } else {
                text += `${entry.startHour}.-${entry.endHour}. sat`;
            }
            timeTag.textContent = text;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'X';
            removeBtn.classList.add('delete-temp-item-btn'); // Reuse existing style
            removeBtn.onclick = () => {
                formContainer.currentUnavailableTimes.splice(index, 1);
                renderUnavailableTimes();
            };

            timeTag.appendChild(removeBtn);
            addedUnavailableTimesDisplay.appendChild(timeTag);
        });
    };

    // Event listeners
    teacherUnavailableToggle.addEventListener('change', () => {
        unavailableTimesSection.style.display = teacherUnavailableToggle.checked ? 'block' : 'none';
    });

    teacherFixedClassroomToggle.addEventListener('change', () => {
        fixedClassroomSection.style.display = teacherFixedClassroomToggle.checked ? 'block' : 'none';
    });

    fullDayUnavailableCheckbox.addEventListener('change', () => {
        const isDisabled = fullDayUnavailableCheckbox.checked;
        startHourSelect.disabled = isDisabled;
        endHourSelect.disabled = isDisabled;
    });

    addUnavailableTimeBtn.addEventListener('click', () => {
        const day = parseInt(unavailableDaySelect.value);
        const fullDay = fullDayUnavailableCheckbox.checked;
        let startHour = null;
        let endHour = null;

        if (!fullDay) {
            startHour = parseInt(startHourSelect.value);
            endHour = parseInt(endHourSelect.value);

            if (isNaN(startHour) || isNaN(endHour) || startHour > endHour) {
                displayError("Početni sat mora biti manji ili jednak krajnjem satu.");
                return;
            }
        }
        
        // Check for existing entry for the same day (since only one continuous range is allowed for MVP)
        const existingEntryIndex = formContainer.currentUnavailableTimes.findIndex(e => e.day === day);
        if (existingEntryIndex !== -1) {
             displayError(`Nedostupnost za ${dayNames[day]} već postoji. Prvo je obrišite pa dodajte novu.`);
             return;
        }

        formContainer.currentUnavailableTimes.push({ day, fullDay, startHour, endHour });
        renderUnavailableTimes();
        // Reset inputs to default after adding
        unavailableDaySelect.value = "1";
        fullDayUnavailableCheckbox.checked = false;
        startHourSelect.disabled = false;
        endHourSelect.disabled = false;
        startHourSelect.value = "1";
        endHourSelect.value = "7";
    });

    // --- Right Column: Existing Items ---
    prikaziPostojeceProfesore(existingItemsContainer);
}

/**
 * Fetches teachers and subjects, then renders them into the container.
 * @param {HTMLElement} container - The HTML element to populate.
 */
export async function prikaziPostojeceProfesore(container) {
    container.innerHTML = 'Učitavanje...';

    try {
        const [profesoriRes, predmetiRes, ucioniceRes] = await Promise.all([
            fetch('profesori.json'),
            fetch('predmeti.json'),
            fetch('ucionice.json')
        ]);

        const profesori = await (profesoriRes.text().then(text => text ? JSON.parse(text) : []));
        const predmeti = await (predmetiRes.text().then(text => text ? JSON.parse(text) : []));
        const ucionice = await (ucioniceRes.text().then(text => text ? JSON.parse(text) : []));
        
        if (profesori.length === 0) {
            container.innerHTML = 'Nema unesenih profesora.';
            return;
        }

        const predmetiMapa = new Map(predmeti.map(p => [p.id, p.naziv]));
        const ucioniceMapa = new Map(ucionice.map(u => [u.id, u.naziv]));
        
        container.innerHTML = ""; // Clear loading message

        profesori.forEach(profesor => {
            const card = document.createElement('div');
            card.className = 'existing-item-card profesor-card';
            card.dataset.id = profesor.id;

            renderProfessorDisplayMode(card, profesor, predmetiMapa, ucioniceMapa);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error(`Greška pri prikazivanju postojećih profesora:`, error);
        container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
    }
}

/** Renders the default display view of a teacher card */
function renderProfessorDisplayMode(card, profesor, predmetiMapa, ucioniceMapa) {
    const subjectNames = profesor.struka_predmeti_id
        .map(id => predmetiMapa.get(id))
        .filter(Boolean)
        .join(', ') || 'Nema predmeta';

    const dayNames = {
        1: "Ponedjeljak", 2: "Utorak", 3: "Srijeda", 4: "Četvrtak", 5: "Petak"
    };
    
    let fixedClassroomHtml = '';
    if (profesor.fiksna_ucionica_id) {
        const classroomName = ucioniceMapa.get(profesor.fiksna_ucionica_id) || 'Nepoznata učionica';
        fixedClassroomHtml = `<div class="tip">Fiksna učionica: ${classroomName}</div>`;
    }

    let unavailableHtml = '';
    if (profesor.nedostupan && Object.keys(profesor.nedostupan).length > 0) {
        unavailableHtml += '<div class="unavailable-display-section"><span class="field-label">Nedostupan:</span><ul>';
        for (const dayNum in profesor.nedostupan) {
            const hours = profesor.nedostupan[dayNum];
            let hoursText;
            if (hours.length === 7 && hours.every((val, i) => val === i + 1)) { // Check if it's 1-7
                hoursText = 'Cijeli dan';
            } else {
                // Assuming continuous ranges from the MVP decision
                hoursText = `${Math.min(...hours)}.-${Math.max(...hours)}. sat`;
            }
            unavailableHtml += `<li>${dayNames[dayNum]}: ${hoursText}</li>`;
        }
        unavailableHtml += '</ul></div>';
    }

    card.innerHTML = `
        <div class="card-content">
            <div class="naziv">${profesor.ime} ${profesor.prezime}</div>
            <div class="tip">Predaje: ${subjectNames}</div>
            ${fixedClassroomHtml}
            ${unavailableHtml}
        </div>
        <div class="card-actions">
            <img src="assets/edit.png" alt="Uredi" class="edit-btn">
            <img src="assets/delete.png" alt="Obriši" class="delete-btn">
        </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => renderProfessorEditMode(card, profesor, predmetiMapa, ucioniceMapa));
    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Jeste li sigurni da želite obrisati profesora "${profesor.ime} ${profesor.prezime}"?`)) {
            const result = await obrisiProfesora(profesor.id);
            if (result.success) {
                prikaziPostojeceProfesore(card.parentElement); // Re-render the whole list
            }
        }
    });
}

/** Renders the editing view of a teacher card */
async function renderProfessorEditMode(card, profesor, predmetiMapa, ucioniceMapa) {
    card.classList.add('edit-mode');

    // Fetch all subjects and classrooms for suggestions
    const [predmetiRes, ucioniceRes] = await Promise.all([
        fetch('predmeti.json'),
        fetch('ucionice.json')
    ]);
    const predmetiData = await predmetiRes.text().then(text => text ? JSON.parse(text) : []);
    const ucioniceData = await ucioniceRes.text().then(text => text ? JSON.parse(text) : []);
    const prijedloziPredmeta = predmetiData.map(p => p.naziv);
    const prijedloziUcionica = ucioniceData.map(u => u.naziv);

    // Get current data for the teacher
    const currentSubjectNames = profesor.struka_predmeti_id
        .map(id => predmetiMapa.get(id))
        .filter(Boolean);
    
    const currentFixedClassroomName = profesor.fiksna_ucionica_id 
        ? ucioniceMapa.get(profesor.fiksna_ucionica_id) 
        : "";

    // Prepare initial currentUnavailableTimes from profesor.nedostupan
    const initialUnavailableTimes = [];
    for (const dayNumStr in profesor.nedostupan) {
        const dayNum = parseInt(dayNumStr);
        const hours = profesor.nedostupan[dayNumStr];
        let fullDay = false;
        let startHour = 1;
        let endHour = 7;

        if (hours.length === 7 && hours.every((val, i) => val === i + 1)) {
            fullDay = true;
        } else if (hours.length > 0) {
            startHour = Math.min(...hours);
            endHour = Math.max(...hours);
        }
        initialUnavailableTimes.push({ day: dayNum, fullDay, startHour, endHour });
    }
    
    // Day names for display
    const dayNames = {
        1: "Ponedjeljak", 2: "Utorak", 3: "Srijeda", 4: "Četvrtak", 5: "Petak"
    };

    // Generate HTML, including the new fixed classroom section
    card.innerHTML = `
        <div class="card-edit-form">
            <input type="text" class="edit-ime" value="${profesor.ime}">
            <input type="text" class="edit-prezime" value="${profesor.prezime}">
            
            <div class="autocomplete-field multi-select-autocomplete">
                <span class="field-label">Predaje predmete:</span>
                <div class="autocomplete-wrapper">
                    <input type="text" class="autocomplete-input edit-struka" placeholder="Npr. Matematika, Fizika..." autocomplete="off">
                    <div class="suggestions-list" style="display: none;"></div>
                </div>
                <div class="selected-tags-container"></div>
            </div>

            <div class="input-field checkbox-field">
                <label for="teacher-unavailable-toggle-edit" class="field-label">Profesor ima definirane nedostupnosti</label>
                <input type="checkbox" id="teacher-unavailable-toggle-edit" class="custom-checkbox" ${Object.keys(profesor.nedostupan).length > 0 ? 'checked' : ''}>
            </div>
            <div class="unavailable-times-section" style="display: ${Object.keys(profesor.nedostupan).length > 0 ? 'block' : 'none'};">
                <!-- Unavailability editor content -->
                <div class="unavailable-input-row">
                    <div class="select-wrapper">
                        <label for="unavailable-day-edit" class="field-label">Dan:</label>
                        <select id="unavailable-day-edit">
                            <option value="1">Ponedjeljak</option>
                            <option value="2">Utorak</option>
                            <option value="3">Srijeda</option>
                            <option value="4">Četvrtak</option>
                            <option value="5">Petak</option>
                        </select>
                    </div>
                    <div class="input-field checkbox-field">
                        <label for="full-day-unavailable-edit" class="field-label">Cijeli dan nedostupan</label>
                        <input type="checkbox" id="full-day-unavailable-edit" class="custom-checkbox">
                    </div>
                    <div class="unavailable-hour-controls">
                        <div class="select-wrapper">
                            <label for="unavailable-start-hour-edit" class="field-label">Početni sat:</label>
                            <select id="unavailable-start-hour-edit">
                                ${Array.from({ length: 7 }, (_, i) => `<option value="${i + 1}">${i + 1}. sat</option>`).join('')}
                            </select>
                        </div>
                        <div class="select-wrapper">
                            <label for="unavailable-end-hour-edit" class="field-label">Krajnji sat:</label>
                            <select id="unavailable-end-hour-edit">
                                ${Array.from({ length: 7 }, (_, i) => `<option value="${i + 1}">${i + 1}. sat</option>`).join('')}
                            </select>
                        </div>
                        <button class="button add-unavailable-time-btn">+</button>
                    </div>
                </div>
                <div class="added-unavailable-times-display"></div>
            </div>

            <div class="input-field checkbox-field">
                <label for="teacher-fixed-classroom-toggle-edit" class="field-label">Profesor ima fiksnu učionicu</label>
                <input type="checkbox" id="teacher-fixed-classroom-toggle-edit" class="custom-checkbox" ${profesor.fiksna_ucionica_id ? 'checked' : ''}>
            </div>
            <div class="fixed-classroom-section" style="display: ${profesor.fiksna_ucionica_id ? 'block' : 'none'};">
                <div class="autocomplete-wrapper">
                     <input type="text" class="autocomplete-input edit-fixed-classroom" value="${currentFixedClassroomName}" placeholder="Npr. U-15..." autocomplete="off">
                     <div class="suggestions-list" style="display: none;"></div>
                </div>
            </div>
        </div>
        <div class="card-actions">
            <img src="assets/save.svg" alt="Spremi" class="save-edit-btn">
            <button class="cancel-edit-btn delete-temp-item-btn">X</button>
        </div>
    `;

    // Initialize multi-select for subjects
    const strukaAutocompleteInput = card.querySelector('.edit-struka');
    const selectedTagsContainer = card.querySelector('.selected-tags-container');
    const suggestionsListElementEdit = card.querySelector('.multi-select-autocomplete .suggestions-list');
    const selectedSubjectNames = [...currentSubjectNames];
    
    const multiSelectFunctions = initializeMultiSelectAutocomplete(
        strukaAutocompleteInput,
        prijedloziPredmeta,
        selectedTagsContainer,
        (itemText) => {
            if (!selectedSubjectNames.includes(itemText)) {
                selectedSubjectNames.push(itemText);
                multiSelectFunctions.renderSelectedTags(selectedSubjectNames);
            }
        },
        (itemText) => {
            selectedSubjectNames.splice(selectedSubjectNames.indexOf(itemText), 1);
            multiSelectFunctions.renderSelectedTags(selectedSubjectNames);
        },
        suggestionsListElementEdit
    );
    multiSelectFunctions.renderSelectedTags(selectedSubjectNames);

    // Initialize strict autocomplete for fixed classroom
    const fixedClassroomToggle = card.querySelector('#teacher-fixed-classroom-toggle-edit');
    const fixedClassroomSection = card.querySelector('.fixed-classroom-section');
    const fixedClassroomInput = card.querySelector('.edit-fixed-classroom');
    const fixedClassroomSuggestions = fixedClassroomSection.querySelector('.suggestions-list');
    
    fixedClassroomToggle.addEventListener('change', () => {
        fixedClassroomSection.style.display = fixedClassroomToggle.checked ? 'block' : 'none';
    });
    initializeAutocomplete(fixedClassroomInput, prijedloziUcionica, true, fixedClassroomSuggestions);

    // Unavailability logic
    const teacherUnavailableToggleEdit = card.querySelector('#teacher-unavailable-toggle-edit');
    const unavailableTimesSectionEdit = card.querySelector('.unavailable-times-section');
    const fullDayUnavailableCheckboxEdit = card.querySelector('#full-day-unavailable-edit');
    const startHourSelectEdit = card.querySelector('#unavailable-start-hour-edit');
    const endHourSelectEdit = card.querySelector('#unavailable-end-hour-edit');
    const addUnavailableTimeBtnEdit = card.querySelector('.add-unavailable-time-btn');
    const addedUnavailableTimesDisplayEdit = card.querySelector('.added-unavailable-times-display');
    const unavailableDaySelectEdit = card.querySelector('#unavailable-day-edit');
    const currentUnavailableTimes = [...initialUnavailableTimes];

    const renderUnavailableTimesEdit = () => {
        addedUnavailableTimesDisplayEdit.innerHTML = '';
        currentUnavailableTimes.forEach((entry, index) => {
            const timeTag = document.createElement('div');
            timeTag.classList.add('new-item-tag');

            let text = `${dayNames[entry.day]}: `;
            if (entry.fullDay) {
                text += 'Cijeli dan';
            } else {
                text += `${entry.startHour}.-${entry.endHour}. sat`;
            }
            timeTag.textContent = text;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'X';
            removeBtn.classList.add('delete-temp-item-btn');
            removeBtn.onclick = () => {
                currentUnavailableTimes.splice(index, 1);
                renderUnavailableTimesEdit();
            };

            timeTag.appendChild(removeBtn);
            addedUnavailableTimesDisplayEdit.appendChild(timeTag);
        });
    };
    renderUnavailableTimesEdit();

    teacherUnavailableToggleEdit.addEventListener('change', () => {
        unavailableTimesSectionEdit.style.display = teacherUnavailableToggleEdit.checked ? 'block' : 'none';
    });

    fullDayUnavailableCheckboxEdit.addEventListener('change', () => {
        const isDisabled = fullDayUnavailableCheckboxEdit.checked;
        startHourSelectEdit.disabled = isDisabled;
        endHourSelectEdit.disabled = isDisabled;
    });

    addUnavailableTimeBtnEdit.addEventListener('click', () => {
        const day = parseInt(unavailableDaySelectEdit.value);
        const fullDay = fullDayUnavailableCheckboxEdit.checked;
        let startHour = null;
        let endHour = null;

        if (!fullDay) {
            startHour = parseInt(startHourSelectEdit.value);
            endHour = parseInt(endHourSelectEdit.value);
            if (isNaN(startHour) || isNaN(endHour) || startHour > endHour) {
                return displayError("Početni sat mora biti manji ili jednak krajnjem satu.");
            }
        }
        
        const existingEntryIndex = currentUnavailableTimes.findIndex(e => e.day === day);
        if (existingEntryIndex !== -1) {
             return displayError(`Nedostupnost za ${dayNames[day]} već postoji. Prvo je obrišite pa dodajte novu.`);
        }

        currentUnavailableTimes.push({ day, fullDay, startHour, endHour });
        renderUnavailableTimesEdit();
    });

    // Save and Cancel button logic
    card.querySelector('.save-edit-btn').addEventListener('click', async () => {
        const novoIme = card.querySelector('.edit-ime').value.trim();
        const novoPrezime = card.querySelector('.edit-prezime').value.trim();

        if (!novoIme || !novoPrezime) {
            return displayError("Ime i prezime ne mogu biti prazni.");
        }
        if (selectedSubjectNames.length === 0) {
            return displayError("Profesor mora predavati barem jedan predmet.");
        }

        let updatedNedostupan = {};
        if (teacherUnavailableToggleEdit.checked && currentUnavailableTimes.length > 0) {
            currentUnavailableTimes.forEach(entry => {
                let hours = [];
                if (entry.fullDay) {
                    hours = Array.from({ length: 7 }, (_, i) => i + 1);
                } else {
                    for (let i = entry.startHour; i <= entry.endHour; i++) {
                        hours.push(i);
                    }
                }
                updatedNedostupan[entry.day.toString()] = hours;
            });
        }
        
        let fiksnaUcionicaId = null;
        if (fixedClassroomToggle.checked) {
            const classroomName = fixedClassroomInput.value.trim();
            if (classroomName) {
                const foundClassroom = ucioniceData.find(u => u.naziv.toLowerCase() === classroomName.toLowerCase());
                if (foundClassroom) {
                    fiksnaUcionicaId = foundClassroom.id;
                } else {
                    return displayError("Odabrana fiksna učionica ne postoji.");
                }
            }
        }

        const result = await urediProfesora(profesor.id, {
            ime: novoIme,
            prezime: novoPrezime,
            selectedSubjectNames: selectedSubjectNames,
            nedostupan: updatedNedostupan,
            fiksna_ucionica_id: fiksnaUcionicaId
        }, predmetiData);

        if (result.success) {
            prikaziPostojeceProfesore(card.parentElement);
        }
    });

    card.querySelector('.cancel-edit-btn').addEventListener('click', () => {
        card.classList.remove('edit-mode');
        renderProfessorDisplayMode(card, profesor, predmetiMapa, ucioniceMapa);
    });
}