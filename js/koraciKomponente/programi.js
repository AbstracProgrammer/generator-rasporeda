import {
  createSimpleInput,
  createStrictAutocompleteInput,
  displayError,
  initializeAutocomplete,
} from "../korakProzor.js";
import { spremiJSON } from "../spremiJSON.js";
import { provjeriDupliNaziv } from "../utils.js";

const FILE_NAME = "program.json";
let sviPostojeciProgrami;

let tempProgrami = [];
let trenutniPredmeti = [];
let predmetiPrijedlozi = [];
let predmetiMapa = new Map();
let predmetiNazivNaIdMapa = new Map();

function prikaziDodanePredmete(container, predmeti) {
  container.innerHTML = "";
  predmeti.forEach((predmet) => {
    const predmetTag = document.createElement("div");
    predmetTag.classList.add("new-item-tag");
    predmetTag.textContent = `${predmet.naziv} (${predmet.weekly_requirement}h)`;
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "X";
    deleteBtn.classList.add("delete-temp-item-btn");
    deleteBtn.onclick = () => {
      predmeti.splice(
        predmeti.findIndex((p) => p.naziv === predmet.naziv),
        1,
      );
      prikaziDodanePredmete(container, predmeti);
    };
    predmetTag.appendChild(deleteBtn);
    container.appendChild(predmetTag);
  });
}

function dodajPredmet(predmetiContainer, predmetiList) {
  const predmetInput = document.querySelector(
    "#predmeti-section .autocomplete-input",
  );
  const satnicaInput = document.getElementById("tjedna-satnica-input");
  const nazivPredmeta = predmetInput.value.trim();
  const tjednaSatnica = parseInt(satnicaInput.value, 10);

  if (!nazivPredmeta || !tjednaSatnica)
    return displayError("Morate odabrati predmet i unijeti tjednu satnicu.");
  if (!predmetiNazivNaIdMapa.has(nazivPredmeta))
    return displayError("Odabrani predmet nije validan.");
  if (tjednaSatnica < 1 || tjednaSatnica > 10)
    return displayError("Tjedna satnica mora biti između 1 i 10.");
  if (predmetiList.some((p) => p.naziv === nazivPredmeta))
    return displayError("Ovaj predmet je već dodan u program.");

  predmetiList.push({
    naziv: nazivPredmeta,
    weekly_requirement: tjednaSatnica,
  });
  prikaziDodanePredmete(predmetiContainer, predmetiList);
  predmetInput.value = "";
  satnicaInput.value = "";
  predmetInput.focus();
}

function resetFormular() {
  document.getElementById("naziv-programa-input").value = "";
  trenutniPredmeti = [];
  prikaziDodanePredmete(
    document.getElementById("dodani-predmeti-container"),
    trenutniPredmeti,
  );
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
  if (!naziv) return displayError("Naziv programa ne može biti prazan.");
  if (trenutniPredmeti.length === 0)
    return displayError("Program mora imati barem jedan predmet.");
  if (provjeriDupliNaziv(naziv, sviPostojeciProgrami, tempProgrami, "naziv"))
    return displayError("Program s ovim nazivom je već dodan ili postoji.");

  const noviProgram = {
    id: Date.now(),
    naziv: naziv,
    popis_predmeta: trenutniPredmeti.map((p) => ({
      predmet_id: predmetiNazivNaIdMapa.get(p.naziv),
      weekly_requirement: p.weekly_requirement,
    })),
  };
  tempProgrami.push(noviProgram);
  resetFormular();
}

