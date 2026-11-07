# Casa Vacanze – Calendario prenotazioni

App web installabile sul telefono per gestire le prenotazioni della casa vacanze.
Chi è autorizzato le inserisce a mano; tutti gli altri le vedono comparire **in tempo reale**,
e il giorno prima di ogni arrivo arriva una **notifica** sul telefono.

Tutto gratuito: Firebase (piano Spark) per dati e accessi, GitHub Pages per ospitare l'app,
GitHub Actions per le notifiche.

## Cosa c'è nella cartella

| File | A cosa serve |
|---|---|
| `index.html` | L'app. In cima allo script c'è il blocco **CONFIGURAZIONE** da compilare |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installazione sul telefono, funzionamento offline, notifiche |
| `firestore.rules` | Regole di sicurezza: chi può vedere e chi può modificare |
| `promemoria/` | Script che invia le notifiche del giorno prima |
| `.github/workflows/promemoria-arrivi.yml` | Lo fa partire ogni mattina in automatico |

## 0. Prova la demo

Apri `index.html` con Chrome o Edge: finché la configurazione Firebase è vuota l'app gira in
**modalità demo**, con prenotazioni di esempio salvate solo sul tuo computer.

---

## 1. Crea il progetto Firebase

1. Vai su <https://console.firebase.google.com> e accedi con il tuo account Google.
2. **Aggiungi progetto** → dai un nome (es. `casa-vacanze`) → Google Analytics puoi disattivarlo.
3. Nella pagina del progetto premi l'icona **`</>`** (Aggiungi app web), dai un nome e conferma.
   Non serve spuntare "Firebase Hosting".
4. Ti mostra un blocco `firebaseConfig = { apiKey: "...", ... }`. Copia i valori dentro
   `CONFIG.firebase` in `index.html`.

> Queste chiavi non sono segrete: la protezione la fanno il login e le regole del passo 3.

## 2. Crea gli account delle persone

1. Menu **Build → Authentication → Inizia**.
2. Scheda **Metodo di accesso** → **Email/password** → Abilita → Salva.
3. Scheda **Utenti** → **Aggiungi utente**: crea un account (email + password) per te e per
   ognuna delle persone che deve vedere il calendario. Le password le comunichi tu a loro.
4. Consigliato: scheda **Impostazioni → Azioni utente** → togli la spunta a
   *Abilita creazione (registrazione)*, così nessun altro può crearsi un account.

## 3. Crea il database e le regole

1. Menu **Build → Firestore Database → Crea database**.
   Posizione: `eur3 (Europe)` o `europe-west`. Modalità: **produzione**.
2. Apri `firestore.rules`, scrivi le email (in minuscolo):
   - in `lettori()` chi deve solo **vedere**;
   - in `editori()` chi può **aggiungere, modificare ed eliminare**.
