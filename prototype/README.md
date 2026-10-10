# Cadoro Configurator (Proof of Concept)

Configurator demonstrativ de dulapuri modulare, construit ca dovada de concept
pentru proiectul Cadoro. Interfață în limba română, geometrie 3D parametrică
deterministă, valori de preț demonstrative. **Toate dimensiunile, finisajele,
prețurile și regulile de compatibilitate sunt INVENTATE (date demo) și nu
reprezintă inventarul, prețurile sau regulile reale Cadoro (Eurostar Furniture
SRL).** Datele reale trebuie furnizate de companie înainte de orice utilizare
comercială.

## Ce este implementat

- Vedere 3D măsurată a dulapului (React Three Fiber + three.js), cu orbit,
  zoom și rotire care nu intră în conflict cu selecția.
- Alegere lățime perete (1500-5000 mm, pas 50 mm) și înălțime dulap
  (2000-2400 mm, pas 100 mm); corpuri de 500/600/800/1000 mm; adâncime fixă
  580 mm (program demonstrativ).
- Finisaje corp și uși (5 corp + 1 sticlă doar pentru uși), panou de racordare
  automat pentru goluri de 1-50 mm.
- Interior: polită, bară de haine, sertare (2 sau 3), cu reguli de spațiu liber
  (100 mm între componente, 1100 mm sub bară) și mesaje de validare în română.
- Uși batante sau glisante cu previzualizare deschis/închis; glisante doar pe
  corpuri de minim 750 mm și set complet de minim 1500 mm.
- Deviz demonstrativ live cu breakdown pe linii, TVA configurabil (implicit 21%, estimare demo), descărcare
  .txt (deviz + cerere de ofertă demo) și BOM JSON demonstrativ.
- Undo/redo (istoric 100 de pași, și Ctrl+Z / Ctrl+Y), resetare, salvare
  locală automată în browser (localStorage), export/import JSON cu validare
  strictă de schemă (respinge structuri invalide și identificatori cu markup; câmpurile suplimentare sunt ignorate).
- Interfață responsivă (mobile: panouri sub vederea 3D).

## Ce NU este implementat (listat explicit, nu falsificat)

- Compartimentări perete/ cameră, obiecte decorative în interior, iluminat
  interior, mânere opționale multiple, covor/perete configurabil.
- Server, conturi, partajare online, trimitere cereri către Cadoro. Fișierele
  "cerere de ofertă" se doar descarcă local; nimic nu se trimite automat.
- Date reale Cadoro: dimensiuni de module, coduri de finisaj, prețuri, reguli
  de fabricație și compatibilitate. Nu există în surse publice; nu au fost
  inventate ca fiind reale.
- Export PDF tipărit (doar .txt și JSON), export CAD/BIM, integrare IMOS.

## Instalare și rulare locală

Recomandare pentru acest proiect: Node.js 24 LTS și npm. Testele din mediul de evaluare au trecut și pe Node 18.20.4, dar versiunile intermediare nu au fost verificate individual.

```bash
npm install
npm run dev        # server de dezvoltare pe http://localhost:5173
npm test           # teste unitare Vitest (33 teste în versiunea evaluată)
npm run build      # build de producție în dist/ (TypeScript inclus)
npm run preview    # servește build-ul de producție local
```

## Vercel (gata de conectare; conectarea se face de utilizator)

- Project root: directorul acest proiect (unde se află package.json).
- Framework preset: Vite (static SPA; nu este nevoie de Next.js).
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: `vercel.json` este inclus cu rewrite-ul `/(.*) -> /index.html`
  (aplicația nu folosește history routing; rewrite-ul acoperă orice refresh).
- Environment variables: niciuna necesară; nu există chei API, backend sau
  servicii plătite.
- Nu există dependență de server local, filesystem local sau cont la runtime.

## Structura

