# Rolle & Ziel
Du bist ein erfahrener Full-Stack Game Developer. Entwickle eine vollständig funktionierende, webbasierte Online-Multiplayer-App für das traditionelle 3-Spieler-Kartenspiel **"Franzen"**. 

# Tech-Stack & Architektur
- **Backend:** Node.js mit Express und `socket.io` für Echtzeit-Kommunikation (In-Memory Game-State für Räume).
- **Frontend:** React (Vite) + Tailwind CSS für ein modernes, responsives Karten-UI am Tisch.
- **Sicherheit/Fairness:** Die gesamte Spiellogik, Kartenverteilung, Zugvalidierung (Farb-/Trumpfzwang) und der Talon liegen auf dem Server. Clients erhalten über WebSockets nur ihre eigenen Handkarten und den öffentlichen Tischstatus.
- **Lobby-System:** Spieler können einen Namen eingeben, einen Raum per 4-stelligem Code erstellen oder beitreten. Sobald 3 Spieler im Raum sind, startet das Spiel (optional: Fülle fehlende Plätze zum Testen mit einfachen Bots auf).

---

# Spielregeln & Datenmodell ("Franzen")

## 1. Das Kartendeck (33 Karten)
Gespielt wird mit einem deutschen Blatt (Eichel, Laub, Schell, Herz) zu 33 Karten (ohne 5er und 6er, außer dem Weli).
Jede der 4 Farben hat 8 reguläre Karten in folgender absteigender Stichkraft und Punktewertung (Augen):
1. **Ass** (Rang 9, Wert: 11 Punkte)
2. **10er** (Rang 8, Wert: 10 Punkte)
3. **König** (Rang 7, Wert: 4 Punkte)
4. **Ober** (Rang 6, Wert: 3 Punkte)
5. **Unter** (Rang 5, Wert: 2 Punkte)
6. **9er** (Rang 4, Wert: 0 Punkte)
7. **8er** (Rang 3, Wert: 0 Punkte)
8. **7er** (Rang 2, Wert: 0 Punkte)

Zusätzlich gibt es als 33. Karte den **Weli** (Schell 6):
- Farbe: **Schell**, Rang: 1 (niedrigste Schell-Karte unter dem Schell 7er), Wert: 0 Punkte.
- Gesamtpunkte im Deck: 120 Punkte.

## 2. Spielmodi & Ränge (4 bis 12)
- **4:** "Ich spiele" (reines Einstiegsgebot beim Bieten; kein eigener Spielmodus, verpflichtet mindestens zu Modus 5)
- **5:** Eichel (Trumpf = Eichel) | Basiswert: 100 Punkte
- **6:** Laub (Trumpf = Laub) | Basiswert: 100 Punkte
- **7:** Schell (Trumpf = Schell) | Basiswert: 100 Punkte
- **8:** Herz (Trumpf = Herz) | Basiswert: 100 Punkte
- **9:** Bettl (Kein Trumpf, Ziel: 0 Stiche machen, Talon erlaubt) | Basiswert: 200 Punkte
- **10:** Mord (Kein Trumpf, Ziel: Alle 10 Stiche machen, Talon erlaubt) | Basiswert: 300 Punkte
- **11:** Doppelbettl (Kein Trumpf, Ziel: 0 Stiche machen, KEIN Talon!) | Basiswert: 400 Punkte
- **12:** Doppelmord (Kein Trumpf, Ziel: Alle 10 Stiche machen, KEIN Talon!) | Basiswert: 600 Punkte

---

# Ablauf einer Runde (Server State Machine)

## Phase 1: Austeilen (`DEALING`)
- Ein imaginärer "Geber" (Dealer) wird in Runde 1 zufällig bestimmt und wandert nach jeder Runde um eine Position im Uhrzeigersinn weiter.
- Jeder der 3 Spieler erhält 10 verdeckte Karten.
- Die restlichen 3 Karten kommen verdeckt in den **Talon**.
- Reihenfolge nach dem Geber: **Vorhand** (Spieler 1 nach dem Geber), **Mittelhand** (Spieler 2), **Hinterhand** (der Geber selbst).

