// Salad shaker: vælger én tilfældig ingrediens fra hver kategori og lægger den i skålen.

// Hvor hver kategori lægges i skålen (x, y i skålens koordinater) og hvor stor den tegnes.
const PLACERING = {
  base:    { str: 64, pos: [[118, 86], [282, 86], [200, 68], [90, 128], [140, 104], [200, 94], [260, 104], [310, 128], [170, 134], [235, 134]] },
  sproedt: { str: 36, pos: [[122, 110], [226, 84], [290, 124]] },
  bloedt:  { str: 36, pos: [[166, 88], [266, 100], [146, 134]] },
  uventet: { str: 36, pos: [[202, 120], [104, 120], [306, 104]] },
  protein: { str: 36, pos: [[186, 72], [242, 122], [130, 94]] },
};
const STANDARD_PLACERING = { str: 36, pos: [[200, 110], [150, 120], [250, 115]] };
const DRESSING_STRIBER = [
  "M92 108 C 135 72, 170 140, 210 96 S 282 70, 312 112",
  "M120 126 C 160 104, 196 146, 236 118 S 282 102, 300 126",
];

const SVG_NS = "http://www.w3.org/2000/svg";
let kategorier = [];
let sidste = {};
const laast = new Set(); // kategorier som Shake ikke rører

// Lille lager i browseren. Virker siden også uden (fx i privat vindue).
const lager = {
  hent(n) { try { return localStorage.getItem(n); } catch (e) { return null; } },
  gem(n, v) { try { localStorage.setItem(n, v); } catch (e) {} },
};

async function hentIngredienser() {
  if (window.INGREDIENSER) return window.INGREDIENSER;
  const svar = await fetch("ingredienser.json", { cache: "no-cache" });
  if (!svar.ok) throw new Error("Kunne ikke hente ingredienser.json");
  return svar.json();
}

function vaelg(kat) {
  const liste = kat.ingredienser;
  if (liste.length === 0) return null;
  let i = Math.floor(Math.random() * liste.length);
  // Undgå at få præcis den samme ingrediens to gange i træk.
  if (liste.length > 1 && liste[i] === sidste[kat.id]) i = (i + 1 + Math.floor(Math.random() * (liste.length - 1))) % liste.length;
  sidste[kat.id] = liste[i];
  return liste[i];
}

