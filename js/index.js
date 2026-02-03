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
    switch (step) {
      case "ucionice":
        prikaziKorakUcionice(modalContent);
        break;
      // Add cases for other steps here in the future
      // case "predmeti":
      //   prikaziKorakPredmeti(modalContent);
      //   break;
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
    modal.classList.remove("show");
    modalBackdrop.classList.remove("show");
    modalTitle.textContent = ""; // Clear title
    modalContent.innerHTML = ""; // Clear content
  };

  // Set initial state for koraci
  koraci.forEach((korak) => {
    // Add click listener to each korak
    korak.addEventListener("click", () => {
      if (!korak.classList.contains("locked")) {
        const title = korak.querySelector("h3").textContent;
        const step = korak.dataset.step; // Get the step name from data attribute
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
  saveStepButton.addEventListener("click", closeModal); // For now, done also closes
  modalBackdrop.addEventListener("click", closeModal);
});
