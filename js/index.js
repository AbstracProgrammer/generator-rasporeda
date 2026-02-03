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
    delete modal.dataset.step; // Remove step data attribute
  };

  // Main save logic
  saveStepButton.addEventListener("click", async () => {
    const currentStep = modal.dataset.step;
    if (!currentStep) return;

    switch (currentStep) {
      case "ucionice":
        try {
          // 1. Fetch current data
          const response = await fetch('ucionice.json');
          const ucionice = await response.json();

          // 2. Get data from form
          const nazivInput = modalContent.querySelector(".input-field input");
          const tipInput = modalContent.querySelector(".autocomplete-input");
          
          const naziv = nazivInput.value.trim();
          const tip = tipInput.value.trim();

          if (!naziv) {
            displayError("Naziv učionice ne može biti prazan.");
            return;
          }

          // 3. Create new object (as per GEMINI.md)
          const noviId = ucionice.length > 0 ? Math.max(...ucionice.map(u => u.id)) + 1 : 1;
          
          const novaUcionica = {
            id: noviId,
            naziv: naziv,
            tip: tip ? [tip] : [], // Save tip as an array, even if single
            prioritet: 0 // Default value as it's not in the form
          };

          // 4. Append to array
          ucionice.push(novaUcionica);

          // 5. Save the whole array back
          const result = await spremiJSON('ucionice.json', ucionice);

          if (result.success) {
            // On success, close the modal
            closeModal();
            // Optional: Visually mark step as 'completed'
            document.querySelector('.korak[data-step="ucionice"]').classList.add('completed');
          } else {
            // Use the error display function for server/fetch errors
            displayError(result.message || "Došlo je do greške na serveru.");
          }

        } catch (error) {
          displayError("Greška pri čitanju ili obradi podataka: " + error.message);
        }
        break;
    }
  });


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
  // saveStepButton event is now handled separately above
  modalBackdrop.addEventListener("click", closeModal);
});