3. Copia tutto il contenuto nella scheda **Regole** di Firestore e premi **Pubblica**.
4. In `index.html` metti le stesse email degli editori in `CONFIG.editori`
   (serve all'app per mostrare o nascondere i pulsanti di modifica).

Nello stesso blocco puoi cambiare anche `nomeCasa`, `orarioCheckin`, `orarioCheckout` e
`impostaSoggiorno` (tariffa per notte e numero massimo di notti tassate).

## Imposta di soggiorno

L'app la calcola da sola per ogni prenotazione: **3 € a notte per ogni adulto (14 anni in su)**,
solo per le **prime 10 notti**. I bambini sotto i 14 anni non pagano.
Esempio: 2 adulti per 12 notti → 2 × 10 × 3 € = 60 €.

Le **occupazioni private** (colore verde) segnano solo le date in cui la casa è occupata:
niente nome, ospiti, telefono né imposta, e non generano notifiche di arrivo.

La vedi nel modulo mentre inserisci la prenotazione, nella scheda dell'ospite, nell'elenco,
nel totale del mese e anche nella notifica del giorno prima, così sai quanto incassare all'arrivo.
Ogni prenotazione salva la tariffa del momento: se in futuro il Comune la cambia, aggiorni
`tariffa` e le prenotazioni già inserite restano col vecchio importo.

## 4. Pubblica l'app su GitHub Pages

1. Su GitHub crea un repository **pubblico** (es. `casa-vacanze`).
2. **Add file → Upload files** e trascina **tutto il contenuto** di questa cartella,
   comprese le cartelle `.github`, `promemoria` e `icons`. Conferma con *Commit changes*.
3. **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Save.
   Dopo un minuto l'app è online su `https://TUONOME.github.io/casa-vacanze/`.
4. In Firebase: **Authentication → Impostazioni → Domini autorizzati → Aggiungi dominio** →
   `TUONOME.github.io`. Senza questo il login viene rifiutato.

## 5. Attiva le notifiche (parte app)

1. Firebase → ⚙️ **Impostazioni progetto → Cloud Messaging**.
2. In fondo, **Configurazione web → Certificati push web → Genera coppia di chiavi**.
3. Copia la chiave in `CONFIG.vapidKey` dentro `index.html` e ricarica il file su GitHub.

## 6. Attiva le notifiche (invio automatico)

1. Firebase → ⚙️ **Impostazioni progetto → Account di servizio → Genera nuova chiave privata**.
   Si scarica un file `.json`. **Non caricarlo mai nel repository.**
2. Su GitHub, nel repository: **Settings → Secrets and variables → Actions →
   New repository secret**. Nome: `FIREBASE_SERVICE_ACCOUNT`. Valore: incolla **tutto** il
   contenuto del file `.json`. Salva, poi puoi cancellare il file dal computer.
3. Prova subito: scheda **Actions → Promemoria arrivi → Run workflow**. Nel campo
   *data_prova* scrivi la data di arrivo di una prenotazione (es. `2026-11-14`) e avvia.
   I telefoni con le notifiche attive ricevono l'avviso.

Da quel momento lo script gira **ogni mattina verso le 8–9** e avvisa per gli ospiti che
arrivano il giorno dopo. Per cambiare orario modifica la riga `cron` nel file del workflow
(l'orario è in UTC: in inverno l'Italia è UTC+1, in estate UTC+2).

Se il log dell'Action dice che la *Firebase Cloud Messaging API* non è attiva, apri il link
che compare nell'errore e premi **Abilita**.

## 7. Installa l'app sui telefoni

Manda il link nel gruppo WhatsApp e fissalo nella descrizione del gruppo. Poi ognuno:

- **Android (Chrome):** apri il link → menu ⋮ → **Installa app** / *Aggiungi a schermata Home*.
- **iPhone (Safari):** apri il link → **Condividi → Aggiungi alla schermata Home**.
  Su iPhone le notifiche funzionano **solo** se l'app è aperta dall'icona sulla Home (iOS 16.4 o successivo).

Accedi con email e password → tocca l'icona 👤 in alto → **Notifiche arrivi → Attiva** → consenti.

---

## Da sapere

- **Tempo reale:** quando un editore salva, gli altri vedono la modifica in un paio di secondi
  senza ricaricare. Se manca la rete, l'app mostra l'ultima versione e invia le modifiche
  appena torna la connessione.
- **Sovrapposizioni:** se le date si accavallano con un'altra prenotazione l'app lo segnala e
  chiede conferma («Salva comunque»).
- **Promemoria sul calendario personale:** nella scheda di una prenotazione, «Nel mio calendario»
  scarica un evento con avviso il giorno prima, utile anche come riserva alle notifiche.
- **GitHub sospende le Actions programmate** nei repository pubblici senza attività da 60 giorni.
  Ti arriva un'email: basta aprire la scheda Actions e premere **Enable workflow**,
  oppure fare una piccola modifica al repository ogni tanto.
- **Costi:** il piano gratuito di Firebase basta ampiamente per una casa vacanze.
- **Privacy:** i telefoni degli ospiti sono visibili solo agli account elencati nelle regole.
  Non condividere le password nel gruppo WhatsApp.
