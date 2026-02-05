// This file manages fetching and processing suggestion data for autocomplete fields.

/**
 * Fetches data from a specified JSON file and extracts unique properties for suggestions.
 * @param {string} fileName - The name of the JSON file (e.g., 'ucionice.json').
 * @param {Function} propertyExtractor - A function that takes an item object and returns the property (or array of properties) to be used as suggestions.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique suggestion strings.
 */
export async function dohvatiPrijedloge(fileName, propertyExtractor) {
  try {
    const response = await fetch(fileName);
    const text = await response.text();
    const data = text ? JSON.parse(text) : [];

    // Use flatMap to handle cases where propertyExtractor returns an array (e.g., item.tip)
    const sviPropertyji = data.flatMap((item) => propertyExtractor(item) || []);

    // Filter out empty strings and return unique values
    return [...new Set(sviPropertyji)].filter(Boolean);
  } catch (error) {
    console.error(`Greška pri dohvatu prijedloga iz ${fileName}:`, error);
    return []; // Return empty array on error
  }
}
