# 🃏 Franzen – Online Multiplayer Webanwendung

Eine produktionsreife, echtzeitfähige und vollständig persistente Online-Multiplayer-Webanwendung für das traditionelle österreichisch-bayerische 3-Spieler-Kartenspiel **"Franzen"**.

---

## 🏛️ Architektur & Tech-Stack

- **Sprache & Typisierung:** Ausnahmslos **TypeScript (`strict: true`)** im gesamten Projekt (Frontend, Backend, Database Layer und Socket-Events).
- **Monorepo / Shared Types:** Gemeinsames Paket `@spielfranzen/shared` für alle Schnittstellen, Datenmodelle (`Card`, `GameState`, `BiddingState`, `SanitizedGameState`), REST-Payloads und typisierte Socket.io-Events (`ServerToClientEvents`, `ClientToServerEvents`).
- **Backend:** Node.js, Express, `socket.io` (streng typisiert), PostgreSQL mit **Prisma ORM** für vollständige Persistenz.
- **Authentifizierung:** JWT-basierte Authentifizierung (Passwort-Hashing via `bcrypt`) für REST-Endpunkte und Socket.io-Handshake-Middleware.
- **Frontend:** React 18+ (Vite + TypeScript), Tailwind CSS, React Router, Zustand für Auth- & Game-State, responsive Spieltisch-Oberfläche mit bayerischen Kartenmotiven.
- **KI-Bots:** Intelligente Bot-Engine (`BotEngine.ts`) für Bieten, Talon-Ablage, Spielansage und Stichspiel, um Tische sofort solo testen oder mit Freunden auffüllen zu können.

---

## 🎴 Spielregeln ("Franzen")

### 1. Kartendeck (33 Karten)
Gespielt wird mit einem deutschen Blatt (Farben: **Eichel**, **Laub**, **Schell**, **Herz**) zu 33 Karten (ohne 5er und 6er, mit Ausnahme des Weli):
- **Ass:** Rang 9, 11 Augen
- **10er:** Rang 8, 10 Augen
- **König:** Rang 7, 4 Augen
- **Ober:** Rang 6, 3 Augen
- **Unter:** Rang 5, 2 Augen
- **9er:** Rang 4, 0 Augen
- **8er:** Rang 3, 0 Augen
- **7er:** Rang 2, 0 Augen
- **Weli (Schell 6):** Rang 1 (niedrigste Schell-Karte), 0 Augen.
- **Gesamtaugen im Deck:** $4 \times 30 = 120$ Augen.

### 2. Spielmodi (4 bis 12)
- **4:** "Ich spiele" (Einstiegsgebot beim Bieten, verpflichtet mindestens zu Modus 5)
- **5:** Eichel (Trumpf = Eichel) | Basiswert: 100 Pkt
- **6:** Laub (Trumpf = Laub) | Basiswert: 100 Pkt
- **7:** Schell (Trumpf = Schell) | Basiswert: 100 Pkt
- **8:** Herz (Trumpf = Herz) | Basiswert: 100 Pkt
- **9:** Bettl (Kein Trumpf, Ziel: 0 Stiche, Talon erlaubt) | Basiswert: 200 Pkt
- **10:** Mord (Kein Trumpf, Ziel: Alle 10 Stiche, Talon erlaubt) | Basiswert: 300 Pkt
- **11:** Doppelbettl (Kein Trumpf, Ziel: 0 Stiche, KEIN Talon!) | Basiswert: 400 Pkt
- **12:** Doppelmord (Kein Trumpf, Ziel: Alle 10 Stiche, KEIN Talon!) | Basiswert: 600 Pkt

### 3. Spielablauf & Phasen
1. **DEALING:** 10 Karten an jeden der 3 Spieler, 3 Karten in den verdeckten Talon. Geber wandert im Uhrzeigersinn.
2. **BIDDING (Vorhand-Halte-Prinzip):**
   - Vorhand eröffnet mit "4" oder passt ("Weiter").
   - Sobald eröffnet wird, ist der Spieler *Halter*. Der nächste Spieler (*Herausforderer*) reizt auf $N$ oder passt.
   - Der Halter kann das Gebot *halten* (behält älteres Sitzrecht) oder *passen*.
   - Wer übrig bleibt, wird **Alleinspieler** (Mindestmodus: $\max(5, \text{winningBid})$).
   - Passen alle 3 Spieler direkt bei "4", wird der Geber weitergeschoben und neu ausgeteilt (ohne Rundenzähler zu erhöhen).
