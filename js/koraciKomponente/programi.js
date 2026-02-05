import {
  createSimpleInput,
  createStrictAutocompleteInput,
  displayError,
  initializeAutocomplete,
} from "../korakProzor.js";
import { spremiJSON } from "../spremiJSON.js";
import { dohvatiPrijedloge } from "../upraviteljPrijedloga.js";
import { pronadjiIliStvoriId, provjeriDupliNaziv } from "../utils.js";

const KORAK_ID = "programi";
const FILE_NAME = "program.json";

let tempProgrami = [];
let trenutniPredmeti = [];
let predmetiPrijedlozi = [];

function prikaziDodanePredmete() {
  const container = document.getElementById("dodani-predmeti-container");
  container.innerHTML = "";
  trenutniPredmeti.forEach((predmet, index) => {
    const predmetTag = document.createElement("div");
    predmetTag.classList.add("new-item-tag");
    predmetTag.textContent = `${predmet.naziv} (${predmet.weekly_requirement}h)`;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      trenutniPredmeti.splice(index, 1);
      prikaziDodanePredmete();
    };

    predmetTag.appendChild(deleteBtn);
    container.appendChild(predmetTag);
  });
}

function dodajPredmet() {
  const predmetInput = document.querySelector(
    "#predmeti-section .autocomplete-input",
  );
  const satnicaInput = document.getElementById("tjedna-satnica-input");

  const nazivPredmeta = predmetInput.value.trim();
  const tjednaSatnica = parseInt(satnicaInput.value, 10);

  if (!nazivPredmeta || !tjednaSatnica) {
    displayError("Morate odabrati predmet i unijeti tjednu satnicu.");
    return;
  }

  if (tjednaSatnica < 1 || tjednaSatnica > 10) {
    displayError("Tjedna satnica mora biti između 1 i 10.");
    return;
  }

  if (trenutniPredmeti.some((p) => p.naziv === nazivPredmeta)) {
    displayError("Ovaj predmet je već dodan u program.");
    return;
  }

  trenutniPredmeti.push({
    naziv: nazivPredmeta,
    weekly_requirement: tjednaSatnica,
  });

  prikaziDodanePredmete();
  predmetInput.value = "";
  satnicaInput.value = "";
  predmetInput.focus();
}

function resetFormular() {
  document.getElementById("naziv-programa-input").value = "";
  trenutniPredmeti = [];
  prikaziDodanePredmete();
  prikaziPrivremenePrograme();
}

function prikaziPrivremenePrograme() {
  const display = document.querySelector(".new-items-display");
  if (!display) return;
  display.innerHTML = "";
  tempProgrami.forEach((program, index) => {
    const programTag = document.createElement("div");
    programTag.classList.add("new-item-tag");
    programTag.textContent = program.naziv;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      tempProgrami.splice(index, 1);
      prikaziPrivremenePrograme();
    };

    programTag.appendChild(deleteBtn);
    display.appendChild(programTag);
  });
}

export function dodajNoviProgram() {
  const nazivInput = document.getElementById("naziv-programa-input");
  const naziv = nazivInput.value.trim();

  if (!naziv) {
    displayError("Naziv programa ne može biti prazan.");
    return;
  }
  if (trenutniPredmeti.length === 0) {
    displayError("Program mora imati barem jedan predmet.");
    return;
  }

  if (provjeriDupliNaziv(naziv, [], tempProgrami, "naziv")) {
    displayError("Program s ovim nazivom je već dodan.");
    return;
  }

  const noviProgram = {
    id: Date.now(), // Privremeni ID
    naziv: naziv,
    popis_predmeta: [...trenutniPredmeti],
  };

  tempProgrami.push(noviProgram);
  resetFormular();
}

export async function spremiNovePrograme() {
  if (tempProgrami.length === 0) {
    const nazivInput = document.getElementById("naziv-programa-input");
    if (nazivInput && nazivInput.value.trim() && trenutniPredmeti.length > 0) {
      displayError(
        "Imate nespremljeni program. Kliknite 'Dodaj novi' prije spremanja.",
      );
      return { success: false, message: "Unsaved changes."};
    }
    // If no new programs and no unsaved changes, just allow closing
    return { success: true };
  }

  try {
    let existingData = [];
    try {
      const response = await fetch(FILE_NAME);
      if (response.ok) {
        const text = await response.text();
        if (text) existingData = JSON.parse(text);
      }
    } catch (e) {
      console.log("File probably doesn't exist, which is fine");
    }

    for (const program of tempProgrami) {
      if (provjeriDupliNaziv(program.naziv, existingData, [], "naziv")) {
        displayError(`Program "${program.naziv}" već postoji.`);
        return { success: false, message: "Duplicate entry." };
      }

      const idPredmetaPromises = program.popis_predmeta.map((predmetRef) =>
        pronadjiIliStvoriId("predmeti.json", predmetRef.naziv, "naziv"),
      );
      const idjeviPredmeta = await Promise.all(idPredmetaPromises);

      program.popis_predmeta = program.popis_predmeta.map((predmetRef, i) => ({
        predmet_id: idjeviPredmeta[i],
        weekly_requirement: predmetRef.weekly_requirement,
      }));
    }

    const finalData = [...existingData, ...tempProgrami];
    await spremiJSON(FILE_NAME, finalData);
    tempProgrami = []; // Clear temp array on successful save
    return { success: true };
  } catch (error) {
    console.error("Greška pri spremanju programa:", error);
    displayError("Došlo je do greške pri spremanju.");
    return { success: false, message: error.message };
  }
}

function getProgramiFormHTML() {
  return `
    <div class="form-section">
      ${createSimpleInput("Naziv Programa", "Unesite naziv programa", "naziv-programa-input")}
    </div>
    <div class="form-section" id="predmeti-section">
      <label class="field-label">Predmeti i tjedna satnica</label>
      <div class="predmet-dodavanje">
        <div class="predmet-dodavanje-input">
          ${createStrictAutocompleteInput("Naziv predmeta", "Odaberi predmet")}
        </div>
        <div class="predmet-dodavanje-input">
          <input type="number" id="tjedna-satnica-input" class="broj-input" placeholder="Tjedna satnica" min="1" max="10">
        </div>
        <button id="dodaj-predmet-btn" class="button button-add-special">+</button>
      </div>
      <div id="dodani-predmeti-container" class="dodani-predmeti-kontejner"></div>
    </div>
  `;
}

export async function prikaziProzorZaUnosPrograma(
  modalContent,
) {
  tempProgrami = [];
  trenutniPredmeti = [];
  predmetiPrijedlozi = await dohvatiPrijedloge(
    "predmeti.json",
    (item) => item.naziv,
  );

  const formContainer = modalContent.querySelector(
    ".modal-form-container .modal-content",
  );
  formContainer.innerHTML = getProgramiFormHTML();

  const predmetInput = formContainer.querySelector(
    "#predmeti-section .autocomplete-input",
  );
  initializeAutocomplete(predmetInput, predmetiPrijedlozi, true);

  document
    .getElementById("dodaj-predmet-btn")
    .addEventListener("click", dodajPredmet);
}
