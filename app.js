// Salat shaker: vælger én tilfældig ingrediens fra hver kategori og lægger den i skålen.

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
    pile.append(lavPil(kat, -1), lavPil(kat, 1));
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
  return li;
}

function genstart(el, klasse) {
  el.classList.remove(klasse);
  void el.getBoundingClientRect();
  el.classList.add(klasse);
}

// Shake hele salaten.
function shake() {
  for (const kat of kategorier) {
    const ingrediens = vaelg(kat);
    if (!ingrediens) continue;
    tegnKategori(kat, ingrediens);
    opdaterRaekke(kat, ingrediens);
  }
  genstart(document.getElementById("skaal"), "ryster");
  genstart(document.getElementById("indhold"), "ny");
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
  genstart(tegnKategori(kat, ingrediens), "ny");
  const li = opdaterRaekke(kat, ingrediens);
  genstart(li, retning < 0 ? "skiftet-tilbage" : "skiftet");
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
    shake();
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
