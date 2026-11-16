# Pixel Party

Ein Party-Brettspiel in Pixelart für 1 bis 4 Spieler (fehlende Mitspieler übernimmt der Computer).
Würfeln, Sterne kaufen, Items einsetzen und nach jeder Runde ein Minispiel gewinnen.

- Läuft im Browser (Canvas, keine Abhängigkeiten): `public/index.html`
- Steuerung: Spieler 1 WASD + Q, Spieler 2 Pfeile + Enter, Spieler 3 IJKL + U, Spieler 4 Ziffernblock oder TFGH + R, Gamepads, Touch (Stick + A)
- Hosting: Cloudflare Worker mit statischen Dateien (`wrangler.jsonc`)

## Tests ohne Browser
- `node tools/sim.mjs 300` spielt 300 komplette Computer-Partien durch
- `node tools/mgsim.mjs 60` lässt die Minispiele Computer gegen Computer laufen
