class GeneratorRasporeda {
  constructor(skola) {
    this.skola = skola;
    this.konacniRaspored = [];

    // KONSTANTE
    this.DANI = ["Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak"];
    this.BROJ_DANA = 5;
    this.BROJ_SATI = 7; // 0 do 6 (ili 1 do 7, ovisno kako gledamo, programski je 0-6)

    // MATRICE ZAUZETOSTI (Cache za brzu provjeru)
    // Format: this.zauzetostProfesor[profId][danIndex][satIndex] = true/false
    this.zauzetostProfesor = {};
    this.zauzetostRazred = {};
    this.zauzetostUcionica = {};
  }

  generiraj() {
    console.log("Počinjem generiranje rasporeda...");

    // 1. Inicijalizacija matrica
    this.inicijalizirajMatrice();

    // 2. Sortiranje zaduženja (Heuristika: teža zaduženja prva)
    // Grupiramo paralelne predmete da budu jedni do drugih
    this.sortirajZaduzenja();

    // 3. Pokretanje rekurzije
    if (this.rijesi(0)) {
      console.log("USPJEH! Raspored generiran.");
      return this.pretvoriUFormatZaIspis();
    } else {
      console.error("NEUSPJEH: Nemoguće generirati raspored s ovim uvjetima.");
      return null;
    }
  }

  inicijalizirajMatrice() {
    // Resetiramo sve na false
    const resetMatrix = () => {
      let m = {};
      for (let d = 0; d < this.BROJ_DANA; d++) {
        m[d] = {};
        for (let s = 0; s < this.BROJ_SATI; s++) {
          m[d][s] = null; // null znači slobodno
        }
      }
      return m;
    };

    // Inicijaliziraj za svakog profesora
    for (let id in this.skola.profesori) {
      this.zauzetostProfesor[id] = resetMatrix();
    }
    // Inicijaliziraj za svaki razred
    for (let id in this.skola.razredi) {
      this.zauzetostRazred[id] = resetMatrix();
    }
    // Inicijaliziraj za svaku učionicu
    for (let id in this.skola.ucionice) {
      this.zauzetostUcionica[id] = resetMatrix();
    }
  }

  sortirajZaduzenja() {
    // Sortiramo tako da blok satovi i paralelne grupe idu prvi
    this.skola.zaduzenja.sort((a, b) => {
      // Bodovanje 'težine' zaduženja
      const scoreA =
        (a.paralelna_grupa ? 100 : 0) + (a.blok ? 50 : 0) + a.broj_sati * 5;
      const scoreB =
        (b.paralelna_grupa ? 100 : 0) + (b.blok ? 50 : 0) + b.broj_sati * 5;
      return scoreB - scoreA;
    });
  }