## Phase 2: Das Bieten / Reizen (`BIDDING`)
Entscheidet, wer der Alleinspieler ("Spieler") gegen die beiden anderen ("Gegner") wird. Es gilt das Vorhand-Halte-Prinzip:
1. **Start:** Vorhand wird gefragt, ob sie mit "4" eröffnen will oder "Weiter" sagt (passt).
   - Passt Vorhand, wird Mittelhand gefragt ("4" oder "Weiter"). Passt auch Mittelhand, wird Hinterhand gefragt.
   - Passen alle 3 Spieler ohne Gebot, wird neu gemischt und der Geber wandert eins weiter.
2. **Duell & Halten:** Sobald ein Spieler mit "4" eröffnet (nennen wir ihn *Halter*), darf der nächste noch aktive Spieler erhöhen (auf "5") oder passen ("Weiter").
   - Erhöht der Herausforderer auf $N$ (z. B. 5), kann der *Halter* entweder **"Halten"** (er zieht mit dem Gebot $N$ gleich, da er die ältere Position hat) oder **"Gehen"** (passen).
   - Hält der *Halter*, muss der Herausforderer weiter erhöhen ($N+1$) oder passen.
   - Sobald einer aus dem Duell passt, rückt (falls noch ein dritter Spieler unbefragt im Spiel ist) dieser dritte Spieler als neuer Herausforderer nach und muss das aktuelle Gebot überbieten oder passen.
3. **Höchstgebot:** Das Bieten geht maximal bis **12**. Wer nach dem Passen der anderen beiden übrig bleibt (oder 12 hält/bietet), gewinnt das Bieten und wird **Spieler**. Merke dir dessen finales Gebot `minMode` (mindestens 5, auch wenn er mit 4 gewonnen hat).

## Phase 3: Talon & Spielansage (`TALON_AND_DECLARATION`)
- **Fall A: `minMode` ist $\le 10$:**
  Der Spieler hat zwei Optionen:
  1. **Ohne Talon (Handspiel 11 oder 12):** Er verzichtet vor dem Aufdecken des Talons auf diesen und sagt direkt *11 (Doppelbettl)* oder *12 (Doppelmord)* an.
  2. **Talon aufnehmen:** Er sieht sich die 3 Talon-Karten an, nimmt sie auf die Hand (13 Karten) und legt 3 beliebige Karten verdeckt wieder ab (Handgröße wieder 10). Danach wählt er seinen endgültigen Spielmodus. **Regel:** Der gewählte Modus muss $\ge$ `minMode` und $\le 10$ sein (z. B. bei gewonnenem Gebot 6 darf er nur noch 6, 7, 8, 9 oder 10 wählen).
- **Fall B: `minMode` ist 11 oder 12:**
  Der Talon bleibt gesperrt und verdeckt. Der Spieler muss direkt Modus 11 (bzw. 12) wählen (bei `minMode` 11 darf er 11 oder 12 wählen; bei 12 nur 12).

## Phase 4: Das Stichspiel (`TRICK_PLAY`)
- **Erster Auswurf:** Der Alleinspieler ("Spieler") spielt immer die allererste Karte zum 1. Stich aus. Bei allen folgenden Stichen spielt der Gewinner des vorherigen Stichs aus.
- **Zugvalidierung (Farb- und Trumpfzwang):**
  Die erste Karte eines Stichs bestimmt die geforderte Farbe (`leadSuit`). Für die anderen beiden Spieler gilt:
  1. **Farbzwang:** Hat der Spieler mindestens eine Karte der `leadSuit`, MUSS er diese Farbe bedienen (kein Stichzwang, beliebige Höhe erlaubt).
  2. **Trumpfzwang (nur bei Modi 5, 6, 7, 8):** Hat der Spieler KEINE Karte der `leadSuit`, besitzt aber Trumpfkarten, MUSS er einen Trumpf spielen.
  3. **Freie Karte:** Hat er weder `leadSuit` noch Trumpf (bzw. bei Bettl/Mord nur keine `leadSuit`), darf er jede beliebige Karte abwerfen.
