// Salad shaker: vælger én tilfældig ingrediens fra hver kategori og lægger den i skålen.

// Hvor hver kategori lægges i skålen (x, y i skålens koordinater) og hvor stor den tegnes.
const PLACERING = {
  // Basen er en lav bunke, der fylder skålens åbning. Den nederste del skjules af skålens forkant.
  base:    { str: 84, pos: [[92, 132], [150, 116], [200, 108], [250, 116], [308, 132], [140, 146], [200, 140], [260, 146]] },
  // Toppings: to store klatter pr. ingrediens, spredt ud over bunken.
  sproedt: { str: 54, pos: [[132, 106], [228, 140]] },
  bloedt:  { str: 54, pos: [[252, 104], [112, 140]] },
  uventet: { str: 54, pos: [[170, 138], [302, 116]] },
  protein: { str: 60, pos: [[192, 106], [282, 142]] },
};
const STANDARD_PLACERING = { str: 54, pos: [[200, 120], [140, 130]] };
const SVG_NS = "http://www.w3.org/2000/svg";
let kategorier = [];
let sidste = {};
const laast = new Set(); // kategorier som Shake ikke rører
const udeladt = new Set(); // kategorier der er taget ud af salaten

// Kostvalg: hvert valg udelukker ingredienser med bestemte mærker i "indeholder".
// Lille lager i browseren. Virker siden også uden (fx i privat vindue).
const lager = {
  hent(n) { try { return localStorage.getItem(n); } catch (e) { return null; } },
  gem(n, v) { try { localStorage.setItem(n, v); } catch (e) {} },
};

const KOST = [
  { id: "vegetar", navn: "Vegetar", uden: ["kød", "fisk"] },
  { id: "pescetar", navn: "Pescetar", uden: ["kød"] },
  { id: "vegansk", navn: "Vegansk", uden: ["kød", "fisk", "æg", "mælk"] },
  { id: "glutenfri", navn: "Glutenfri", uden: ["gluten"] },
  { id: "laktosefri", navn: "Laktosefri", uden: ["mælk"] },
  { id: "lowcarb", navn: "Low carb", uden: ["kulhydrat"] },
];
const valgtKost = new Set();
function udelukket() {
  const s = new Set();
  for (const k of KOST) if (valgtKost.has(k.id)) k.uden.forEach((u) => s.add(u));
  return s;
}
// Ingredienserne i en kategori, som passer til kostvalget.
function tilladt(kat) {
  const uden = udelukket();
  return kat.ingredienser.filter((i) => passer(i, uden));
}
function passer(ingrediens, uden = udelukket()) {
  return !(ingrediens.indeholder || []).some((x) => uden.has(x));
}

// Det har jeg hjemme: Shake vælger blandt dem, hvis der er nogen i kategorien.
const hjemme = new Set();
try { (JSON.parse(lager.hent("hjemme")) || []).forEach((n) => hjemme.add(n)); } catch (e) {}

// Antal personer, som mængder og dressing regnes ud fra. Opskrifterne er skrevet til 2.
let personer = Number(lager.hent("personer")) || 2;
const FLERTAL = { "håndfuld": "håndfulde", skive: "skiver", stilk: "stilke", "dåse": "dåser", kugle: "kugler" };
const BROEK = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
function visTal(x) {
  const hel = Math.floor(x), rest = Math.round((x - hel) * 4) / 4;
  if (rest === 1) return String(hel + 1);
  if (!rest) return String(hel);
  return (hel ? hel : "") + BROEK[rest];
}
function maengdeTekst(ingrediens) {
  if (!ingrediens.maengde) return "";
  const [pr, enhed] = ingrediens.maengde;
  let x = pr * personer;
  if (enhed === "g") {
    x = x < 100 ? Math.round(x / 5) * 5 : Math.round(x / 10) * 10;
    return `${x} g`;
  }
  x = Math.max(0.25, Math.round(x * 4) / 4);
  const ord = x > 1 && FLERTAL[enhed] ? FLERTAL[enhed] : enhed;
  return `${visTal(x)} ${ord}`;
}
// Skalér tallene i en opskriftslinje (skrevet til 2 personer).
function skalerLinje(linje) {
  const f = personer / 2;
  if (f === 1) return linje;
  const tal = (s) => (s === "½" ? 0.5 : Number(s));
  return linje.replace(/(\d+|½)(?:-(\d+))?/g, (_, a, b) => visTal(tal(a) * f) + (b ? "-" + visTal(tal(b) * f) : ""));
}



