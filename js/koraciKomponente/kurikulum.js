import { createStrictAutocompleteInput, initializeAutocomplete } from "../korakProzor.js";
import { dohvatiPrijedloge } from "../upraviteljPrijedloga.js";

export async function prikaziKurikulum() {
    const modalBody = document.querySelector(".modal-body");

    const razredAutocompleteHTML = createStrictAutocompleteInput("Odaberi Razred", "npr. 1.a");

    modalBody.innerHTML = `
        <div class="kurikulum-container">
            <div class="kurikulum-left">
                ${razredAutocompleteHTML}
            </div>
            <div class="kurikulum-right">
                <!-- Ovdje dolazi desna strana -->
            </div>
        </div>
    `;

    const razredInput = modalBody.querySelector("input");
    const razrediPrijedlozi = await dohvatiPrijedloge("razredi", (razred) => razred.oznaka);
    initializeAutocomplete(razredInput, razrediPrijedlozi);
}