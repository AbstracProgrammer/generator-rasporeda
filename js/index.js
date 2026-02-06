import { prikaziKurikulum, dodajNoviKurikulum, spremiKorakKurikulum } from "./koraciKomponente/kurikulum.js";
import {
  dodajNoviPredmet,
  prikaziKorakPredmeti,
  spremiKorakPredmeti,
} from "./koraciKomponente/predmeti.js";
import {
  dodajNovogProfesora,
  prikaziKorakProfesori,
  spremiKorakProfesori,
} from "./koraciKomponente/profesori.js";
import {
  dodajNoviProgram,
  prikaziProzorZaUnosPrograma,
  spremiNovePrograme,
} from "./koraciKomponente/programi.js";
import {
  dodajNovoOdjeljenje,
  prikaziKorakRazredi,
  spremiKorakRazredi,
} from "./koraciKomponente/razredi.js";
import {
  dodajNovuUcionicu,
  prikaziKorakUcionice,
  spremiKorakUcionice,
} from "./koraciKomponente/ucionice.js";
import { GeneratorRasporeda } from "./generator.js";
import { spremiJSON } from "./spremiJSON.js";


document.addEventListener("DOMContentLoaded", () => {
  const koraci = document.querySelectorAll(".korak");
  const modal = document.querySelector(".korak-prozor");
  const modalBackdrop = document.querySelector(".modal-backdrop");
  const modalTitle = modal.querySelector("h3");
  const modalBody = modal.querySelector(".modal-body"); // The main container for both columns
  const exitButton = modal.querySelector(".exit");
  const saveAndAddNewButton = modal.querySelector("button.save-and-add-new-button"); // Changed selector to be more specific
  const saveStepButton = modal.querySelector("button.save-step"); // Changed selector to be more specific
  const generirajButton = document.querySelector('.main-button');


  const closeModalAndRefresh = () => {
    closeModal();
    azurirajStatusKorakaNaUcitavanju();
  };

  /**
   * Acts as a router to call the correct function for building the modal content.
   * @param {string} step - The 'data-step' attribute value.
   */
  const prikaziKorak = (step) => {
    modal.dataset.step = step; // Set current step on the modal

    // Reset button text to default, then customize if needed
    saveAndAddNewButton.textContent = "Dodaj novi";

    switch (step) {
      case "ucionice":
        prikaziKorakUcionice(modalBody); // Pass the main body
        break;
      case "predmeti":
        prikaziKorakPredmeti(modalBody);
        break;
      case "profesori":
        prikaziKorakProfesori(modalBody);
        break;
      case "razredi":
        prikaziKorakRazredi(modalBody);
        break;
      case "programi":
        prikaziProzorZaUnosPrograma(modalBody);
        break;
      case "kurikulum":
        prikaziKurikulum(modalBody);
        break;
      // Add cases for other steps here in the future
      default:
        console.error("Nepoznat korak:", step);
        const formContainer = modalBody.querySelector(
          ".modal-form-container .modal-content",
        );
        if (formContainer) {
          formContainer.innerHTML =
            "<p>Prikaz za ovaj korak još nije implementiran.</p>";
        }
        break;
    }
  };

  // Function to open the modal
  const openModal = (title, step) => {
    modalTitle.textContent = title;
    prikaziKorak(step); // Build the content for the specific step
    modal.classList.add("show");
    modalBackdrop.classList.add("show");
  };

  const closeModal = () => {
    modal.classList.remove("show");
    modalBackdrop.classList.remove("show");
    modalTitle.textContent = "";

    // Robustly find and clear containers
    const formContent = modal.querySelector(".modal-content");
    const existingItems = modal.querySelector(".existing-items-container");
    const newItems = modal.querySelector(".new-items-display");
    if (formContent) formContent.innerHTML = "";
    if (existingItems) existingItems.innerHTML = "";
    if (newItems) newItems.innerHTML = "";

    delete modal.dataset.step;
  };

  /**
   * Checks for unsaved items before closing the modal.
   */
  const handleCloseAttempt = () => {
    // This logic needs to be adapted. For now, we will just close.
    // A more robust solution would involve a shared state or events.
    closeModal();
  };

  /**
   * Router for the "Spremi i zatvori" button.
   */
  const handleSave = async (step) => {
    switch (step) {
      case "ucionice":
        return await spremiKorakUcionice();
      case "predmeti":
        return await spremiKorakPredmeti();
      case "profesori":
        return await spremiKorakProfesori();
      case "razredi":
        return await spremiKorakRazredi();
      case "programi":
        return await spremiNovePrograme();
      case "kurikulum":
        return await spremiKorakKurikulum();
      default:
        console.error("Nema definirane logike spremanja za korak:", step);
        return {
          success: false,
          message: "Logika spremanja nije implementirana.",
        };
    }
  };

  /**
   * Router for the "Spremi i dodaj novi" button.
   */
  const handleSaveAndAddNew = async (step, body) => {
    // The handler function now expects the form container directly
    const formContainer = body.querySelector(
      ".modal-form-container .modal-content",
    );
    switch (step) {
      case "ucionice":
        await dodajNovuUcionicu(formContainer);
        break;
      case "predmeti":
        await dodajNoviPredmet(formContainer);
        break;
      case "profesori":
        await dodajNovogProfesora(formContainer);
        break;
      case "razredi":
        await dodajNovoOdjeljenje(formContainer);
        break;
      case "programi":
        await dodajNoviProgram();
        break;
      case "kurikulum":
        await dodajNoviKurikulum(modalBody);
        break;
    }
  };

  // Set initial state for koraci based on JSON file content
  const azurirajStatusKorakaNaUcitavanju = async () => {
    const koraciConfig = [
      {
        element: document.querySelector('.korak[data-step="ucionice"]'),
        file: "ucionice.json",
      },
      {
        element: document.querySelector('.korak[data-step="predmeti"]'),
        file: "predmeti.json",
      },
      {
        element: document.querySelector('.korak[data-step="profesori"]'),
        file: "profesori.json",
      },
      {
        element: document.querySelector('.korak[data-step="razredi"]'),
        file: "razredi.json",
      },
      {
        element: document.querySelector('.korak[data-step="programi"]'),
        file: "program.json",
      },
      {
        element: document.querySelector('.korak[data-step="kurikulum"]'),
        file: "kurikulum.json",
      },
    ];

    const provjere = koraciConfig.map(
      (config) =>
        fetch(config.file)
          .then((res) => res.text())
          .then((text) => text && JSON.parse(text).length > 0)
          .catch(() => false), // If file doesn't exist or is invalid, consider it empty
    );

    const rezultati = await Promise.all(provjere);
    
    let allCompleted = true;
    let prviNeZavrseniPronadjen = false;
    koraciConfig.forEach((config, index) => {
      if (!config.element) return;

      config.element.classList.remove("active", "locked", "completed");

      if (rezultati[index]) {
        config.element.classList.add("completed");
      } else {
        allCompleted = false;
      }

      if (!rezultati[index] && !prviNeZavrseniPronadjen) {
        config.element.classList.add("active");
        prviNeZavrseniPronadjen = true;
      }

      if (
        prviNeZavrseniPronadjen &&
        !config.element.classList.contains("active")
      ) {
        config.element.classList.add("locked");
      }
    });

    if (allCompleted) {
        generirajButton.classList.remove('locked');
    } else {
        generirajButton.classList.add('locked');
    }

    // If all are completed, make the last one active
    if (!prviNeZavrseniPronadjen && koraciConfig.length > 0) {
      const zadnjiKorak = koraciConfig[koraciConfig.length - 1].element;
      if (zadnjiKorak) {
        zadnjiKorak.classList.add("active");
        zadnjiKorak.classList.remove("locked");
      }
    }
  };

  async function pokreniGenerator() {
    if (generirajButton.classList.contains('locked')) return;

    generirajButton.textContent = 'Generiram...';
    generirajButton.disabled = true;

    try {
        const [profesoriRes, ucioniceRes, razrediRes, kurikulumRes, predmetiRes] = await Promise.all([
            fetch("profesori.json"),
            fetch("ucionice.json"),
            fetch("razredi.json"),
            fetch("kurikulum.json"),
            fetch("predmeti.json"),
        ]);

        const skola = {
            profesori: await profesoriRes.json(),
            ucionice: await ucioniceRes.json(),
            razredi: await razrediRes.json(),
            kurikulum: await kurikulumRes.json(),
            predmeti: await predmetiRes.json(),
        };

        const generator = new GeneratorRasporeda(skola);
        const success = generator.solve();

        if (success) {
            const raspored = generator.getRaspored();
            await spremiJSON("raspored.json", raspored);
            alert("Raspored je uspješno generiran i spremljen!");
            window.open('prikaz.html', '_blank');
        } else {
            alert("Nije moguće generirati raspored s trenutnim postavkama i ograničenjima.");
        }
    } catch (error) {
        console.error("Došlo je do greške prilikom generiranja rasporeda:", error);
        alert("Dogodila se greška. Provjerite konzolu za više informacija.");
    } finally {
        generirajButton.textContent = 'Generiraj raspored';
        generirajButton.disabled = false;
    }
}

  // --- Event Listeners ---

  generirajButton.addEventListener('click', pokreniGenerator);

  // "Spremi i zatvori" button event listener
  saveStepButton.addEventListener("click", async () => {
    const currentStep = modal.dataset.step;
    if (!currentStep) return;

    const result = await handleSave(currentStep);

    if (result.success) {
      closeModal();
      azurirajStatusKorakaNaUcitavanju(); // Re-run status update after saving
    }
  });

  // "Spremi i dodaj novi" button event listener
  saveAndAddNewButton.addEventListener("click", async () => {
    const currentStep = modal.dataset.step;
    if (!currentStep) return;
    await handleSaveAndAddNew(currentStep, modalBody); // Pass the main body
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

  azurirajStatusKorakaNaUcitavanju(); // Initial call on page load

  // Event listeners for closing the modal
  exitButton.addEventListener("click", handleCloseAttempt);
  modalBackdrop.addEventListener("click", handleCloseAttempt);
});