async function hentIngredienser() {
  if (window.INGREDIENSER) return window.INGREDIENSER;
  const svar = await fetch("ingredienser.json", { cache: "no-cache" });
  if (!svar.ok) throw new Error("Kunne ikke hente ingredienser.json");
  return svar.json();
}

function vaelg(kat) {
  let liste = tilladt(kat);
  const harJeg = liste.filter((i) => hjemme.has(i.navn));
  if (harJeg.length) liste = harJeg;
  if (liste.length === 0) return null;
  let i = Math.floor(Math.random() * liste.length);
  // Undgå at få præcis den samme ingrediens to gange i træk.
  if (liste.length > 1 && liste[i] === sidste[kat.id]) i = (i + 1 + Math.floor(Math.random() * (liste.length - 1))) % liste.length;
  sidste[kat.id] = liste[i];
  return liste[i];
}

function tegnIngrediens(gruppe, ingrediens, placering) {
  for (let [x, y] of placering.pos) {
    x += Math.round(Math.random() * 10 - 5);
    y += Math.round(Math.random() * 6 - 3);
    if (ingrediens.billede) {
      const img = document.createElementNS(SVG_NS, "image");
      const s = placering.str * 1.3 * (ingrediens.skala || 1);
      img.setAttribute("href", ingrediens.billede);
      img.setAttribute("x", x - s / 2);
      img.setAttribute("y", y - s / 2);
      img.setAttribute("width", s);
      img.setAttribute("height", s);
      img.setAttribute("transform", `rotate(${Math.round(Math.random() * 60 - 30)} ${x} ${y})`);
      gruppe.appendChild(img);
    } else {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", x);
      t.setAttribute("y", y);
      t.setAttribute("font-size", placering.str);
      t.textContent = ingrediens.emoji || "•";
      gruppe.appendChild(t);
    }
  }
}

// Dressingen står i en lille flaske med patentlåg ved siden af skålen, tegnet i samme stil som skålen.
const FLASKE = "M359 272 Q354 272 354 267 L354 228 Q354 216 364 208 L364 190 L376 190 L376 208 Q386 216 386 228 L386 267 Q386 272 381 272 Z";
const KRYDDERI = [[360, 244], [372, 240], [380, 252], [364, 258], [376, 262], [368, 250], [381, 238], [358, 264]];
function tegnDressing(gruppe, ingrediens) {
  const el = (navn, attr) => {
    const e = document.createElementNS(SVG_NS, navn);
    for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
    gruppe.appendChild(e);
    return e;
  };
  const farve = ingrediens.farve || "#D9A520";
  el("ellipse", { class: "flaske-skygge", cx: 370, cy: 273, rx: 22, ry: 3 });
  el("path", { class: "glas", d: FLASKE });
  // Dressingen fylder flasken op til skuldrene.
  el("path", { d: "M355.5 234 L384.5 234 L384.5 267 Q384.5 270.5 381 270.5 L359 270.5 Q355.5 270.5 355.5 267 Z", fill: farve });
  el("ellipse", { cx: 370, cy: 234, rx: 14.5, ry: 2.2, fill: farve, class: "glas-overflade" });
  for (const [x, y] of KRYDDERI) el("circle", { cx: x, cy: y, r: 0.9, class: "krydderi" });
  el("path", { class: "glas-kant", d: FLASKE });
  el("path", { class: "glas-glans", d: "M358.5 230 L358.5 264" });
  // Patentlåg: hvid prop, rød gummiring og ståltråd.
  el("path", { class: "flaske-wire", d: "M362 182 L361 197 Q360 200 363 200 M378 182 L379 197 Q380 200 377 200" });
  el("rect", { class: "flaske-ring", x: 363, y: 185.5, width: 14, height: 3, rx: 1 });
  el("rect", { class: "flaske-prop", x: 363.5, y: 176, width: 13, height: 10, rx: 4 });
}

