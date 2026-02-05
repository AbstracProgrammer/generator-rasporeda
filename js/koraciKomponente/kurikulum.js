import { createStrictAutocompleteInput, initializeAutocomplete } from "../korakProzor.js";
import { dohvatiPrijedloge } from "../upraviteljPrijedloga.js";

export async function prikaziKurikulum() {
    const modalBody = document.querySelector(".modal-body");

    // 1. Create HTML for both inputs
    const razredAutocompleteHTML = createStrictAutocompleteInput("Odaberi Razred", "npr. 1.a");
    const programAutocompleteHTML = createStrictAutocompleteInput("Odaberi Program", "npr. Opća gimnazija");

    modalBody.innerHTML = `
        <div class="kurikulum-container">
            <div class="kurikulum-left">
                <div id="razred-selector-wrapper">
                    ${razredAutocompleteHTML}
                </div>
                <div id="program-selector-wrapper">
                    ${programAutocompleteHTML}
                </div>
            </div>
            <div class="kurikulum-right">
                <!-- Ovdje dolazi desna strana -->
            </div>
        </div>
    `;

    // 2. Fetch suggestions for both
    const razrediPrijedlozi = await dohvatiPrijedloge("razredi", (razred) => razred.oznaka);
    const programiPrijedlozi = await dohvatiPrijedloge("program", (program) => program.naziv);

    // 3. Initialize both autocompletes using specific selectors
    const razredInput = modalBody.querySelector("#razred-selector-wrapper input");
    initializeAutocomplete(razredInput, razrediPrijedlozi);

    const programInput = modalBody.querySelector("#program-selector-wrapper input");
    initializeAutocomplete(programInput, programiPrijedlozi);
}