3. **TALON_AND_DECLARATION:**
   - Bei Gebot $\le 10$: Option auf Handspiel 11/12 ohne Talon ODER Talon aufnehmen (13 Karten), 3 beliebige Karten verdeckt wegdrücken (0 Punkte für alle) und Spielmodus $\ge \text{minMode}$ wählen.
   - Bei Gebot $\ge 11$: Talon bleibt gesperrt, Handspiel 11 oder 12 ist Pflicht.
4. **TRICK_PLAY:**
   - Alleinspieler spielt zum 1. Stich aus. Gewinner des Stichs spielt zum nächsten aus.
   - **Farbzwang:** Bei Vorhandensein der ausgespielten Farbe *muss* bedient werden.
   - **Trumpfzwang (Modi 5–8):** Hat ein Spieler keine Karte der geforderten Farbe, besitzt aber Trumpf, *muss* Trumpf gespielt werden.
   - **Freie Karte:** Hat der Spieler weder die geforderte Farbe noch Trumpf, darf jede Karte abgeworfen werden.
5. **EVALUATION (Sofortige Auswertung nach jedem Stich):**
   - **Farbspiele (5–8):**
     - Alleinspieler erreicht $\ge 66$ Augen $\rightarrow$ Sofortiger Sieg!
     - Gegner erreichen zusammen $\ge 66$ Augen $\rightarrow$ Sofortiger Sieg der Gegner!
     - Nach 9 Stichen niemand 66 Augen $\rightarrow$ Der Gewinner des 10. Stichs gewinnt die Runde!
   - **Bettl (9 & 11):** Sobald der Alleinspieler einen einzigen Stich macht $\rightarrow$ Sofort verloren! Übersteht er 10 Stiche mit 0 Stichen $\rightarrow$ Gewonnen!
   - **Mord (10 & 12):** Sobald ein Gegner einen Stich macht $\rightarrow$ Sofort verloren! Macht der Alleinspieler alle 10 Stiche $\rightarrow$ Gewonnen!
6. **SCORING (Nullsummenspiel):**
   - Alleinspieler gewinnt: Alleinspieler $+W$, jeder Gegner $-\frac{W}{2}$.
   - Alleinspieler verliert: Alleinspieler $-W$, jeder Gegner $+\frac{W}{2}$.
   - Die Summe der Scores ist immer exakt `0`.

---

## 🔒 Sicherheits- & Anti-Cheat-Sanitization

Die Funktion `sanitizeGameStateForPlayer(state, userId)` stellt sicher, dass:
- Clients niemals fremde Handkarten im Payload erhalten (Gegner erhalten nur `handCount: number`).
- Der verdeckte oder weggedrückte Talon niemals an Gegner übermittelt wird.
- Regelkonforme Züge serverseitig vorberechnet und validiert werden.

---

## 🚀 Schnellstart & Lokale Ausführung

### 1. PostgreSQL starten
Mit Docker oder Podman:
```bash
# Mit Podman oder Docker Compose
docker compose up -d
# bzw.
podman run -d --name spielfranzen-db -p 5433:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=spielfranzen postgres:16-alpine
```

### 2. Abhängigkeiten installieren & Build
```bash
npm install
npm run build
```

### 3. Datenbank-Migration & Seeding
```bash
npm run db:push --workspace=backend
npm run db:seed --workspace=backend
```

### 4. Development-Server starten
```bash
# Startet Backend (Port 3002) und Frontend (Port 5173) parallel
npm run dev
```

Browser öffnen: **`http://localhost:5173`**

### 5. Vordefinierte Test-Accounts (Passwort: `secret123`)
- `Flori_King` (1420 ELO, +1250 Pkt)
- `BavarianAce` (1280 ELO, +650 Pkt)
- `SchafkopfMeister` (1190 ELO, +300 Pkt)
- `WeliProfi` (980 ELO, -200 Pkt)
- `BettlKoenig` (850 ELO, -800 Pkt)

---

## 🧪 Tests ausführen

```bash
# Unit- & Logiktests (Deck, Bieten, Farb-/Trumpfzwang, Auswertung, Sanitization)
npm test --workspace=backend

# End-to-End WebSocket Test (Client, Handshake, Bot-Integration, DB Snapshot)
npx tsx backend/src/game/E2ESocketTest.ts
```
