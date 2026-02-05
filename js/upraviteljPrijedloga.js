// This file manages fetching and processing suggestion data for autocomplete fields.

/**
 * Fetches data from a specified JSON file and extracts unique properties for suggestions.
 * @param {string} fileName - The name of the JSON file (e.g., 'ucionice.json').
 * @param {Function} propertyExtractor - A function that takes an item object and returns the property (or array of properties) to be used as suggestions.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique suggestion strings.
 */
export async function dohvatiPrijedloge(fileName, propertyExtractor) {
  try {
    const response = await fetch(`${fileName}.json`); // It will fetch from the root
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : [];

    if (!Array.isArray(data)) {
      console.error(`Očekivani format za ${fileName}.json je polje.`);
      return [];
    }

    const prijedlozi = data.map(propertyExtractor).filter(Boolean);
    return [...new Set(prijedlozi)];
  } catch (error) {
    console.error(`Greška pri dohvatu prijedloga iz ${fileName}:`, error);
    return []; // Vrati prazno polje u slučaju greške
  }
}
