// This file will contain the component generator functions
// and the logic for handling the autocomplete functionality.

/**
 * Displays an error message in the modal's error display area.
 * The message will disappear after 3 seconds.
 * @param {string} message - The error message to display.
 */
let timeoutID = null;

function displayError(message) {
  const errorElement = document.querySelector(".korak-prozor .error");
  if (errorElement.textContent === message) {
    return;
  } else {
    clearTimeout(timeoutID);
  }

  errorElement.textContent = message;
  timeoutID = setTimeout(() => {
    errorElement.textContent = "";
  }, 3000);
}

/**
 * Creates the HTML for a simple labeled input field.
 * @param {string} labelText - The text for the field's label.
 * @param {string} placeholder - The placeholder text for the input.
 * @param {string} [id=""] - Optional: An ID for the input element.
 * @returns {string} - The HTML string for the input field.
 */
function createSimpleInput(labelText, placeholder, id = "") {
  return `
    <div class="input-field">
      <span class="field-label">${labelText}</span>
      <input type="text" ${id ? `id="${id}"` : ''} placeholder="${placeholder || ""}">
    </div>
  `;
}

/**
 * Creates the HTML for a labeled input field with autocomplete functionality.
 * @param {string} labelText - The text for the field's label.
 * @param {string} placeholder - The placeholder text for the input.
 * @returns {string} - The HTML string for the autocomplete field.
 */
function createAutocompleteInput(labelText, placeholder) {
  return `
    <div class="autocomplete-field">
      <span class="field-label">${labelText}</span>
      <div class="autocomplete-wrapper">
        <input type="text" class="autocomplete-input" placeholder="${placeholder || ""}" autocomplete="off">
        <div class="suggestions-list" style="display: none;"></div>
      </div>
    </div>
  `;
}

/**
 * Initializes the autocomplete functionality for a given input.
 * @param {HTMLInputElement} inputElement - The input element to attach listeners to.
 * @param {string[]} suggestionsArray - An array of suggestion strings.
 * @param {boolean} [strictMode=false] - If true, only values from suggestionsArray are allowed.
 * @param {HTMLElement} [suggestionsListElement=null] - Optional: A specific HTMLElement to use as the suggestions list container.
 */
function initializeAutocomplete(inputElement, suggestionsArray, strictMode = false, suggestionsListElement = null) {
  const suggestionsList = suggestionsListElement || inputElement.parentElement.querySelector(".suggestions-list");

  if (!suggestionsList) {
    console.warn("Nema 'suggestions-list' elementa za autocomplete input:", inputElement);
    return; // Cannot initialize if no suggestions list element is found
  }

  const showSuggestions = (filter = "") => {
    suggestionsList.innerHTML = "";
    const filtered = suggestionsArray.filter(s => s.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length > 0) {
      filtered.forEach((s) => {
        const item = document.createElement("div");
        item.classList.add("suggestion-item");
        item.textContent = s;
        item.addEventListener("mousedown", () => {
          inputElement.value = s;
          suggestionsList.style.display = "none";
        });
        suggestionsList.appendChild(item);
      });
      suggestionsList.style.display = "block";
    } else {
      suggestionsList.style.display = "none";
    }
  };

  inputElement.addEventListener("input", () => {
    showSuggestions(inputElement.value);
  });
  
  inputElement.addEventListener("click", () => {
    showSuggestions(inputElement.value);
  });

  if (strictMode) {
    inputElement.addEventListener("blur", () => {
      // Small delay to allow click on suggestion to register
      setTimeout(() => {
        if (!suggestionsArray.some(s => s.toLowerCase() === inputElement.value.toLowerCase()) && inputElement.value.trim() !== '') {
          displayError("Odabrana vrijednost mora biti s popisa. ");
          inputElement.value = ""; // Clear invalid input
        }
        suggestionsList.style.display = "none";
      }, 150);
    });
  } else {
    // Original blur behavior for non-strict mode
    inputElement.addEventListener("blur", () => {
      setTimeout(() => {
        suggestionsList.style.display = "none";
      }, 150);
    });
  }
}

