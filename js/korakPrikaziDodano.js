// This file manages displaying existing data in the right-hand column of the modal.

/**
 * Fetches both classrooms and their types, then renders them into the container.
 * @param {HTMLElement} container - The HTML element to populate (e.g., .existing-items-container).
 */
async function prikaziPostojeceUcionice(container) {
  container.innerHTML = "Učitavanje...";

  try {
    const [ucioniceRes, tipoviRes] = await Promise.all([
      fetch("ucionice.json"),
      fetch("tipoviUcionica.json"),
    ]);

    const ucionice = await ucioniceRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));
    const tipovi = await tipoviRes
      .text()
      .then((text) => (text ? JSON.parse(text) : []));

    if (ucionice.length === 0) {
      container.innerHTML = "Nema unesenih učionica.";
      return;
    }

    const tipoviMapa = new Map(tipovi.map((t) => [t.id, t.naziv]));

    container.innerHTML = ""; // Clear loading message

    ucionice.forEach((ucionica) => {
      const card = document.createElement("div");
      card.className = "existing-item-card ucionica-card";
      card.dataset.id = ucionica.id;

      renderDisplayMode(card, ucionica, tipoviMapa);
      container.appendChild(card);
    });
  } catch (error) {
    console.error(`Greška pri prikazivanju postojećih učionica:`, error);
    container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
  }
}

/** Renders the default display view of a classroom card */
function renderDisplayMode(card, ucionica, tipoviMapa) {
  const nazivTipa =
    ucionica.tipovi_id.length > 0
      ? tipoviMapa.get(ucionica.tipovi_id[0]) || "Nepoznat"
      : "Nije specificiran";

  card.innerHTML = `
        <div class="card-content">
            <div class="naziv">${ucionica.naziv}</div>
            <div class="tip">Tip: ${nazivTipa}</div>
        </div>
        <div class="card-actions">
            <img src="assets/edit.png" alt="Uredi" class="edit-btn">
            <img src="assets/delete.png" alt="Obriši" class="delete-btn">
        </div>
    `;

  card
    .querySelector(".edit-btn")
    .addEventListener("click", () =>
      renderEditMode(card, ucionica, tipoviMapa),
    );
  card.querySelector(".delete-btn").addEventListener("click", async () => {
    if (
      confirm(
        `Jeste li sigurni da želite obrisati učionicu "${ucionica.naziv}"?`,
      )
    ) {
      const result = await obrisiUcionicu(ucionica.id);
      if (result.success) {
        prikaziPostojeceUcionice(card.parentElement); // Re-render the whole list
      }
    }
  });
}

/** Renders the editing view of a classroom card */
function renderEditMode(card, ucionica, tipoviMapa) {
  const nazivTipa =
    ucionica.tipovi_id.length > 0 ? tipoviMapa.get(ucionica.tipovi_id[0]) : "";
  card.classList.add("edit-mode");

  card.innerHTML = `
        <div class="card-edit-form">
            <input type="text" class="edit-naziv" value="${ucionica.naziv}">
            <input type="text" class="edit-tip" value="${nazivTipa || ""}" placeholder="Unesi tip">
        </div>
        <div class="card-actions">
            <img src="assets/save.svg" alt="Spremi" class="save-edit-btn">
            <button class="cancel-edit-btn delete-temp-item-btn">X</button>
        </div>
    `;

  card.querySelector(".save-edit-btn").addEventListener("click", async () => {
    const noviNaziv = card.querySelector(".edit-naziv").value.trim();
    const noviNazivTipa = card.querySelector(".edit-tip").value.trim();

    if (!noviNaziv) {
      return displayError("Naziv ne može biti prazan.");
    }

    const result = await urediUcionicu(ucionica.id, {
      naziv: noviNaziv,
      nazivTipa: noviNazivTipa,
    });
    if (result.success) {
      // This is a simplified refresh. A more complex app might just update the single item.
      prikaziPostojeceUcionice(card.parentElement);
    }
  });

  card.querySelector(".cancel-edit-btn").addEventListener("click", () => {
    card.classList.remove("edit-mode");
    renderDisplayMode(card, ucionica, tipoviMapa);
  });
}