// Lag i skålen: én gruppe pr. kategori, så en enkelt kategori kan skiftes ud.
function kategoriGruppe(kat) {
  // Dressingen står i sin egen lille skål foran den store; resten ligger i skålen.
  const indhold = document.getElementById(kat.id === "dressing" ? "flaske" : "indhold");
  let gruppe = indhold.querySelector(`g[data-kat="${kat.id}"]`);
  if (!gruppe) {
    gruppe = document.createElementNS(SVG_NS, "g");
    gruppe.dataset.kat = kat.id;
    indhold.appendChild(gruppe);
  }
  return gruppe;
}

function tegnKategori(kat, ingrediens) {
  const gruppe = kategoriGruppe(kat);
  gruppe.replaceChildren();
  if (kat.id === "dressing") {
    tegnDressing(gruppe, ingrediens);
    visDressingOpskrift(ingrediens);
  }
  else tegnIngrediens(gruppe, ingrediens, PLACERING[kat.id] || STANDARD_PLACERING);
  return gruppe;
}

// Små byttere i dressingopskrifterne, så de passer til kostvalget.
function tilpasLinje(linje) {
  if (valgtKost.has("vegansk")) linje = linje.replace(/honning/g, "agavesirup");
  if (valgtKost.has("glutenfri")) linje = linje.replace(/\bsoja\b/g, "tamari (glutenfri soja)");
  return linje;
}

function visDressingOpskrift(ingrediens) {
  const boks = document.getElementById("dressing-opskrift");
  if (!ingrediens.opskrift || ingrediens.opskrift.length === 0) {
    boks.hidden = true;
    return;
  }
  document.getElementById("dressing-navn").textContent = ingrediens.navn.toLowerCase();
  document.getElementById("dressing-liste").replaceChildren(
    ...ingrediens.opskrift.map((linje) => {
      const li = document.createElement("li");
      li.textContent = skalerLinje(tilpasLinje(linje));
      return li;
    })
  );
  boks.hidden = false;
}

function lavIkon(ingrediens) {
  const ikon = document.createElement("span");
  if (ingrediens.billede) {
    ikon.className = "ikon";
    const img = document.createElement("img");
    img.src = ingrediens.billede;
    img.alt = "";
    ikon.appendChild(img);
  } else if (ingrediens.farve && !ingrediens.emoji) {
    ikon.className = "ikon";
    const klat = document.createElement("span");
    klat.className = "klat";
    klat.style.background = ingrediens.farve;
    ikon.appendChild(klat);
  } else {
    ikon.className = "ikon";
    ikon.textContent = ingrediens.emoji || "•";
  }
  ikon.setAttribute("aria-hidden", "true");
  return ikon;
}

const PIL = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PIL_TILBAGE = PIL("M15 5l-7 7 7 7");
const PIL_FREM = PIL("M9 5l7 7-7 7");

function lavPil(kat, retning) {
  const knap = document.createElement("button");
  knap.type = "button";
  knap.className = "pil " + (retning < 0 ? "tilbage" : "frem");
  knap.innerHTML = retning < 0 ? PIL_TILBAGE : PIL_FREM;
  knap.addEventListener("click", () => {
    // Hold pilen samme sted på skærmen: siden må ikke blive kortere (så browseren ruller), og flytter
    // noget over pilen sig, ruller vi tilsvarende tilbage. Så kan man klikke flere gange samme sted.
    const foer = knap.getBoundingClientRect().top;
    document.body.style.minHeight = document.documentElement.scrollHeight + "px";
    skiftEn(kat, retning);
    const efter = knap.getBoundingClientRect().top;
    if (Math.abs(efter - foer) > 0.5) window.scrollBy(0, efter - foer);
  });
  return knap;
}

const LAAS_AABEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V7a4 4 0 0 1 7.5-1.9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const LAAS_LUKKET = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

function lavLaas(kat) {
  const knap = document.createElement("button");
  knap.type = "button";
  knap.className = "laas";
  knap.addEventListener("click", () => {
    if (laast.has(kat.id)) laast.delete(kat.id);
    else laast.add(kat.id);
    visLaas(kat);
  });
  return knap;
}

function visLaas(kat) {
  const li = document.querySelector(`#liste li[data-kat="${kat.id}"]`);
  if (!li) return;
  const er = laast.has(kat.id);
  const knap = li.querySelector(".laas");
  knap.innerHTML = er ? LAAS_LUKKET : LAAS_AABEN;
  knap.setAttribute("aria-pressed", er);
  const navn = kat.navn.toLowerCase();
  knap.setAttribute("aria-label", er ? `Lås ${navn} op` : `Behold ${navn}, når du ryster`);
  knap.title = er ? "Låst: bliver, når du ryster" : "Lås, så den bliver, når du ryster";
  li.classList.toggle("laast", er);
}

