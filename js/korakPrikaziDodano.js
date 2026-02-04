// This file manages displaying existing data in the right-hand column of the modal.

/**
 * Fetches both classrooms and their types, then renders them into the container.
 * @param {HTMLElement} container - The HTML element to populate (e.g., .existing-items-container).
 */
async function prikaziPostojeceUcionice(container) {
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

      renderDisplayMode(card, ucionica, tipoviMapa);
      container.appendChild(card);
    });
  } catch (error) {
    console.error(`Greška pri prikazivanju postojećih učionica:`, error);
    container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
  }
}

/** Renders the default display view of a classroom card */
function renderDisplayMode(card, ucionica, tipoviMapa) {
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
      renderEditMode(card, ucionica, tipoviMapa),
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
function renderEditMode(card, ucionica, tipoviMapa) {
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
    renderDisplayMode(card, ucionica, tipoviMapa);
  });
}


// --- PREDMETI SPECIFIC FUNCTIONS ---

/**
 * Fetches subjects and their required classroom types, then renders them.
 * @param {HTMLElement} container - The HTML element to populate.
 */
async function prikaziPostojecePredmete(container) {
    container.innerHTML = 'Učitavanje...';

    try {
        const [predmetiRes, tipoviRes] = await Promise.all([
            fetch('predmeti.json'),
            fetch('tipoviUcionica.json')
        ]);

        const predmeti = await (predmetiRes.text().then(text => text ? JSON.parse(text) : []));
        const tipovi = await (tipoviRes.text().then(text => text ? JSON.parse(text) : []));
        
        if (predmeti.length === 0) {
            container.innerHTML = 'Nema unesenih predmeta.';
            return;
        }

        const tipoviMapa = new Map(tipovi.map(t => [t.id, t.naziv]));
        
        container.innerHTML = ""; // Clear loading message

        predmeti.forEach(predmet => {
            const card = document.createElement('div');
            card.className = 'existing-item-card predmet-card';
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
        ? tipoviMapa.get(predmet.potreban_tip_ucionice_id) || 'Nepoznat'
        : 'Nije specificiran';

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

    card.querySelector('.edit-btn').addEventListener('click', () => renderPredmetEditMode(card, predmet, tipoviMapa));
    card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`Jeste li sigurni da želite obrisati predmet "${predmet.naziv}"?`)) {
            const result = await obrisiPredmet(predmet.id);
            if (result.success) {
                prikaziPostojecePredmete(card.parentElement); // Re-render the whole list
            }
        }
    });
}

/** Renders the editing view of a subject card */

function renderPredmetEditMode(card, predmet, tipoviMapa) {

    const nazivTipaUcionice = predmet.potreban_tip_ucionice_id ? tipoviMapa.get(predmet.potreban_tip_ucionice_id) : '';

    card.classList.add('edit-mode');



    card.innerHTML = `

        <div class="card-edit-form">

            <input type="text" class="edit-naziv" value="${predmet.naziv}">

            <div class="autocomplete-wrapper"> <!-- Replicating structure from createStrictAutocompleteInput -->

                <input type="text" class="edit-tip-ucionice autocomplete-input" value="${nazivTipaUcionice || ''}" placeholder="Potreban tip učionice" autocomplete="off">

                <div class="suggestions-list" style="display: none;"></div>

            </div>

        </div>

        <div class="card-actions">

            <img src="assets/save.svg" alt="Spremi" class="save-edit-btn">

            <button class="cancel-edit-btn delete-temp-item-btn">X</button>

        </div>

    `;



    // Initialize strict autocomplete for the type input

        const tipUcioniceInput = card.querySelector('.edit-tip-ucionice');

        const suggestionsListElement = card.querySelector('.suggestions-list'); // Explicitly find the element

    

        fetch('tipoviUcionica.json')

            .then(res => res.text())

            .then(text => {

                const tipovi = text ? JSON.parse(text) : [];

                const prijedloziTipova = tipovi.map(t => t.naziv);

                initializeAutocomplete(tipUcioniceInput, prijedloziTipova, true, suggestionsListElement); // Pass explicitly

            })

            .catch(error => console.error("Greška pri dohvatu tipova učionica za uređivanje predmeta:", error));





    card.querySelector('.save-edit-btn').addEventListener('click', async () => {

        const noviNaziv = card.querySelector('.edit-naziv').value.trim();

        const noviNazivTipaUcionice = card.querySelector('.edit-tip-ucionice').value.trim();



        if (!noviNaziv) {

            return displayError("Naziv predmeta ne može biti prazan.");

        }



        const result = await urediPredmet(predmet.id, { naziv: noviNaziv, nazivTipaUcionice: noviNazivTipaUcionice });

        if (result.success) {

            prikaziPostojecePredmete(card.parentElement);

        }

    });



    card.querySelector('.cancel-edit-btn').addEventListener('click', () => {

        card.classList.remove('edit-mode');

        renderPredmetDisplayMode(card, predmet, tipoviMapa);

    });

}


// --- PROFESORI SPECIFIC FUNCTIONS ---

/**
 * Fetches teachers and subjects, then renders them into the container.
 * @param {HTMLElement} container - The HTML element to populate.
 */
async function prikaziPostojeceProfesore(container) {
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