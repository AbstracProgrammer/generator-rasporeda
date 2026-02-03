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
 * @returns {string} - The HTML string for the input field.
 */
function createSimpleInput(labelText, placeholder) {
  return `
    <div class="input-field">
      <span class="field-label">${labelText}</span>
      <input type="text" placeholder="${placeholder || ""}">
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
 */
function initializeAutocomplete(inputElement, suggestionsArray) {
  const suggestionsList = inputElement.parentElement.querySelector(".suggestions-list");

  const showSuggestions = (filter = "") => {
    suggestionsList.innerHTML = "";
    const filtered = suggestionsArray.filter(s => s.toLowerCase().includes(filter.toLowerCase()));

    if (filtered.length > 0) {
      filtered.forEach((s) => {
        const item = document.createElement("div");
        item.classList.add("suggestion-item");
        item.textContent = s;
        // Use 'mousedown' to fire before the input's 'blur' event
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

  // Hide suggestions when the input field loses focus
  inputElement.addEventListener("blur", () => {
    // We use a small delay to allow the 'mousedown' event on a suggestion to fire
    setTimeout(() => {
      suggestionsList.style.display = "none";
    }, 150);
  });
}
