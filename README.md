# Salad shaker

En simpel webside på dansk: tryk på **Shake**, og siden vælger én tilfældig ingrediens fra hver kategori og tegner salaten i en skål.

Siden er helt statisk. Der er ingen server, ingen database og ingen AI-kald, så den er gratis at hoste og svarer med det samme.

| Fil | Hvad den gør |
| --- | --- |
| `index.html` | Selve siden |
| `style.css` | Udseende, også til mobil |
| `app.js` | Shake-logikken og tegningen af skålen |
| `ingredienser.json` | **Alle kategorier og ingredienser.** Det er den fil, du redigerer |
| `billeder/` | Én tegning (SVG) pr. ingrediens |
| `manifest.webmanifest`, `sw.js` | Gør siden til en app, der kan lægges på hjemmeskærmen og virker uden net. Navn og ikoner står i manifestet |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Ikonerne til appen |

---

## Del 1: Læg siden online (cirka 15 minutter, gratis)

Du skal bruge to gratis konti: **GitHub**, hvor filerne ligger, og **Vercel**, der viser siden på nettet.

### 1. Læg filerne på GitHub

1. Opret en konto på [github.com](https://github.com/signup), hvis du ikke har en.
2. Klik på **+** øverst til højre og vælg **New repository**.
3. Kald det `salat-shaker`. Det kan være **Public** eller **Private**, begge dele virker. Klik **Create repository**.
4. På den tomme side klikker du på linket **uploading an existing file**.
5. Træk **indholdet** af mappen `salat-shaker` ind i browseren: `index.html`, `style.css`, `app.js`, `ingredienser.json`, `README.md` og mappen `billeder`. Træk filerne, ikke selve mappen, så `index.html` ligger øverst i repoet.
6. Klik **Commit changes**.

> Det kan også gøres nemmere: opret det tomme repo (punkt 1-3) og skriv navnet til Claude i projektet. Så uploader Claude filerne for dig.

### 2. Forbind til Vercel

1. Gå til [vercel.com/signup](https://vercel.com/signup) og vælg **Continue with GitHub**.
2. Klik **Add New… → Project**.
3. Find `salat-shaker` på listen og klik **Import**. Hvis repoet ikke er der, så klik **Adjust GitHub App Permissions** og giv Vercel adgang til det.
4. Lad alle indstillinger stå, som de er (Framework Preset: *Other*), og klik **Deploy**.
5. Efter cirka et minut er siden online på en adresse som `salat-shaker.vercel.app`.

Fra nu af opdaterer siden sig selv, hver gang du ændrer noget på GitHub. Det tager omkring et minut.

### 3. Eget domæne (valgfrit)

Du behøver ikke et domæne, for `.vercel.app`-adressen virker fint. Vil du hellere have f.eks. `salatshaker.dk`:

1. Køb domænet hos en dansk udbyder, f.eks. Simply.com, One.com eller Dandomain. Et `.dk`-domæne koster typisk et par hundrede kroner om året eller mindre. Tjek prisen hos udbyderen.
2. I Vercel går du til dit projekt og vælger **Settings → Domains**. Skriv domænet og klik **Add**.
3. Vercel viser nu én eller to DNS-indstillinger (typisk en **A-record** og en **CNAME-record**). Kopiér dem præcis, som Vercel viser dem, ind under DNS-indstillingerne hos den udbyder, du købte domænet hos.
4. Der kan gå fra få minutter til et par timer, før domænet virker. Vercel sørger selv for https (hængelåsen).

---

## Del 2: Tilføj nye ingredienser

Alle ingredienser ligger i `ingredienser.json`. Du kan rette filen direkte på GitHub:

1. Åbn repoet på GitHub og klik på `ingredienser.json`.
2. Klik på **blyanten** (Edit this file) øverst til højre.
3. Find den kategori, du vil tilføje til, og indsæt en ny linje. Eksempel under "Noget sprødt":

   ```json
   { "navn": "Radiser", "emoji": "🌸" },
   ```

4. Klik **Commit changes…** og derefter **Commit changes** igen. Siden er opdateret efter cirka et minut.

### Regler for filen

- Hver ingrediens står i `{ }` og har altid et `"navn"`.
- **Alle linjer i en liste skal have komma efter sig, undtagen den sidste.** Det er den mest almindelige fejl. Hvis siden skriver "Ingredienserne kunne ikke indlæses", mangler der næsten altid et komma, eller der er et komma for meget.
- Brug citationstegn `"` og ikke `”` eller `'`.

### Billede til en ny ingrediens

En ingrediens kan vises på tre måder:

| Felt | Eksempel | Hvad der vises |
| --- | --- | --- |
| `"emoji"` | `"emoji": "🌸"` | En emoji i skålen og på listen. Det er den hurtigste løsning. |
| `"billede"` | `"billede": "billeder/radiser.svg"` | En tegning. Upload filen til mappen `billeder` på GitHub (**Add file → Upload files**). |
| `"farve"` | `"farve": "#E86A5B"` | Kun til dressinger: striber i den farve hen over salaten. |
| `"opskrift"` | `"opskrift": ["3 spsk olivenolie", "1 spsk eddike"]` | Kun til dressinger: en kort ingrediensliste til 2 personer. Tallene skaleres efter antal personer. |
| `"indeholder"` | `"indeholder": ["mælk", "gluten"]` | Bruges af kostvalgene. Mulige mærker: `kød`, `fisk`, `æg`, `mælk`, `gluten`, `kulhydrat`. Udelad feltet, hvis ingrediensen passer til alle kostvalg. |
| `"maengde"` | `"maengde": [40, "g"]` | Mængde pr. person. Enheder: `g`, `stk`, `spsk`, `tsk`, `håndfuld`, `skive`, `stilk`, `dåse`, `bundt`. Siden ganger op til det valgte antal personer. |
| `"tip"` | `"tip": "Rist dem på en tør pande."` | Et kort tilberedningstip, der vises under ingrediensen. |

Vil du have en tegning i samme stil som de andre, så bed Claude om at tegne den. Så får du en SVG-fil, der passer ind.

### Ny kategori

Du kan også tilføje en helt ny kategori. Kopiér en eksisterende kategori (fra `{` med `"id"` til den afsluttende `}`), giv den et nyt `"id"` (små bogstaver uden æøå) og et nyt `"navn"`, og husk kommaet mellem kategorierne. Siden placerer automatisk ingredienserne i skålen.

---

## Test siden på din egen computer

Åbner du `index.html` direkte ved at dobbeltklikke, kan browseren ikke indlæse `ingredienser.json`. Start i stedet en lille webserver i mappen:

```
python3 -m http.server 8000
```

Åbn derefter <http://localhost:8000> i browseren.