  // --- GLAVNA REKURZIVNA FUNKCIJA (BACKTRACKING) ---
  rijesi(indexZaduzenja) {
    // 1. BAZNI SLUČAJ: Sva zaduženja su riješena
    if (indexZaduzenja >= this.skola.zaduzenja.length) {
      return true;
    }

    const zaduzenje = this.skola.zaduzenja[indexZaduzenja];

    // Ako je zaduženje već riješeno (npr. bilo je dio paralelne grupe koju smo riješili ranije), preskoči
    if (zaduzenje.rijeseno) {
      return this.rijesi(indexZaduzenja + 1);
    }

    // 2. DETEKCIJA GRUPE (Etika/Vjeronauk)
    let grupaZaduzenja = [zaduzenje];
    if (zaduzenje.paralelna_grupa) {
      // Pronađi sve ostale neriješene iz iste grupe
      const ostatak = this.skola.zaduzenja.filter(
        (z) =>
          z.id !== zaduzenje.id &&
          z.paralelna_grupa === zaduzenje.paralelna_grupa &&
          !z.rijeseno,
      );
      grupaZaduzenja = [...grupaZaduzenja, ...ostatak];
    }

    // Koliko sati trebamo smjestiti? (Ako je blok, tražimo 2, inače 1)
    // Pretpostavka: Svi u paralelnoj grupi imaju isti zahtjev za blokom/trajanjem
    const trajanje = zaduzenje.blok ? 2 : 1;
    const preostaloSati = zaduzenje.broj_sati; // Ovo moramo smanjivati kroz iteracije, ali ovdje radimo atomski po jedan termin/blok

    // Ako predmet ima 4 sata tjedno, a blok je false, ova funkcija se brine za smještaj SAMO PRVOG termina.
    // Zato moramo zaduženje "razbiti" ili pamtiti koliko je još sati ostalo.
    // *POJEDNOSTAVLJENJE ZA MODEL*: Pretpostavit ćemo da su u listi `zaduzenja`
    // svaki sat zaseban entitet (ako je Matematika 4 sata, imamo 4 zaduženja u listi).
    // Ako nisi tako napravio u JSON-u, morat ćemo prilagoditi logiku.
    // *PRETPOSTAVLJAM*: Da je u JSON-u jedan zapis "Matematika 4 sata".
    // U tom slučaju, backtracking mora znati da li smo smjestili svih 4.

    // Zbog kompleksnosti, implementirat ću logiku gdje `rijesi` smješta JEDAN TERMIN (ili blok).
    // Ako zaduženje ima još sati, smanjit ćemo brojač i ostati na istom indexu!

    // Ali čekaj, to komplicira rekurziju.
    // BOLJI PRISTUP: Pri učitavanju (u skola.js ili ovdje na početku)
    // ćemo "raspršiti" zaduženja. Ako je Mat 4 sata, napravit ćemo 4 objekta zaduženja.
    // To drastično pojednostavljuje algoritam.
    // Pitat ću te za ovo, ali sada pišem kod pod pretpostavkom da rješavamo 1 instancu.

    // 3. TRAŽENJE TERMINA (Iteracija po danima i satima)
    for (let d = 0; d < this.BROJ_DANA; d++) {
      // Optimizacija: Ako je blok sat, idemo samo do predzadnjeg sata
      let maxSat = trajanje === 2 ? this.BROJ_SATI - 1 : this.BROJ_SATI;

      for (let s = 0; s < maxSat; s++) {
        // 4. PROVJERA VALJANOSTI ZA CIJELU GRUPU
        let moguciTermin = true;
        let dodijeljeneUcionice = []; // Pamtimo koje smo učionice uzeli da ne uzmemo istu za dva člana grupe

        for (let z of grupaZaduzenja) {
          // Pronađi učionicu za ovo zaduženje u ovom terminu
          const ucionica = this.pronadiSlobodnuUcionicu(
            z,
            d,
            s,
            trajanje,
            dodijeljeneUcionice,
          );

          if (!ucionica || !this.isTerminValidan(z, ucionica, d, s, trajanje)) {
            moguciTermin = false;
            break;
          }
          // Privremeno pamtimo učionicu za ovaj pokušaj
          dodijeljeneUcionice.push({ zaduzenjeId: z.id, ucionica: ucionica });
        }

        if (moguciTermin) {
          // 5. PRIMJENI POTEZ (Zauzmi resurse)
          this.zauzmiResurse(
            grupaZaduzenja,
            dodijeljeneUcionice,
            d,
            s,
            trajanje,
          );

          // Označi zaduženja kao riješena (ili smanji broj preostalih sati)
          // Ovdje koristimo logiku: Ako smo smjestili, idemo dalje.
          // NAPOMENA: Ovdje bi trebala logika za "Preostalo sati > 0",
          // ali za sada pretpostavljamo da je input lista već atomizirana.
          grupaZaduzenja.forEach((z) => (z.rijeseno = true));

          // 6. REKURZIVNI POZIV
          if (this.rijesi(indexZaduzenja + 1)) {
            return true; // Uspjeli smo sve do kraja!
          }

          // 7. BACKTRACKING (Poništi potez ako nismo uspjeli dalje)
          this.oslobodiResurse(grupaZaduzenja, d, s, trajanje);
          grupaZaduzenja.forEach((z) => (z.rijeseno = false));
        }
      }
    }

    return false; // Nismo našli termin ni u jednom danu
  }

  // --- POMOĆNE FUNKCIJE ---

