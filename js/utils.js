import { spremiJSON } from "./spremiJSON.js";

/**
 * A generic function to check for duplicate names in both existing and temporary data.
 * @param {string} noviNaziv - The new name to check.
 * @param {Array} postojeciPodaci - Array of objects from the main JSON file.
 * @param {Array} privremeniPodaci - Array of objects from the temporary list.
 * @param {string} [poljeZaNaziv='naziv'] - The name of the property that holds the name.
 * @returns {boolean} True if a duplicate is found, false otherwise.
 */
export function provjeriDupliNaziv(
  noviNaziv,
  postojeciPodaci,
  privremeniPodaci,
  poljeZaNaziv = "naziv",
) {
  const sviNazivi = [
    ...postojeciPodaci.map((p) => p[poljeZaNaziv].toLowerCase()),
    ...privremeniPodaci.map((p) => p[poljeZaNaziv].toLowerCase()),
  ];
  return sviNazivi.includes(noviNaziv.toLowerCase());
}

/**
 * A generic function to find an item's ID by its name in any JSON file. If it doesn't exist, it creates it.
 * @param {string} fileName - The JSON file to search in.
 * @param {string} nazivStavke - The name of the item to find/create.
 * @param {string} [poljeZaNaziv='naziv'] - The name of the property that holds the name.
 * @returns {Promise<number|null>} The ID of the item.
 */
export async function pronadjiIliStvoriId(
  fileName,
  nazivStavke,
  poljeZaNaziv = "naziv",
) {
  if (!nazivStavke) return null;

  const response = await fetch(fileName);
  const text = await response.text();
  let stavke = text ? JSON.parse(text) : [];

  const postojecaStavka = stavke.find(
    (s) => s[poljeZaNaziv].toLowerCase() === nazivStavke.toLowerCase(),
  );

  if (postojecaStavka) {
    return postojecaStavka.id;
  } else {
    const noviId =
      stavke.length > 0 ? Math.max(...stavke.map((s) => s.id)) + 1 : 1;
    const novaStavka = { id: noviId, [poljeZaNaziv]: nazivStavke };
    stavke.push(novaStavka);

    await spremiJSON(fileName, stavke);
    return noviId;
  }
}