function opdaterRaekke(kat, ingrediens) {
  const liste = document.getElementById("liste");
  let li = liste.querySelector(`li[data-kat="${kat.id}"]`);
  if (!li) {
    li = document.createElement("li");
    li.dataset.kat = kat.id;
    const tekst = document.createElement("span");
    tekst.className = "tekst";
    tekst.innerHTML = '<span class="kat"></span><span class="navn"></span><span class="maengde"></span><span class="tip"></span>';
    tekst.querySelector(".kat").innerHTML = '<span class="kat-navn"></span> <span class="nr"></span>';
    tekst.querySelector(".kat-navn").textContent = kat.navn;
    const pile = document.createElement("span");
    pile.className = "pile";
    pile.append(lavLaas(kat), lavPil(kat, -1), lavPil(kat, 1));
    // Ikonet er også en knap: tryk for at tage kategorien ud af salaten.
    const ikonKnap = document.createElement("button");
    ikonKnap.type = "button";
    ikonKnap.className = "udelad";
    ikonKnap.append(document.createElement("span"), Object.assign(document.createElement("span"), { className: "maerke" }));
    ikonKnap.addEventListener("click", () => skiftUdeladt(kat));
    li.append(ikonKnap, tekst, pile);
    liste.appendChild(li);
  }
  li.querySelector(".udelad").firstChild.replaceWith(lavIkon(ingrediens));
  li.querySelector(".navn").textContent = ingrediens.navn;
  const nr = tilladt(kat).indexOf(ingrediens) + 1;
  const ialt = tilladt(kat).length;
  li.querySelector(".nr").textContent = `${nr}/${ialt}`;
  const navn = kat.navn.toLowerCase();
  li.querySelector(".pil.tilbage").setAttribute("aria-label", `Forrige ${navn} (${nr} af ${ialt})`);
  li.querySelector(".pil.tilbage").title = `Forrige ${navn}`;
  li.querySelector(".pil.frem").setAttribute("aria-label", `Næste ${navn} (${nr} af ${ialt})`);
  li.querySelector(".pil.frem").title = `Næste ${navn}`;
  visDetaljer(li, ingrediens);
  visLaas(kat);
  visUdeladt(kat);
  return li;
}

function visDetaljer(li, ingrediens) {
  const m = [maengdeTekst(ingrediens), hjemme.has(ingrediens.navn) ? "har du hjemme" : ""].filter(Boolean).join(" · ");
  li.querySelector(".maengde").textContent = m;
  li.querySelector(".tip").textContent = ingrediens.tip || "";
}
function opdaterAlleRaekker() {
  for (const kat of kategorier) if (sidste[kat.id]) opdaterRaekke(kat, sidste[kat.id]);
  if (sidste.dressing && !udeladt.has("dressing")) visDressingOpskrift(sidste.dressing);
}

// Vælger til antal personer.
function lavPersoner() {
  const boks = document.getElementById("personer");
  for (const n of [1, 2, 4, 6]) {
    const knap = document.createElement("button");
    knap.type = "button";
    knap.textContent = n;
    knap.dataset.n = n;
    knap.setAttribute("aria-label", n === 1 ? "1 person" : `${n} personer`);
    knap.addEventListener("click", () => {
      personer = n;
      lager.gem("personer", n);
      visPersoner();
      opdaterAlleRaekker();
    });
    boks.appendChild(knap);
  }
  visPersoner();
}
function visPersoner() {
  for (const k of document.querySelectorAll("#personer button")) k.setAttribute("aria-pressed", Number(k.dataset.n) === personer);
  document.getElementById("dressing-til").textContent = personer === 1 ? "1 person" : `${personer} personer`;
}

