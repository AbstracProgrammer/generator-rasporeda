document.addEventListener("DOMContentLoaded", () => {
  const koraci = document.querySelectorAll(".korak");
  const modal = document.querySelector(".korak-prozor");
  const modalBackdrop = document.querySelector(".modal-backdrop");
  const modalTitle = modal.querySelector("h3");
  const modalContent = modal.querySelector(".modal-content");
  const exitButton = modal.querySelector(".exit");
  const saveStepButton = modal.querySelector(".save-step");

  /**
   * Acts as a router to call the correct function for building the modal content.
   * @param {string} step - The 'data-step' attribute value.
   */
  const prikaziKorak = (step) => {
    modal.dataset.step = step; // Set current step on the modal
    switch (step) {
      case "ucionice":
        prikaziKorakUcionice(modalContent);
        break;
      // Add cases for other steps here in the future
      default:
        console.error("Nepoznat korak:", step);
        modalContent.innerHTML =
          "<p>Došlo je do greške pri učitavanju koraka.</p>";
    }
  };

  // Function to open the modal
  const openModal = (title, step) => {
    modalTitle.textContent = title;
    prikaziKorak(step); // Build the content for the specific step
    modal.classList.add("show");
    modalBackdrop.classList.add("show");
  };

  // Function to close the modal
  const closeModal = () => {
    modal.classList.remove("show");
    modalBackdrop.classList.remove("show");
    modalTitle.textContent = ""; // Clear title
    modalContent.innerHTML = ""; // Clear content
    delete modal.dataset.step; // Remove step data attribute
  };

  /**
   * Acts as a router to call the correct save function from koraciUpravitelj.js
   * @param {string} step The current step from the modal's dataset.
   * @param {HTMLElement} content The modal's content element.
   * @returns {Promise<object>} A promise that resolves to a result object, e.g., { success: true }.
   */
  const handleSave = async (step, content) => {
    switch (step) {
      case "ucionice":
        return await spremiKorakUcionice(content);
      // Add cases for other steps here
      default:
        console.error("Nema definirane logike spremanja za korak:", step);
        return {
          success: false,
          message: "Logika spremanja nije implementirana.",
        };
    }
  };

  // Main save button event listener
  saveStepButton.addEventListener("click", async () => {
    const currentStep = modal.dataset.step;
    if (!currentStep) return;

    const result = await handleSave(currentStep, modalContent);

    if (result.success) {
      closeModal();
      // Visually mark step as 'completed'
      document
        .querySelector(`.korak[data-step="${currentStep}"]`)
        .classList.add("completed");
    }
    // If not successful, the specific error is already displayed by the function in koraciUpravitelj.js
  });

  // Set initial state for koraci
  koraci.forEach((korak) => {
    // Add click listener to each korak
    korak.addEventListener("click", () => {
      if (!korak.classList.contains("locked")) {
        const title = korak.querySelector("h3").textContent;
        const step = korak.dataset.step;
        openModal(title, step);
      }
    });
  });

  // Lock all steps except the first one initially
  koraci.forEach((korak, index) => {
    if (index !== 0) {
      korak.classList.add("locked");
    }
  });

  // Event listeners for closing the modal
  exitButton.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
});
