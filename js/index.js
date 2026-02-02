document.addEventListener("DOMContentLoaded", () => {
  const koraci = document.querySelectorAll(".korak");
  const modal = document.querySelector(".korak-prozor");
  const modalBackdrop = document.querySelector(".modal-backdrop");
  const modalTitle = modal.querySelector("h3");
  const exitButton = modal.querySelector(".exit");
  const saveStepButton = modal.querySelector(".save-step");

  // Function to open the modal
  const openModal = (title) => {
    modalTitle.textContent = title;
    modal.classList.add("show");
    modalBackdrop.classList.add("show");
  };

  // Function to close the modal
  const closeModal = () => {
    modal.classList.remove("show");
    modalBackdrop.classList.remove("show");
    modalTitle.textContent = ""; // Clear title
  };

  // Set initial state for koraci
  koraci.forEach((korak, index) => {
    if (index === 0) {
      korak.classList.add("active");
    } else {
      korak.classList.add("locked");
    }

    // Add click listener to each korak
    korak.addEventListener("click", () => {
      if (!korak.classList.contains("locked")) {
        const title = korak.querySelector("h3").textContent;
        openModal(title);
      }
    });
  });

  // Event listeners for closing the modal
  exitButton.addEventListener("click", closeModal);
  saveStepButton.addEventListener("click", closeModal); // For now, done also closes
  modalBackdrop.addEventListener("click", closeModal);
});
