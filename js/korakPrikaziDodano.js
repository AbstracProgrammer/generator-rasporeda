// This file manages displaying existing data in the right-hand column of the modal.

/**
 * Fetches both classrooms and their types, then renders them into the container.
 * @param {HTMLElement} container - The HTML element to populate (e.g., .existing-items-container).
 */
async function prikaziPostojeceUcionice(container) {
  container.innerHTML = 'Učitavanje...';

  try {
    // 1. Fetch both resources in parallel for efficiency
    const [ucioniceRes, tipoviRes] = await Promise.all([
        fetch('ucionice.json'),
        fetch('tipoviUcionica.json')
    ]);

    // 2. Parse both responses
    const ucioniceText = await ucioniceRes.text();
    const tipoviText = await tipoviRes.text();
    const ucionice = ucioniceText ? JSON.parse(ucioniceText) : [];
    const tipovi = tipoviText ? JSON.parse(tipoviText) : [];
    
    if (ucionice.length === 0) {
      container.innerHTML = 'Nema unesenih učionica.';
      return;
    }

    // 3. Create a Map for quick lookup of type names by their ID
    const tipoviMapa = new Map(tipovi.map(t => [t.id, t.naziv]));

    // 4. Render the classroom cards
    container.innerHTML = ucionice.map(ucionica => {
        // For each classroom, find the names of its types using the map
        const naziviTipova = ucionica.tipovi_id && ucionica.tipovi_id.length > 0
            ? ucionica.tipovi_id.map(id => tipoviMapa.get(id) || 'Nepoznat tip').join(', ')
            : 'Nije specificiran';
        
        return `
          <div class="existing-item-card ucionica-card">
            <div class="naziv">${ucionica.naziv}</div>
            <div class="tip">Tip: ${naziviTipova}</div>
          </div>
        `;
    }).join('');
    
  } catch (error) {
    console.error(`Greška pri prikazivanju postojećih učionica:`, error);
    container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
  }
}
