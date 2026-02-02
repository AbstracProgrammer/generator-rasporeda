// 1. KLASA ZA UČIONICU
class Ucionica {
  constructor(data) {
    this.id = data.id;
    this.naziv = data.naziv;
    this.tipovi = data.tip; // Array stringova
    this.prioritet = data.prioritet || 3; // Default 3
  }

  // Provjera tipa (JS ima metodu .includes za nizove)
  podrzavaTip(trazeniTip) {
    return this.tipovi.includes(trazeniTip);
  }
}

// 2. KLASA ZA PREDMET
class Predmet {
  constructor(data) {
    this.id = data.id;
    this.naziv = data.naziv;
    this.potreban_tip_ucionice = data.potreban_tip_ucionice;
  }
}

// 3. KLASA ZA PROFESORA
class Profesor {
  constructor(data) {
    this.id = data.id;
    this.ime = `${data.ime} ${data.prezime}`;
    this.struka_ids = data.struka_predmeti_id;
    // Pazi: u JS-u objekti često imaju string ključeve
    this.ogranicenja = data.ogranicenja?.nedostupan || {};
    this.fiksna_ucionica = data.ogranicenja?.fiksna_ucionica_id || null;
  }

  // Provjera dostupnosti
  jeDostupan(dan, sat) {
    // Pretvaramo dan u string jer su ključevi u JSON-u stringovi ("1", "2"...)
    const danStr = String(dan);

    if (this.ogranicenja.hasOwnProperty(danStr)) {
      // Ako je sat u listi nedozvoljenih, vrati false
      if (this.ogranicenja[danStr].includes(sat)) {
        return false;
      }
    }
    return true;
  }
}

// 4. KLASA ZA RAZRED
class Razred {
  constructor(data) {
    this.id = data.id;
    this.oznaka = data.oznaka;
    this.smjena = data.smjena;
  }
}

// 5. KLASA ZA ZADUŽENJE (Kurikulum)
class Zaduzenje {
  constructor(data) {
    this.id = data.id;
    this.naziv = data.naziv_zaduženja;
    this.profesor_id = data.profesor_id;
    this.predmet_id = data.predmet_id;
    this.razredi_id = data.razredi_id; // Array ID-ova
    this.broj_sati = data.sati_tjedno;
    this.blok = data.zeljeni_blok_sat;
    this.paralelna_grupa = data.paralelna_grupa_id;
    this.fiksna_ucionica = data.fiksna_ucionica_id;
  }
}
