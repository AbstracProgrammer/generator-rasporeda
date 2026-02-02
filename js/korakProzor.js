// This file will contain the component generator functions
// and the logic for handling the autocomplete functionality.

/**
 * Displays an error message in the modal's error display area.
 * The message will disappear after 3 seconds.
 * @param {string} message - The error message to display.
 */
function displayError(message) {
  const errorElement = document.querySelector(".korak-prozor .error");
  if (errorElement) {
    errorElement.textContent = message;
    setTimeout(() => {
      errorElement.textContent = "";
    }, 3000);
  }
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
      <div class="autocomplete-content">
        <div class="autocomplete-wrapper">
          <input type="text" class="autocomplete-input" placeholder="${placeholder || ""}" autocomplete="off">
          <button class="add-button button">+</button>
          <div class="suggestions-list" style="display: none;"></div>
        </div>
        <div class="added-items-list"></div>
      </div>
    </div>
  `;
}

/**
 * Renders the list of added items below the autocomplete input.
 * @param {HTMLElement} container - The '.added-items-list' container element.
 * @param {string[]} items - The array of items to render.
 */
function renderAddedItems(container, items) {
  container.innerHTML = ""; // Clear current list
  items.forEach((itemText) => {
    const itemElement = document.createElement("div");
    itemElement.classList.add("added-item");
    itemElement.textContent = itemText;
    // Optional: Add a delete button for each item
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-item-btn");
    deleteBtn.addEventListener("click", () => {
      // Remove item from array and re-render
      const index = items.indexOf(itemText);
      if (index > -1) {
        items.splice(index, 1);
        renderAddedItems(container, items);
      }
    });
    itemElement.appendChild(deleteBtn);
    container.appendChild(itemElement);
  });
}

/**
 * Initializes the functionality for the 'add' button in an autocomplete component.
 * @param {HTMLButtonElement} addButton - The button element to attach the listener to.
 * @param {string[]} targetArray - The array that stores the added items.
 */
function initializeAddButton(addButton, targetArray) {
  addButton.addEventListener("click", () => {
    const wrapper = addButton.closest(".autocomplete-wrapper");
    const input = wrapper.querySelector(".autocomplete-input");
    const value = input.value.trim();

    if (!value) {
      displayError("Unos ne može biti prazan.");
      return;
    }

    // Case-insensitive check for duplicates
    if (
      targetArray.some((item) => item.toLowerCase() === value.toLowerCase())
    ) {
      displayError("Stavka već postoji na popisu.");
      return;
    }

    targetArray.push(value);
    input.value = ""; // Clear input
    displayError(""); // Clear any previous errors

    const listContainer = addButton
      .closest(".autocomplete-content")
      .querySelector(".added-items-list");
    renderAddedItems(listContainer, targetArray);
  });
}

/**
 * Initializes the autocomplete functionality for a given input and suggestion list.
 * @param {HTMLInputElement} inputElement - The input element to attach the listener to.
 * @param {string[]} suggestions - An array of suggestion strings.
 */
function initializeAutocomplete(inputElement, suggestions) {
  const suggestionsList = inputElement.nextElementSibling.nextElementSibling;

  inputElement.addEventListener("input", () => {
    const inputValue = inputElement.value.toLowerCase();
    suggestionsList.innerHTML = "";

    if (inputValue.length === 0) {
      suggestionsList.style.display = "none";
      return;
    }

    const filteredSuggestions = suggestions.filter((s) =>
      s.toLowerCase().startsWith(inputValue),
    );

    if (filteredSuggestions.length > 0) {
      filteredSuggestions.forEach((s) => {
        const item = document.createElement("div");
        item.classList.add("suggestion-item");
        item.textContent = s;
        item.addEventListener("click", () => {
          inputElement.value = s;
          suggestionsList.style.display = "none";
        });
        suggestionsList.appendChild(item);
      });
      suggestionsList.style.display = "block";
    } else {
      suggestionsList.style.display = "none";
    }
  });
}