- **Stichgewinner ermitteln:**
  - Wurde mindestens ein Trumpf gespielt (Modi 5–8), gewinnt der höchste gespielte Trumpf.
  - Ansonsten gewinnt die höchste Karte der ausgespielten Farbe (`leadSuit`).
  - Der Gewinner erhält die 3 Karten des Stichs auf seinen Stichstapel.

## Phase 5: Siegbedingungen & Vorzeitiges Ende (`EVALUATION`)
- **Farbspiele (Modi 5, 6, 7, 8):**
  Der Alleinspieler gewinnt, wenn er **entweder** durch seine gemachten Stiche $\ge 66$ Augen (Kartenpunkte) erreicht **ODER** den allerletzten (10.) Stich gewinnt! (Die Augen der abgelegten Talon-Karten zählen NICHT zu seinen Stichen). Schafft er beides nicht, gewinnen die beiden Gegner.
- **Bettl (9) & Doppelbettl (11):**
  Der Alleinspieler gewinnt, wenn er nach 10 Stichen **0 Stiche** gemacht hat. Sobald der Alleinspieler auch nur einen einzigen Stich macht, bricht die Runde sofort ab und gilt als verloren.
- **Mord (10) & Doppelmord (12):**
  Der Alleinspieler gewinnt, wenn er **alle 10 Stiche** macht. Sobald einer der Gegner einen Stich macht, bricht die Runde sofort ab und gilt als verloren.

## Phase 6: Punkteabrechnung (`SCORING` - Nullsummenspiel)
Je nach gewähltem Modus gilt der Basiswert $W$:
- Modi 5, 6, 7, 8: $W = 100$
- Modus 9 (Bettl): $W = 200$
- Modus 10 (Mord): $W = 300$
- Modus 11 (Doppelbettl): $W = 400$
- Modus 12 (Doppelmord): $W = 600$

**Verrechnung:**
- **Alleinspieler gewinnt:** Alleinspieler erhält $+W$ Punkte. Jeder der 2 Gegner erhält $-\frac{W}{2}$ Punkte.
- **Alleinspieler verliert:** Alleinspieler erhält $-W$ Punkte. Jeder der 2 Gegner erhält $+\frac{W}{2}$ Punkte.
- Die Gesamtsumme aller 3 Punktestände über das gesamte Spiel hinweg muss immer exakt `0` ergeben.

---

# UI/UX Anforderungen
1. **Spieltisch-Ansicht:** Zeige die 2 Mitspieler oben links und rechts (mit Kartenanzahl, Rolle "Spieler/Gegner", aktuellem Gebot und Punktestand) und die eigene Hand unten aufgefächert und nach Farben/Rängen sortiert.
2. **Visuelles Kartendesign:** Erstelle saubere, gut lesbare Karten-Komponenten für die deutschen Farben (Eichel 🌰/🌿, Laub 🍃, Herz ❤️, Schell 🔔) inkl. speziellem Badge für den "Weli" und Hervorhebung der aktuellen Trumpffarbe.
3. **Interaktive Biet-Box:** Während `BIDDING` sieht der aktive Spieler klare Buttons (z. B. `[Bieten: 5]` oder `[Halten: 5]` und `[Weiter / Passen]`).
4. **Klickbare Karten:** Blende im eigenen Zug nicht-spielbare Karten (wegen Farb-/Trumpfzwang) leicht ab (ausgegraut), sodass nur regelkonforme Karten anklickbar sind.
5. **Scoreboard:** Permanentes Scoreboard mit Rundenergebnissen und Gesamtstand (Summe = 0).

Liefere mir die vollständige Projektstruktur inkl. `server.js` (Socket.io + Game Engine) und den React-Frontend-Dateien, sodass ich das Projekt direkt mit `npm install && npm run dev` starten kann.