  isTerminValidan(zaduzenje, ucionica, dan, sat, trajanje) {
    // Provjeri profesora
    const prof = this.skola.profesori[zaduzenje.profesor_id];
    for (let t = 0; t < trajanje; t++) {
      let s = sat + t;

      // 1. Profesorova ograničenja (iz JSON-a)
      if (!prof.jeDostupan(dan + 1, s + 1)) return false; // +1 jer je u JSON-u 1-based, a ovdje 0-based

      // 2. Je li profesor već zauzet?
      if (this.zauzetostProfesor[prof.id][dan][s]) return false;

      // 3. Jesu li razredi zauzeti?
      for (let razredId of zaduzenje.razredi_id) {
        if (this.zauzetostRazred[razredId][dan][s]) return false;
      }

      // 4. Je li učionica zauzeta? (Ovo smo tehnički provjerili pri odabiru, ali double-check)
      if (this.zauzetostUcionica[ucionica.id][dan][s]) return false;
    }
    return true;
  }

  pronadiSlobodnuUcionicu(zaduzenje, dan, sat, trajanje, vecZauzeteUcionice) {
    // 1. Koji tip tražimo?
    const predmet = this.skola.predmeti[zaduzenje.predmet_id];
    console.log(predmet);
    const trazeniTip = predmet.potreban_tip_ucionice;

    // 2. Filtriraj sve učionice škole
    let kandidati = Object.values(this.skola.ucionice).filter((u) => {
      // Mora podržavati tip
      if (!u.podrzavaTip(trazeniTip)) return false;

      // Ne smije biti u listi onih koje smo već rezervirali za paralenu grupu u ovom istom koraku
      if (vecZauzeteUcionice.some((x) => x.ucionica.id === u.id)) return false;

      // Mora biti slobodna u traženom vremenu (i bloku)
      for (let t = 0; t < trajanje; t++) {
        if (this.zauzetostUcionica[u.id][dan][sat + t]) return false;
      }
      return true;
    });

    // 3. Sortiraj po prioritetu (manji broj = veći prioritet)
    kandidati.sort((a, b) => a.prioritet - b.prioritet);

    // Vrati najbolju (prvu) ili null
    return kandidati.length > 0 ? kandidati[0] : null;
  }

  zauzmiResurse(grupaZaduzenja, dodijeljeneUcionice, dan, sat, trajanje) {
    grupaZaduzenja.forEach((z) => {
      const ucionicaInfo = dodijeljeneUcionice.find(
        (x) => x.zaduzenjeId === z.id,
      );
      const ucionica = ucionicaInfo.ucionica;

      // Spremi u konačni rezultat
      this.konacniRaspored.push({
        zaduzenje: z,
        ucionica: ucionica,
        dan: this.DANI[dan],
        sat: sat + 1, // Za ispis 1-based
        trajanje: trajanje,
      });

      for (let t = 0; t < trajanje; t++) {
        let s = sat + t;
        // Markiraj matrice
        this.zauzetostProfesor[z.profesor_id][dan][s] = z.id;
        this.zauzetostUcionica[ucionica.id][dan][s] = z.id;
        z.razredi_id.forEach((rid) => {
          this.zauzetostRazred[rid][dan][s] = z.id;
        });
      }
    });
  }

  oslobodiResurse(grupaZaduzenja, dan, sat, trajanje) {
    grupaZaduzenja.forEach((z) => {
      // Ukloni iz konačnog rasporeda
      // (Ovo je malo sporo array filter, ali za prototip ok.
      // Bolje bi bilo imati stack promjena, ali da ne kompliciram sad.)
      this.konacniRaspored = this.konacniRaspored.filter(
        (item) => item.zaduzenje.id !== z.id,
      );

      for (let t = 0; t < trajanje; t++) {
        let s = sat + t;
        this.zauzetostProfesor[z.profesor_id][dan][s] = null;
        // Učionicu moramo naći koja je bila (ovo je malo tricky u backtracking cleanupu)
        // Zato je bolje koristiti ID zaduženja u matricama, što sam i napravio.

        // Čišćenje učionica: prođi kroz sve i ako je ID zaduženja moj, briši
        for (let uid in this.zauzetostUcionica) {
          if (this.zauzetostUcionica[uid][dan][s] === z.id) {
            this.zauzetostUcionica[uid][dan][s] = null;
          }
        }

        z.razredi_id.forEach((rid) => {
          this.zauzetostRazred[rid][dan][s] = null;
        });
      }
    });
  }

  pretvoriUFormatZaIspis() {
    // Samo vraćamo niz objekata koji si vidio gore
    return this.konacniRaspored;
  }
}
