# Koble tavla til et Google-regneark

Tar ca. 5 minutter. Du trenger en Google-konto.

1. Gå til [sheets.new](https://sheets.new) og lag et nytt regneark. Kall det f.eks. «Pakkelek 2026 – svar».
2. I regnearket: **Utvidelser → Apps Script**.
3. Slett alt som står i `Code.gs`, og lim inn hele innholdet fra [`Code.gs`](Code.gs) i denne mappa. Trykk **Lagre** (diskett-ikonet).
4. Trykk **Implementer → Ny implementering** (øverst til høyre).
   - Klikk tannhjulet ved «Velg type» og velg **Nettapp**.
   - **Kjør som:** *Meg*
   - **Hvem har tilgang:** *Alle*
   - Trykk **Implementer**.
5. Google ber deg **gi tilgang**. Velg kontoen din. Får du «Google har ikke bekreftet denne appen», trykk **Avansert → Gå til … (utrygt)** og **Tillat**. Det er ditt eget script, så dette er trygt.
6. Kopier **Nettapp-URL-en**. Den slutter på `/exec`.
7. Åpne `index.html`, finn `window.RSVP_URL = "";` nederst og lim inn URL-en mellom anførselstegnene:
   ```js
   window.RSVP_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```
8. Commit og push. Når siden er oppdatert havner nye hilsener både på tavla og i fanen **Svar** i regnearket.

## Nyttig å vite

- **Slette eller rette en hilsen:** Rett eller slett raden i fanen «Svar». Tavla oppdateres neste gang noen laster siden.
- **Testsvar:** Svar du sendte i demo-modus (før URL-en var lagt inn) lå bare i din nettleser og kommer ikke med.
- **Endrer du koden i Apps Script senere** må du gjøre **Implementer → Administrer implementeringer → ✏️ → Versjon: Ny versjon → Implementer**. Ellers kjører den gamle koden. URL-en forblir den samme.
- Alle som har lenken kan se tavla og legge inn en hilsen. Det er det som er meningen, men del lenken bare i gruppa.
