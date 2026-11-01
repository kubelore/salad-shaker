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

function shake() {
  const valgt = kategorier.map((kat) => ({ kat, ingrediens: vaelg(kat) })).filter((v) => v.ingrediens);

  // Skålen
  const gruppe = document.getElementById("indhold");
  gruppe.replaceChildren();
  for (const { kat, ingrediens } of valgt) {
    if (kat.id === "dressing") continue;
    tegnIngrediens(gruppe, ingrediens, PLACERING[kat.id] || STANDARD_PLACERING);
  }
  const dressing = valgt.find((v) => v.kat.id === "dressing");
  if (dressing) tegnDressing(gruppe, dressing.ingrediens);

  // Listen
  const liste = document.getElementById("liste");
  liste.replaceChildren(
    ...valgt.map(({ kat, ingrediens }) => {
      const li = document.createElement("li");
      const ikon = document.createElement("span");
      if (ingrediens.billede) {
        ikon.className = "ikon";
        const img = document.createElement("img");
        img.src = ingrediens.billede;
        img.alt = "";
        ikon.appendChild(img);
      } else if (ingrediens.farve && !ingrediens.emoji) {
        ikon.className = "prik";
        ikon.style.background = ingrediens.farve;
      } else {
        ikon.className = "ikon";
        ikon.textContent = ingrediens.emoji || "•";
      }
      ikon.setAttribute("aria-hidden", "true");
      const tekst = document.createElement("span");
      tekst.innerHTML = '<span class="kat"></span><span class="navn"></span>';
      tekst.querySelector(".kat").textContent = kat.navn;
      tekst.querySelector(".navn").textContent = ingrediens.navn;
      li.append(ikon, tekst);
      return li;
    })
  );

  // Animation
  const skaal = document.getElementById("skaal");
  skaal.classList.remove("ryster");
  gruppe.classList.remove("ny");
  void skaal.getBoundingClientRect();
  skaal.classList.add("ryster");
  gruppe.classList.add("ny");
}

function visAlle() {
  const boks = document.getElementById("alle-liste");
  boks.replaceChildren(
    ...kategorier.map((kat) => {
      const div = document.createElement("div");
      const h = document.createElement("h3");
      h.textContent = `${kat.navn} (${kat.ingredienser.length})`;
      const ul = document.createElement("ul");
      for (const ing of kat.ingredienser) {
        const li = document.createElement("li");
        li.textContent = ing.navn;
        ul.appendChild(li);
      }
      div.append(h, ul);
      return div;
    })
  );
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
    visAlle();
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
