// This file will orchestrate the building of each step's modal content.

/**
 * Builds and displays the form for the "Učionice" (Classrooms) step.
 * It dynamically populates autocomplete suggestions and displays existing items.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
async function prikaziKorakUcionice(modalBody) {
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
 * Builds and displays the form for the "Predmeti" (Subjects) step.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
async function prikaziKorakPredmeti(modalBody) {
  const formContainer = modalBody.querySelector('.modal-form-container .modal-content');
  const existingItemsContainer = modalBody.querySelector('.existing-items-container');

  // --- Left Column: Form ---
  // Fetch type *names* for suggestions for strict autocomplete
  let prijedloziTipovaUcionica = await dohvatiPrijedloge('tipoviUcionica.json', (item) => item.naziv);
  
  formContainer.innerHTML = ""; // Clear previous form content

  const nazivInputHtml = createSimpleInput("Naziv predmeta:", "Npr. Matematika");
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
 * Builds and displays the form for the "Profesori" (Teachers) step.
 * @param {HTMLElement} modalBody - The main body container of the modal.
 */
async function prikaziKorakProfesori(modalBody) {
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