function tegnIngrediens(gruppe, ingrediens, placering) {
  for (const [x, y] of placering.pos) {
    if (ingrediens.billede) {
      const img = document.createElementNS(SVG_NS, "image");
      const s = placering.str * 1.3;
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

function tegnDressing(gruppe, ingrediens) {
  for (const d of DRESSING_STRIBER) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", "dressing");
    p.setAttribute("stroke", ingrediens.farve || "#D9A520");
    p.setAttribute("stroke-width", 7);
    gruppe.appendChild(p);
  }
}

// Lag i skålen: én gruppe pr. kategori, så en enkelt kategori kan skiftes ud.
function kategoriGruppe(kat) {
  const indhold = document.getElementById("indhold");
  let gruppe = indhold.querySelector(`g[data-kat="${kat.id}"]`);
  if (!gruppe) {
    gruppe = document.createElementNS(SVG_NS, "g");
    gruppe.dataset.kat = kat.id;
    // Dressingen ligger altid øverst.
    if (kat.id === "dressing") indhold.appendChild(gruppe);
    else indhold.insertBefore(gruppe, indhold.querySelector('g[data-kat="dressing"]'));
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
      li.textContent = linje;
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
  knap.addEventListener("click", () => skiftEn(kat, retning));
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
    tekst.innerHTML = '<span class="kat"></span><span class="navn"></span>';
    tekst.querySelector(".kat").innerHTML = '<span class="kat-navn"></span> <span class="nr"></span>';
    tekst.querySelector(".kat-navn").textContent = kat.navn;
    const pile = document.createElement("span");
    pile.className = "pile";
    pile.append(lavLaas(kat), lavPil(kat, -1), lavPil(kat, 1));
    li.append(document.createElement("span"), tekst, pile);
    liste.appendChild(li);
  }
  li.firstChild.replaceWith(lavIkon(ingrediens));
  li.querySelector(".navn").textContent = ingrediens.navn;
  const nr = kat.ingredienser.indexOf(ingrediens) + 1;
  const ialt = kat.ingredienser.length;
  li.querySelector(".nr").textContent = `${nr}/${ialt}`;
  const navn = kat.navn.toLowerCase();
  li.querySelector(".pil.tilbage").setAttribute("aria-label", `Forrige ${navn} (${nr} af ${ialt})`);
  li.querySelector(".pil.tilbage").title = `Forrige ${navn}`;
  li.querySelector(".pil.frem").setAttribute("aria-label", `Næste ${navn} (${nr} af ${ialt})`);
  li.querySelector(".pil.frem").title = `Næste ${navn}`;
  visLaas(kat);
  return li;
}

function genstart(el, klasse) {
  el.classList.remove(klasse);
  void el.getBoundingClientRect();
  el.classList.add(klasse);
}

// Kokken ryster skålen på en af fire måder, aldrig den samme to gange i træk.
const RYSTEMAADER = ["side", "hop", "rund", "vip"];
let sidsteMaade = "";
function rystSkaal() {
  const skaal = document.getElementById("skaal");
  const muligheder = RYSTEMAADER.filter((m) => m !== sidsteMaade);
  const maade = muligheder[Math.floor(Math.random() * muligheder.length)];
  sidsteMaade = maade;
  for (const m of RYSTEMAADER) skaal.classList.remove("ryst-" + m);
  void skaal.getBoundingClientRect();
  skaal.classList.add("ryst-" + maade, "anstreng");
  clearTimeout(rystSkaal.t);
  rystSkaal.t = setTimeout(() => skaal.classList.remove("anstreng"), 800);
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
    if (laast.has(kat.id) && sidste[kat.id]) continue;
    const ingrediens = vaelg(kat);
    if (!ingrediens) continue;
    drys(tegnKategori(kat, ingrediens), nr++);
    opdaterRaekke(kat, ingrediens);
  }
  opdaterGalleri();
  rystSkaal();
  if (talt) {
    if (navigator.vibrate) navigator.vibrate([25, 60, 25, 60, 40]);
    taelOp();
  }
  opdaterLink();
}

// Titler: kokken (brugerens avatar) får nyt udstyr, jo flere salater man ryster.
const TITLER = [
  { fra: 0, navn: "Køkkenlærling" },
  { fra: 5, navn: "Salatskyller" },        // rødt tørklæde
  { fra: 15, navn: "Grøntsagsjonglør" },   // overskæg
  { fra: 30, navn: "Dressingmester" },     // høj kokkehue
  { fra: 60, navn: "Sous-chef" },          // solbriller
  { fra: 100, navn: "Køkkenchef" },        // guldbånd og medalje
  { fra: 200, navn: "Salatlegende" },      // krone
  { fra: 500, navn: "Grøntsagsguru" },     // gylden aura
];
function niveau(n) {
  let i = 0;
  while (i + 1 < TITLER.length && n >= TITLER[i + 1].fra) i++;
  return i;
}
function antalRystet() { return Number(lager.hent("rystet")) || 0; }

function visTitel() {
  const n = antalRystet();
  const i = niveau(n);
  const nu = TITLER[i], naeste = TITLER[i + 1];
  document.getElementById("titel-navn").textContent = nu.navn;
  const salater = n === 1 ? "1 salat" : `${n.toLocaleString("da-DK")} salater`;
  let tekst = `${salater} rystet`;
  let andel = 1;
  if (naeste) {
    const mangler = naeste.fra - n;
    tekst += ` · ${mangler} til ${naeste.navn}`;
    andel = (n - nu.fra) / (naeste.fra - nu.fra);
  }
  document.getElementById("titel-tekst").textContent = tekst;
  document.getElementById("titel-fyld").style.width = `${Math.round(andel * 100)}%`;
  // Vis kokkens udstyr for trinnet (trin tælles fra 1).
  for (const el of document.querySelectorAll("#kok [data-fra], #kok [data-til]")) {
    const fra = Number(el.dataset.fra || 0), til = Number(el.dataset.til || 99);
    el.style.display = i + 1 >= fra && i + 1 < til ? "" : "none";
  }
}

function taelOp() {
  const foer = niveau(antalRystet());
  lager.gem("rystet", antalRystet() + 1);
  const efter = niveau(antalRystet());
  visTitel();
  if (efter > foer) fejr(TITLER[efter].navn);
}

function fejr(navn) {
  const el = document.getElementById("ny-titel");
  el.textContent = `Ny titel: ${navn}!`;
  genstart(el, "vis");
  genstart(document.getElementById("titel"), "fejr");
  if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 120]);
}

// Del-link: adressen husker den aktuelle salat som numre, fx ?s=3-7-1-9-4-2.
function opdaterLink() {
  const s = kategorier.map((k) => k.ingredienser.indexOf(sidste[k.id]) + 1).join("-");
  history.replaceState(null, "", `${location.pathname}?s=${s}`);
}
function laesLink() {
  const s = new URLSearchParams(location.search).get("s");
  if (!s) return false;
  const tal = s.split("-").map(Number);
  let fundet = false;
  kategorier.forEach((kat, i) => {
    const ingrediens = kat.ingredienser[tal[i] - 1];
    if (!ingrediens) return;
    sidste[kat.id] = ingrediens;
    fundet = true;
  });
  if (!fundet) return false;
  // Kategorier der ikke stod i linket, får en tilfældig.
  for (const kat of kategorier) if (!sidste[kat.id]) vaelg(kat);
  for (const kat of kategorier) {
    if (!sidste[kat.id]) continue;
    tegnKategori(kat, sidste[kat.id]);
    opdaterRaekke(kat, sidste[kat.id]);
  }
  opdaterGalleri();
  return true;
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
  const liste = kat.ingredienser;
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
      .filter((kat) => kat.id !== "dressing" && sidste[kat.id])
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

function visAntal() {
  const antal = kategorier.reduce((sum, k) => sum * Math.max(1, k.ingredienser.length), 1);
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
    visAntal();
    visTitel();
    if (!laesLink()) shake(false);
    document.getElementById("del").addEventListener("click", del);
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