// Det har jeg hjemme: knapper for alle ingredienser, grupperet efter kategori.
function lavHjemme() {
  const boks = document.getElementById("hjemme-liste");
  for (const kat of kategorier) {
    if (kat.id === "dressing") continue;
    const gruppe = document.createElement("div");
    gruppe.className = "hjemme-gruppe";
    const h = document.createElement("h4");
    h.textContent = kat.navn;
    const knapper = document.createElement("div");
    knapper.className = "hjemme-knapper";
    for (const i of kat.ingredienser) {
      const knap = document.createElement("button");
      knap.type = "button";
      knap.className = "kost-knap";
      knap.textContent = i.navn;
      knap.dataset.navn = i.navn;
      knap.addEventListener("click", () => {
        if (hjemme.has(i.navn)) hjemme.delete(i.navn);
        else hjemme.add(i.navn);
        lager.gem("hjemme", JSON.stringify([...hjemme]));
        visHjemme();
        opdaterAlleRaekker();
      });
      knapper.appendChild(knap);
    }
    gruppe.append(h, knapper);
    boks.appendChild(gruppe);
  }
  document.getElementById("hjemme-ryd").addEventListener("click", () => {
    hjemme.clear();
    lager.gem("hjemme", "[]");
    visHjemme();
    opdaterAlleRaekker();
  });
  visHjemme();
}
function visHjemme() {
  for (const k of document.querySelectorAll("#hjemme-liste .kost-knap")) k.setAttribute("aria-pressed", hjemme.has(k.dataset.navn));
  document.getElementById("hjemme-antal").textContent = hjemme.size ? ` (${hjemme.size})` : "";
  document.getElementById("hjemme-ryd").hidden = hjemme.size === 0;
}

// Tag en kategori ud af salaten, eller sæt den ind igen.
function skiftUdeladt(kat) {
  if (udeladt.has(kat.id)) udeladt.delete(kat.id);
  else udeladt.add(kat.id);
  const gruppe = kategoriGruppe(kat);
  if (udeladt.has(kat.id)) {
    gruppe.replaceChildren();
    if (kat.id === "dressing") document.getElementById("dressing-opskrift").hidden = true;
  } else if (sidste[kat.id]) {
    gruppe.style.animationDelay = "0s";
    genstart(tegnKategori(kat, sidste[kat.id]), "ny");
  }
  visUdeladt(kat);
  opdaterGalleri();
  visAntal();
  opdaterLink();
}
function visUdeladt(kat) {
  const li = document.querySelector(`#liste li[data-kat="${kat.id}"]`);
  if (!li) return;
  const ude = udeladt.has(kat.id);
  li.classList.toggle("udeladt", ude);
  const knap = li.querySelector(".udelad");
  const navn = kat.navn.toLowerCase();
  knap.querySelector(".maerke").textContent = ude ? "+" : "×";
  knap.setAttribute("aria-label", ude ? `Tilføj ${navn} igen` : `Lad ${navn} være ude af salaten`);
  knap.title = ude ? "Tilføj igen" : "Tag ud af salaten";
  li.querySelector(".navn").textContent = ude ? "Ikke med" : sidste[kat.id] ? sidste[kat.id].navn : "";
  for (const b of li.querySelectorAll(".pile button")) b.disabled = ude;
}

function genstart(el, klasse) {
  el.classList.remove(klasse);
  void el.getBoundingClientRect();
  el.classList.add(klasse);
}

// Læg en ingrediens i skålen med en lille forsinkelse, så de falder i én efter én.
function drys(gruppe, nr) {
  gruppe.style.animationDelay = `${0.25 + nr * 0.09}s`;
  genstart(gruppe, "ny");
}

// Shake hele salaten (låste kategorier bliver liggende).
function shake(talt = true) {
  let nr = 0;
  for (const kat of kategorier) {
    if (udeladt.has(kat.id)) continue;
    if (laast.has(kat.id) && sidste[kat.id] && passer(sidste[kat.id])) continue;
    const ingrediens = vaelg(kat);
    if (!ingrediens) continue;
    drys(tegnKategori(kat, ingrediens), nr++);
    opdaterRaekke(kat, ingrediens);
  }
  opdaterGalleri();
  genstart(document.getElementById("skaal"), "ryster");
  if (talt) {
    if (navigator.vibrate) navigator.vibrate([25, 60, 25, 60, 40]);
    taelOp();
  }
  opdaterLink();
}

// Tæller for rystede salater, gemt i browseren.
function visTaeller() {
  const n = Number(lager.hent("rystet")) || 0;
  const el = document.getElementById("taeller");
  el.textContent = n === 1 ? "Du har rystet 1 salat" : `Du har rystet ${n.toLocaleString("da-DK")} salater`;
  el.hidden = n === 0;
}
function taelOp() {
  lager.gem("rystet", (Number(lager.hent("rystet")) || 0) + 1);
  visTaeller();
}