export async function spremiNovePrograme() {
  const nazivInput = document.getElementById("naziv-programa-input");
  if (
    tempProgrami.length === 0 &&
    !(nazivInput && nazivInput.value.trim() && trenutniPredmeti.length > 0)
  ) {
    return { success: true };
  }
  if (nazivInput && nazivInput.value.trim() && trenutniPredmeti.length > 0) {
    displayError(
      "Imate nespremljeni program. Kliknite 'Dodaj novi' prije spremanja.",
    );
    return { success: false, message: "Unsaved changes." };
  }

  try {
    let existingData = [];
    try {
      const response = await fetch(FILE_NAME);
      if (response.ok) existingData = await response.json();
    } catch (e) {
      console.log("File not found, creating new one.");
    }

    for (const program of tempProgrami) {
      if (provjeriDupliNaziv(program.naziv, existingData, [], "naziv")) {
        displayError(`Program "${program.naziv}" već postoji.`);
        return { success: false, message: "Duplicate entry." };
      }
    }

    const finalData = [...existingData, ...tempProgrami];
    await spremiJSON(FILE_NAME, finalData);
    tempProgrami = [];
    return { success: true };
  } catch (error) {
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
        <div class="predmet-dodavanje-input">${createStrictAutocompleteInput("Naziv predmeta", "Odaberi predmet")}</div>
        <div class="predmet-dodavanje-input"><input type="number" id="tjedna-satnica-input" class="broj-input" placeholder="Tjedna satnica" min="1" max="10"></div>
        <button id="dodaj-predmet-btn" class="button button-add-special">+</button>
      </div>
      <div id="dodani-predmeti-container" class="dodani-predmeti-kontejner"></div>
    </div>
  `;
}

async function obrisiProgram(programId) {
  try {
    let [programi, razredi] = await Promise.all([
      fetch(FILE_NAME).then((res) => (res.ok ? res.json() : [])),
      fetch("razredi.json").then((res) => (res.ok ? res.json() : [])),
    ]);
    if (razredi.find((r) => r.program_id === programId)) {
      return displayError(
        `Nije moguće obrisati program jer je dodijeljen nekom razredu.`,
      );
    }
    const noviProgrami = programi.filter((p) => p.id !== programId);
    await spremiJSON(FILE_NAME, noviProgrami);
    prikaziPostojecePrograme(
      document.querySelector(".existing-items-container"),
    );
  } catch (error) {
    displayError("Došlo je do greške pri brisanju.");
  }
}

async function prikaziPostojecePrograme(container) {
  container.innerHTML = "Učitavanje...";
  try {
    const response = await fetch(FILE_NAME);
    sviPostojeciProgrami = response.ok ? await response.json() : [];
    container.innerHTML =
      sviPostojeciProgrami.length === 0 ? "Nema unesenih programa." : "";
    sviPostojeciProgrami.forEach((program) => {
      const card = document.createElement("div");
      card.className = "existing-item-card program-card";
      card.dataset.id = program.id;
      renderProgramDisplayMode(card, program);
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = "Nije moguće učitati programe.";
  }
}

function renderProgramDisplayMode(card, program) {
  card.classList.remove("edit-mode");
  const predmetiListaHtml = program.popis_predmeta
    .map(
      (p) =>
        `<li>${predmetiMapa.get(p.predmet_id) || "Nepoznat"} (${p.weekly_requirement}h)</li>`,
    )
    .join("");
  card.innerHTML = `
    <div class="card-content"><div class="naziv">${program.naziv}</div><ul class="program-predmeti-lista">${predmetiListaHtml}</ul></div>
    <div class="card-actions"><img src="assets/edit.png" class="edit-btn"><img src="assets/delete.png" class="delete-btn"></div>
  `;
  card
    .querySelector(".edit-btn")
    .addEventListener("click", () => renderProgramEditMode(card, program));
  card.querySelector(".delete-btn").addEventListener("click", () => {
    if (
      confirm(`Jeste li sigurni da želite obrisati program "${program.naziv}"?`)
    )
      obrisiProgram(program.id);
  });
}

function renderProgramEditMode(card, program) {
  card.classList.add("edit-mode");
  let predmetiUredivanja = JSON.parse(JSON.stringify(program.popis_predmeta));

  const updateEditView = () => {
    const container = card.querySelector(".dodani-predmeti-kontejner");
    container.innerHTML = predmetiUredivanja
      .map(
        (p) =>
          `<div class="new-item-tag">${predmetiMapa.get(p.predmet_id)} (${p.weekly_requirement}h)
         <button data-id="${p.predmet_id}" class="delete-temp-item-btn">X</button>
       </div>`,
      )
      .join("");
    container.querySelectorAll(".delete-temp-item-btn").forEach((btn) => {
      btn.onclick = () => {
        predmetiUredivanja.splice(
          predmetiUredivanja.findIndex(
            (p) => p.predmet_id === parseInt(btn.dataset.id, 10),
          ),
          1,
        );
        updateEditView();
      };
    });
  };

  card.innerHTML = `
    <div class="card-edit-form">
      <input type="text" class="edit-naziv" value="${program.naziv}">
      <div class="dodani-predmeti-kontejner"></div>
      <div class="predmet-dodavanje">
        <div class="predmet-dodavanje-input">${createStrictAutocompleteInput("Predmet", "Odaberi")}</div>
        <div class="predmet-dodavanje-input"><input type="number" class="broj-input edit-satnica" placeholder="h/t" min="1" max="10"></div>
        <button class="button button-add-special add-predmet-edit-btn">+</button>
      </div>
    </div>
    <div class="card-actions"><img src="assets/save.svg" class="save-edit-btn"><button class="cancel-edit-btn delete-temp-item-btn">X</button></div>
  `;
  updateEditView();

  const autocompleteInput = card.querySelector(".autocomplete-input");
  initializeAutocomplete(autocompleteInput, predmetiPrijedlozi, true);

  card.querySelector(".add-predmet-edit-btn").onclick = () => {
    const naziv = autocompleteInput.value;
    const satnica = card.querySelector(".edit-satnica").value;
    if (!naziv || !satnica) return;
    const predmetId = predmetiNazivNaIdMapa.get(naziv);
    if (
      predmetId &&
      !predmetiUredivanja.some((p) => p.predmet_id === predmetId)
    ) {
      predmetiUredivanja.push({
        predmet_id: predmetId,
        weekly_requirement: parseInt(satnica, 10),
      });
      updateEditView();
      autocompleteInput.value = "";
      card.querySelector(".edit-satnica").value = "";
    }
  };

  card.querySelector(".save-edit-btn").onclick = () =>
    spremiUredeniProgram(
      program.id,
      card.querySelector(".edit-naziv").value.trim(),
      predmetiUredivanja,
    );
  card.querySelector(".cancel-edit-btn").onclick = () =>
    renderProgramDisplayMode(card, program);
}

async function spremiUredeniProgram(programId, noviNaziv, noviPopisPredmeta) {
  try {
    const programi = await fetch(FILE_NAME).then((res) =>
      res.ok ? res.json() : [],
    );
    const index = programi.findIndex((p) => p.id === programId);
    if (index === -1) throw new Error("Program nije pronađen.");
    if (!noviNaziv) return displayError("Naziv programa ne može biti prazan.");
    if (
      programi.some(
        (p) =>
          p.id !== programId &&
          p.naziv.toLowerCase() === noviNaziv.toLowerCase(),
      )
    ) {
      return displayError("Program s tim nazivom već postoji.");
    }
    programi[index].naziv = noviNaziv;
    programi[index].popis_predmeta = noviPopisPredmeta;
    await spremiJSON(FILE_NAME, programi);
    prikaziPostojecePrograme(
      document.querySelector(".existing-items-container"),
    );
  } catch (error) {
    displayError("Greška pri spremanju izmjena: " + error.message);
  }
}

export async function prikaziProzorZaUnosPrograma(modalContent) {
  tempProgrami = [];
  trenutniPredmeti = [];

  try {
    const predmeti = await fetch("predmeti.json").then((res) =>
      res.ok ? res.json() : [],
    );
    predmetiPrijedlozi = predmeti.map((p) => p.naziv);
    predmetiMapa = new Map(predmeti.map((p) => [p.id, p.naziv]));
    predmetiNazivNaIdMapa = new Map(predmeti.map((p) => [p.naziv, p.id]));
  } catch (e) {
    console.error("Nije moguće učitati predmete.", e);
    predmetiPrijedlozi = [];
    predmetiMapa = new Map();
    predmetiNazivNaIdMapa = new Map();
  }

  const formContainer = modalContent.querySelector(
    ".modal-form-container .modal-content",
  );
  const existingItemsContainer = modalContent.querySelector(
    ".existing-items-container",
  );

  formContainer.innerHTML = getProgramiFormHTML();
  const dodaniPredmetiKontejner = formContainer.querySelector(
    "#dodani-predmeti-container",
  );
  const predmetInput = formContainer.querySelector(
    "#predmeti-section .autocomplete-input",
  );
  initializeAutocomplete(predmetInput, predmetiPrijedlozi, true);
  document
    .getElementById("dodaj-predmet-btn")
    .addEventListener("click", () =>
      dodajPredmet(dodaniPredmetiKontejner, trenutniPredmeti),
    );
  prikaziPostojecePrograme(existingItemsContainer);
}