/**
 * Creates the HTML for a labeled input field with strict autocomplete functionality (no adding new).
 * @param {string} labelText - The text for the field's label.
 * @param {string} placeholder - The placeholder text for the input.
 * @returns {string} - The HTML string for the strict autocomplete field.
 */
function createStrictAutocompleteInput(labelText, placeholder) {
  return `
    <div class="autocomplete-field strict-autocomplete">
      <span class="field-label">${labelText}</span>
      <div class="autocomplete-wrapper">
        <input type="text" class="autocomplete-input" placeholder="${placeholder || ""}" autocomplete="off">
        <div class="suggestions-list" style="display: none;"></div>
      </div>
    </div>
  `;
}

/**
 * Creates the HTML for a labeled input field with multi-select autocomplete functionality.
 * @param {string} labelText - The text for the field's label.
 * @param {string} placeholder - The placeholder text for the input.
 * @returns {string} - The HTML string for the multi-select autocomplete field.
 */
function createMultiSelectAutocompleteInput(labelText, placeholder) {
  return `
    <div class="autocomplete-field multi-select-autocomplete">
      <span class="field-label">${labelText}</span>
      <div class="autocomplete-wrapper">
        <input type="text" class="autocomplete-input" placeholder="${placeholder || ""}" autocomplete="off">
        <div class="suggestions-list" style="display: none;"></div>
      </div>
      <div class="selected-tags-container"></div>
    </div>
  `;
}

/**
 * Initializes the multi-select autocomplete functionality for a given input.
 * @param {HTMLInputElement} inputElement - The input element to attach listeners to.
 * @param {string[]} suggestionsArray - An array of suggestion strings.
 * @param {HTMLElement} selectedTagsContainer - The container where selected tags will be displayed.
 * @param {Function} onItemSelected - Callback function when an item is selected. Receives (itemText).
 * @param {Function} onItemRemoved - Callback function when an item is removed. Receives (itemText).
 */
function initializeMultiSelectAutocomplete(inputElement, suggestionsArray, selectedTagsContainer, onItemSelected, onItemRemoved) {
  const suggestionsList = inputElement.parentElement.querySelector(".suggestions-list");

  if (!suggestionsList) {
    console.warn("Nema 'suggestions-list' elementa za multi-select autocomplete input:", inputElement);
    return;
  }

  const showSuggestions = (filter = "") => {
    suggestionsList.innerHTML = "";
    const filtered = suggestionsArray.filter(s => s.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length > 0) {
      filtered.forEach((s) => {
        const item = document.createElement("div");
        item.classList.add("suggestion-item");
        item.textContent = s;
        item.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent input blur
          inputElement.value = "";
          suggestionsList.style.display = "none";
          onItemSelected(s);
        });
        suggestionsList.appendChild(item);
      });
      suggestionsList.style.display = "block";
    } else {
      suggestionsList.style.display = "none";
    }
  };

  inputElement.addEventListener("input", () => {
    showSuggestions(inputElement.value);
  });
  
  inputElement.addEventListener("click", () => {
    showSuggestions(inputElement.value);
  });

  inputElement.addEventListener("blur", () => {
    setTimeout(() => {
      suggestionsList.style.display = "none";
      // Clear input if an invalid value is left (strict mode)
      if (inputElement.value.trim() !== '' && !suggestionsArray.some(s => s.toLowerCase() === inputElement.value.toLowerCase())) {
        displayError("Odabrana vrijednost mora biti s popisa. ");
        inputElement.value = "";
      }
    }, 150);
  });

  // Function to render selected tags
  const renderSelectedTags = (selectedItems) => {
    selectedTagsContainer.innerHTML = "";
    selectedItems.forEach(itemText => {
      const tag = document.createElement("div");
      tag.classList.add("new-item-tag"); // Reusing this class for visual consistency
      tag.textContent = itemText;

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "X";
      deleteBtn.classList.add("delete-temp-item-btn"); // Reusing this class
      deleteBtn.onclick = () => {
        onItemRemoved(itemText);
      };

      tag.appendChild(deleteBtn);
      selectedTagsContainer.appendChild(tag);
    });
  };

  // Expose render function for external updates (e.g., loading existing items)
  return { renderSelectedTags };
}