// Del-link: adressen husker den aktuelle salat som numre, fx ?s=3-7-1-9-4-2.
function salatKode() {
  // 0 betyder at kategorien er udeladt.
  return kategorier.map((k) => (udeladt.has(k.id) ? 0 : k.ingredienser.indexOf(sidste[k.id]) + 1)).join("-");
}
function opdaterLink() {
  const s = salatKode();
  const k = [...valgtKost].join(",");
  history.replaceState(null, "", `${location.pathname}?s=${s}${k ? "&kost=" + k : ""}`);
  visGem();
}
function laesLink() {
  const kost = new URLSearchParams(location.search).get("kost");
  if (kost) {
    valgtKost.clear();
    kost.split(",").forEach((k) => KOST.some((x) => x.id === k) && valgtKost.add(k));
    visKost();
  }
  const s = new URLSearchParams(location.search).get("s");
  return s ? visKode(s) : false;
}
// Læg salaten fra en kode (fx 3-7-1-9-4-2) i skålen. Bruges af del-links og gemte salater.
function visKode(s, animer = false) {
  const tal = s.split("-").map(Number);
  if (!tal.some((t, i) => t === 0 || (kategorier[i] && kategorier[i].ingredienser[t - 1]))) return false;
  udeladt.clear();
  kategorier.forEach((kat, i) => {
    if (tal[i] === 0) { udeladt.add(kat.id); return; }
    const ingrediens = kat.ingredienser[tal[i] - 1];
    if (ingrediens) sidste[kat.id] = ingrediens;
  });
  // Kategorier der ikke stod i koden, får en tilfældig.
  for (const kat of kategorier) if (!sidste[kat.id]) vaelg(kat);
  let nr = 0;
  for (const kat of kategorier) {
    if (!sidste[kat.id]) continue;
    if (udeladt.has(kat.id)) {
      kategoriGruppe(kat).replaceChildren();
      if (kat.id === "dressing") document.getElementById("dressing-opskrift").hidden = true;
    } else {
      const gruppe = tegnKategori(kat, sidste[kat.id]);
      if (animer) drys(gruppe, nr++);
    }
    opdaterRaekke(kat, sidste[kat.id]);
  }
  opdaterGalleri();
  return true;
}

