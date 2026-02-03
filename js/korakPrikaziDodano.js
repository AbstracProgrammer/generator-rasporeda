// This file manages displaying existing data in the right-hand column of the modal.

/**
 * Fetches data from a JSON file and renders it into a container using a specific rendering function.
 * @param {HTMLElement} container - The HTML element to populate (e.g., .existing-items-container).
 * @param {string} fileName - The name of the JSON file to fetch.
 * @param {Function} renderFunction - A function that takes a single data item and returns an HTML string for it.
 */
async function prikaziPostojeceStavke(container, fileName, renderFunction) {
  container.innerHTML = 'Učitavanje...'; // Show a loading message

  try {
    const response = await fetch(fileName);
    if (!response.ok) {
      throw new Error(`Greška pri dohvatu: ${response.statusText}`);
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : [];

    if (data.length === 0) {
      container.innerHTML = 'Nema unesenih stavki.';
      return;
    }

    container.innerHTML = data.map(renderFunction).join('');
    
  } catch (error) {
    console.error(`Greška pri prikazivanju postojećih stavki iz ${fileName}:`, error);
    container.innerHTML = `<p style="color: red;">Nije moguće učitati podatke.</p>`;
  }
}
