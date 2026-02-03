document.addEventListener("DOMContentLoaded", () => {
  const koraci = document.querySelectorAll(".korak");
  const modal = document.querySelector(".korak-prozor");
  const modalBackdrop = document.querySelector(".modal-backdrop");
  const modalTitle = modal.querySelector("h3");
  const modalContent = modal.querySelector(".modal-content");
  const exitButton = modal.querySelector(".exit");
  const saveAndAddNewButton = modal.querySelector(".save-and-add-new-button");
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
        modalContent.innerHTML = "<p>Došlo je do greške pri učitavanju koraka.</p>";
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
    const currentStep = modal.dataset.step;
    if (currentStep && privremeniUnosi[currentStep]) {
      privremeniUnosi[currentStep] = []; // Clear temporary entries for the step
    }
    modal.classList.remove("show");
    modalBackdrop.classList.remove("show");
    modalTitle.textContent = "";
    modalContent.innerHTML = "";
    document.querySelector(".new-items-display").innerHTML = ""; // Clear display
    delete modal.dataset.step;
  };
  
  /**
   * Router for the "Spremi i dodaj novi" button.
   */
  const handleSaveAndAddNew = async (step, content) => {
    switch (step) {
      case "ucionice":
        await dodajNovuUcionicu(content);
        break;
      default:
        console.error("Nema definirane logike za dodavanje za korak:", step);
    }
  };

  /**
   * Router for the "Spremi i zatvori" button.
   */
  const handleSave = async (step) => {
    switch (step) {
      case "ucionice":
        return await spremiKorakUcionice();
      default:
        console.error("Nema definirane logike spremanja za korak:", step);
        return { success: false, message: "Logika spremanja nije implementirana." };
    }
  };

  // "Spremi i dodaj novi" button event listener
  saveAndAddNewButton.addEventListener("click", async () => {
    const currentStep = modal.dataset.step;
    if (!currentStep) return;
    await handleSaveAndAddNew(currentStep, modalContent);
  });
  
  // "Spremi i zatvori" button event listener
  saveStepButton.addEventListener("click", async () => {
    const currentStep = modal.dataset.step;
    if (!currentStep) return;

    const result = await handleSave(currentStep);

    if (result.success) {
      closeModal();
      document.querySelector(`.korak[data-step="${currentStep}"]`).classList.add('completed');
    }
  });

  // Set initial state for koraci
  koraci.forEach((korak) => {
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