- `src/domain/` logica pură: catalog demo, validare reguli, plasare geometrie,
  prețuri, schemă JSON de import (toate funcții pure, testate cu Vitest).
- `src/state/` store Zustand cu istoric undo/redo și persistență localStorage.
- `src/three/` scena 3R3F: carcase procedurale, polită, bară, sertare, uși,
  panou de racordare, soclu, pardoseală, umbre.
- `src/ui/` interfața React în limba română.
- `research/` rapoartele de cercetare ale proiectului (IKEA, Cadoro, tehnic).
- `evidence/` capturi de ecran și note de testare.

## Reguli demo de dimensiuni și compatibilitate (INVENTATE)

- Coridoare corpuri: 500 / 600 / 800 / 1000 mm; perete 1500-5000 mm pas 50 mm.
- Înălțime: 2000-2400 mm pas 100 mm; adâncime fixă 580 mm.
- Spațiu liber minim între componente interioare: 100 mm.
- Spațiu de agățare sub bară: minim 1100 mm.
- Uși batante: lățimea unei frunze max 600 mm (auto-împarte în frunze egale).
- Uși glisante: corp minim 750 mm; set complet minim 1500 mm.
- Sticla se aplică doar ușilor, nu corpurilor deschise.
- Goluri de 1-50 mm pe perete primesc panou de racordare; peste 50 mm rămân
  goale (avertisment vizibil).
- Preț: corp de bază + frunze uși + componente interioare + racordare + montaj,
  cu multiplicatori pe finisaj; TVA configurabil (implicit 21%, estimare demo). Toate sumele sunt demo.

## Limitări cunoscute

- Prețurile și regulile sunt demo; nu genera oferte reale pe baza lor.
- Salvarea este locală în browser; ștergerea datelor browserului pierde
  proiectul. Export JSON ca backup este recomandat.
- Geometria 3D este stilizată (carcase simplificate, fără texture foto reale).
- Nu există test E2E Playwright; au fost executate teste unitare și verificări HTTP, NU testare interactivă în browser.
- Build-ul JS are ~320 kB gzip (three.js domină); poate declanșa avertismentul Vite pentru chunk-uri mari;
  necesită optimizare pentru rețele lente; optimizare ulterioară posibilă.
- Fișierul `cadoro-cerere-oferta-demo.txt` nu trimite nimic; doar descarcă.

## Atribuiri

- Logo Cadoro: extras din HTML-ul public al site-ului https://www.cadoro.ro/
  (wordmark SVG inline + favicon JPEG 900x900). Utilizare doar pentru
  mockup-uri interne; mărcile rămân proprietatea Cadoro / Eurostar Furniture
  SRL; obțineți permisiune scrisă înainte de orice utilizare publică.
- Interfață de referință: plannerul IKEA PAX a fost studiat doar ca model de
  interacțiune (raport în `research/ikea-audit.md`). Niciun cod, model sau
  imagine IKEA nu este inclus în acest proiect.
- Biblioteci open-source: React, three.js (MIT), React Three Fiber, drei,
  Zustand, Vite, Vitest, fontul Manrope (@fontsource-variable/manrope).

## Verificare finală și TVA

Catalogul și toate prețurile rămân demonstrative. Valoarea implicită a TVA a fost corectată la 21% conform documentului ANAF, cu aplicare de la 1 august 2025. Configurarea fiscală trebuie confirmată de contabil înainte de oferte reale. Sursa: https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf

Testarea vizuală desktop/mobil nu este efectuată: Browser mode trebuie activat în chat. Nu există capturi ale aplicației. O compilare reușită nu demonstrează că interfața 3D funcționează fără defecte. Vezi ../evidence/local-verification.md pentru verificarea locală finală.

Pentru Vercel: dacă întregul director Cadoro este repository, Root Directory = prototype. Dacă repository-ul conține doar conținutul prototype, Root Directory = rădăcina repository-ului. Build: npm run build; Output: dist; Framework: Vite.
