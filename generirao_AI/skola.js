class Skola {
  constructor() {
    this.ucionice = {}; // Koristimo objekt (mapu) za brzi pristup po ID-u
    this.predmeti = {};
    this.profesori = {};
    this.razredi = {};
    this.zaduzenja = []; // Zaduzenja držimo kao niz jer ih sortiramo
  }

  // Glavna funkcija za učitavanje
  async ucitajSvePodatke() {
    try {
      // Pokrećemo sva učitavanja paralelno
      const [
        ucioniceData,
        predmetiData,
        profesoriData,
        razrediData,
        kurikulumData,
      ] = await Promise.all([
        this.dohvatiJSON("ucionice.json"),
        this.dohvatiJSON("predmeti.json"),
        this.dohvatiJSON("profesori.json"),
        this.dohvatiJSON("razredi.json"),
        this.dohvatiJSON("kurikulum.json"),
      ]);

      // Pretvaramo sirove podatke u naše Klase
      this.mapirajPodatke(ucioniceData, Ucionica, this.ucionice);
      this.mapirajPodatke(predmetiData, Predmet, this.predmeti);
      this.mapirajPodatke(profesoriData, Profesor, this.profesori);
      this.mapirajPodatke(razrediData, Razred, this.razredi);

      // ... unutar ucitajSvePodatke() ...

      // Zaduženja su niz
      let sirovaZaduzenja = kurikulumData.map((z) => new Zaduzenje(z));
      this.zaduzenja = [];

      // EKSPANDIRANJE ZADUŽENJA
      // Ako predmet ima 4 sata, stvaramo 4 instance zaduženja
      sirovaZaduzenja.forEach((z) => {
        let preostalo = z.broj_sati;
        while (preostalo > 0) {
          // Kopiramo zaduženje
          let novoZaduzenje = Object.assign(
            Object.create(Object.getPrototypeOf(z)),
            z,
          );
          // Jedinstveni ID za internu upotrebu (da se ne miješaju u matricama)
          novoZaduzenje.id = z.id + "_" + preostalo;
          novoZaduzenje.rijeseno = false;

          if (z.blok && preostalo >= 2) {
            novoZaduzenje.blok = true; // Ovo je instanca koja traje 2 sata
            preostalo -= 2;
          } else {
            novoZaduzenje.blok = false; // Ovo je instanca od 1 sat
            preostalo -= 1;
          }
          this.zaduzenja.push(novoZaduzenje);
        }
      });

      // ... nastavi s return true ...

      // Zaduženja su niz, ne mapa
      this.zaduzenja = kurikulumData.map((z) => new Zaduzenje(z));

      console.log("Svi podaci uspješno učitani!");
      return true;
    } catch (error) {
      console.error("Greška pri učitavanju podataka:", error);
      return false;
    }
  }

  // Pomoćna funkcija za fetch
  async dohvatiJSON(datoteka) {
    const response = await fetch(datoteka);
    if (!response.ok) throw new Error(`Nije moguće učitati ${datoteka}`);
    return await response.json();
  }

  // Pomoćna funkcija za mapiranje (pretvara niz u objekt s ID-em kao ključem)
  mapirajPodatke(siroviPodaci, Klasa, ciljniObjekt) {
    siroviPodaci.forEach((item) => {
      ciljniObjekt[item.id] = new Klasa(item);
    });
  }

  // Getteri
  getProfesor(id) {
    return this.profesori[id];
  }
  getUcionica(id) {
    return this.ucionice[id];
  }
  // ...
}