// Mine salater: gemte salater i browseren, nyeste først. Gemmes som koden fra del-linket.
let favoritter = [];
try { favoritter = (JSON.parse(lager.hent("favoritter")) || []).filter((f) => f && typeof f.s === "string"); } catch (e) {}
function gemFavoritter() { lager.gem("favoritter", JSON.stringify(favoritter)); }
function favoritNavne(s) {
  const tal = s.split("-").map(Number);
  return kategorier.map((kat, i) => tal[i] > 0 && kat.ingredienser[tal[i] - 1]).filter(Boolean);
}
function skiftGem() {
  const s = salatKode();
  const i = favoritter.findIndex((f) => f.s === s);
  if (i >= 0) favoritter.splice(i, 1);
  else favoritter.unshift({ s, tid: Date.now() });
  gemFavoritter();
  visGem();
  visFavoritter();
  if (i < 0) genstart(document.getElementById("gem"), "pust");
}
function visGem() {
  const knap = document.getElementById("gem");
  const gemt = favoritter.some((f) => f.s === salatKode());
  knap.setAttribute("aria-pressed", gemt);
  knap.querySelector(".gem-tekst").textContent = gemt ? "Gemt" : "Gem";
  knap.title = gemt ? "Fjern fra Mine salater" : "Gem i Mine salater";
}
function visFavoritter() {
  const liste = document.getElementById("favorit-liste");
  document.getElementById("favorit-antal").textContent = favoritter.length ? ` (${favoritter.length})` : "";
  document.getElementById("favorit-tom").hidden = favoritter.length > 0;
  liste.replaceChildren(...favoritter.map((f) => {
    const li = document.createElement("li");
    const ingredienser = favoritNavne(f.s);
    const aabn = document.createElement("button");
    aabn.type = "button";
    aabn.className = "favorit-aabn";
    const ikoner = document.createElement("span");
    ikoner.className = "favorit-ikoner";
    ingredienser.filter((i) => i.billede).slice(0, 5).forEach((i) => {
      const img = document.createElement("img");
      img.src = i.billede;
      img.alt = "";
      img.loading = "lazy";
      ikoner.appendChild(img);
    });
    const navne = document.createElement("span");
    navne.className = "favorit-navne";
    navne.textContent = ingredienser.map((i) => i.navn).join(", ");
    aabn.append(ikoner, navne);
    aabn.addEventListener("click", () => {
      visKode(f.s, true);
      genstart(document.getElementById("skaal"), "ryster");
      visAntal();
      opdaterLink();
      document.querySelector(".skaal-kort").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const fjern = document.createElement("button");
    fjern.type = "button";
    fjern.className = "favorit-fjern";
    fjern.textContent = "×";
    fjern.setAttribute("aria-label", `Fjern ${navne.textContent} fra Mine salater`);
    fjern.title = "Fjern";
    fjern.addEventListener("click", () => {
      favoritter = favoritter.filter((x) => x !== f);
      gemFavoritter();
      visFavoritter();
      visGem();
    });
    li.append(aabn, fjern);
    return li;
  }));
}

// Installér som app: Android/Chrome giver en knap, iPhone får en kort vejledning. Kan skjules.
function lavInstaller() {
  const boks = document.getElementById("installer");
  const app = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (app || lager.hent("installer-skjult")) return;
  let prompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    document.getElementById("installer-ios").hidden = true;
    document.getElementById("installer-knap").hidden = false;
    boks.hidden = false;
  });
  document.getElementById("installer-knap").addEventListener("click", async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    prompt = null;
    boks.hidden = true;
  });
  window.addEventListener("appinstalled", () => (boks.hidden = true));
  document.getElementById("installer-luk").addEventListener("click", () => {
    boks.hidden = true;
    lager.gem("installer-skjult", "1");
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    document.getElementById("installer-knap").hidden = true;
    document.getElementById("installer-ios").hidden = false;
    boks.hidden = false;
  }
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
async function del() {
  const url = location.href;
  const tekst = "Prøv denne salat";
  const status = document.getElementById("del-status");
  try {
    if (navigator.share) {
      await navigator.share({ title: "Salad shaker", text: tekst, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    status.textContent = "Link kopieret";
  } catch (e) {
    if (e && e.name === "AbortError") return;
    status.textContent = "Kopiér adressen i browseren for at dele";
  }
  clearTimeout(del.t);
  del.t = setTimeout(() => (status.textContent = ""), 2500);
}

// Gå frem (+1) eller tilbage (-1) i listen og start forfra/bagfra ved enderne, så man kan bladre gennem dem alle.
function bladr(kat, retning) {
  const liste = tilladt(kat);
  if (liste.length === 0) return null;
  const nu = liste.indexOf(sidste[kat.id]);
  const i = ((nu < 0 ? 0 : nu + retning) % liste.length + liste.length) % liste.length;
  sidste[kat.id] = liste[i];
  return liste[i];
}

// Skift kun én kategori til den forrige eller næste ingrediens i listen.
function skiftEn(kat, retning) {
  const ingrediens = bladr(kat, retning);
  if (!ingrediens) return;
  const gruppe = tegnKategori(kat, ingrediens);
  gruppe.style.animationDelay = "0s";
  genstart(gruppe, "ny");
  const li = opdaterRaekke(kat, ingrediens);
  genstart(li, retning < 0 ? "skiftet-tilbage" : "skiftet");
  opdaterGalleri();
  opdaterLink();
}

// Store billeder af de valgte ingredienser nederst på siden (uden dressing).
function opdaterGalleri() {
  const galleri = document.getElementById("galleri");
  galleri.replaceChildren(
    ...kategorier
      .filter((kat) => kat.id !== "dressing" && sidste[kat.id] && !udeladt.has(kat.id))
      .map((kat) => {
        const ingrediens = sidste[kat.id];
        const fig = document.createElement("figure");
        fig.className = "kort";
        const ramme = document.createElement("div");
        ramme.className = "ramme";
        if (ingrediens.billede) {
          const img = document.createElement("img");
          img.src = ingrediens.billede;
          img.alt = ingrediens.navn;
          img.loading = "lazy";
          ramme.appendChild(img);
        } else {
          ramme.textContent = ingrediens.emoji || "•";
          ramme.classList.add("emoji");
        }
        const tekst = document.createElement("figcaption");
        tekst.innerHTML = '<span class="kat"></span><span class="navn"></span>';
        tekst.querySelector(".kat").textContent = kat.navn;
        tekst.querySelector(".navn").textContent = ingrediens.navn;
        fig.append(ramme, tekst);
        return fig;
      })
  );
}

// Knapper til kostvalg. Valget huskes i browseren.
function lavKostKnapper() {
  const boks = document.getElementById("kost");
  for (const k of KOST) {
    const knap = document.createElement("button");
    knap.type = "button";
    knap.className = "kost-knap";
    knap.dataset.kost = k.id;
    knap.textContent = k.navn;
    knap.addEventListener("click", () => skiftKost(k.id));
    boks.appendChild(knap);
  }
  try { (JSON.parse(lager.hent("kost")) || []).forEach((id) => KOST.some((x) => x.id === id) && valgtKost.add(id)); } catch (e) {}
  visKost();
}
function visKost() {
  for (const knap of document.querySelectorAll("#kost .kost-knap")) knap.setAttribute("aria-pressed", valgtKost.has(knap.dataset.kost));
  document.getElementById("kost-note").hidden = valgtKost.size === 0;
}
function skiftKost(id) {
  if (valgtKost.has(id)) valgtKost.delete(id);
  else valgtKost.add(id);
  lager.gem("kost", JSON.stringify([...valgtKost]));
  visKost();
  visAntal();
  // Skift kun de ingredienser ud, der ikke passer længere.
  let nr = 0;
  for (const kat of kategorier) {
    const nu = sidste[kat.id];
    if (nu && passer(nu)) {
      opdaterRaekke(kat, nu);
      if (kat.id === "dressing") visDressingOpskrift(nu);
      continue;
    }
    const ny = vaelg(kat);
    if (!ny) continue;
    if (!udeladt.has(kat.id)) drys(tegnKategori(kat, ny), nr++);
    opdaterRaekke(kat, ny);
  }
  opdaterGalleri();
  opdaterLink();
}

function visAntal() {
  const antal = kategorier.filter((k) => !udeladt.has(k.id)).reduce((sum, k) => sum * Math.max(1, tilladt(k).length), 1);
  document.getElementById("antal").textContent = `${antal.toLocaleString("da-DK")} mulige salater`;
}

// Ryst telefonen for at shake. iPhone kræver tilladelse, som kun kan bedes om ved et tryk.
let sensorStartet = false;
let sidsteRyst = 0;
async function startRystSensor() {
  if (sensorStartet || typeof DeviceMotionEvent === "undefined") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  try {
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      if ((await DeviceMotionEvent.requestPermission()) !== "granted") return;
    }
  } catch (e) {
    return;
  }
  sensorStartet = true;
  window.addEventListener("devicemotion", (e) => {
    const a = e.acceleration;
    const styrke = a && a.x != null
      ? Math.abs(a.x) + Math.abs(a.y) + Math.abs(a.z)
      : (() => { const g = e.accelerationIncludingGravity || {}; return Math.abs(g.x || 0) + Math.abs(g.y || 0) + Math.abs(g.z || 0) - 10; })();
    const nu = Date.now();
    if (styrke > 28 && nu - sidsteRyst > 1200) {
      sidsteRyst = nu;
      shake();
    }
  });
  document.getElementById("hint").hidden = false;
}

hentIngredienser()
  .then((data) => {
    kategorier = data.kategorier;
    lavKostKnapper();
    lavPersoner();
    lavHjemme();
    visAntal();
    visTaeller();
    if (!laesLink()) shake(false);
    visAntal();
    document.getElementById("del").addEventListener("click", del);
    document.getElementById("gem").addEventListener("click", skiftGem);
    visFavoritter();
    visGem();
    lavInstaller();
    document.getElementById("shake").addEventListener("click", () => {
      shake();
      startRystSensor();
    });
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission !== "function") startRystSensor();
  })
  .catch((fejl) => {
    document.getElementById("liste").outerHTML = '<p class="fejl">Ingredienserne kunne ikke indlæses. Tjek at ingredienser.json er gyldig JSON.</p>';
    console.error(fejl);
  });
