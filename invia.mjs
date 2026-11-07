// Invia una notifica a tutti i telefoni registrati per ogni ospite che arriva DOMANI.
// Viene eseguito ogni mattina da GitHub Actions (.github/workflows/promemoria-arrivi.yml).
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

let account;
try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ""); }
catch { console.error("Manca o non è valido il segreto FIREBASE_SERVICE_ACCOUNT (vedi LEGGIMI.md, passo 6)."); process.exit(1); }

initializeApp({ credential: cert(account) });
const db = getFirestore();
const fcm = getMessaging();

// Data di domani secondo l'ora italiana, nel formato AAAA-MM-GG
const giorno = (offset) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" })
  .format(new Date(Date.now() + offset * 864e5));
const domani = process.env.DATA_PROVA || giorno(1);

const pl = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const FONTI = { airbnb: "Airbnb", booking: "Booking", privata: "Occupata privata" };

const arrivi = await db.collection("prenotazioni").where("arrivo", "==", domani).get();
if (arrivi.empty) { console.log(`Nessun arrivo il ${domani}.`); process.exit(0); }

const dispositivi = await db.collection("dispositivi").get();
const tokens = dispositivi.docs.map((d) => d.id);
if (!tokens.length) { console.log("Nessun telefono ha attivato le notifiche."); process.exit(0); }

const partenze = await db.collection("prenotazioni").where("partenza", "==", domani).get();
const cambioDomani = partenze.docs.some((d) => d.data().provenienza !== "privata");
const scaduti = new Set();

for (const doc of arrivi.docs) {
  const b = doc.data();
  if (b.provenienza === "privata") continue; // occupazione privata: nessun ospite da avvisare
  const ospiti = [pl(Number(b.adulti) || 0, "adulto", "adulti"), b.bambini ? pl(Number(b.bambini), "bambino", "bambini") : ""].filter(Boolean).join(", ");
  const title = `Domani arriva ${b.nome}`;
  const extra = cambioDomani ? " · giorno di cambio" : "";
  // Imposta di soggiorno: salvata dall'app; se manca la ricalcola (3 € × adulti × max 10 notti)
  const imposta = typeof b.impostaSoggiorno === "number"
    ? b.impostaSoggiorno
    : (Number(b.adulti) || 0) * Math.min(Number(b.notti) || 0, 10) * (typeof b.tariffaImposta === "number" ? b.tariffaImposta : 3);
  const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(imposta);
  const body = `${pl(Number(b.notti) || 1, "notte", "notti")} · ${ospiti} · imposta ${euro} · ${FONTI[b.provenienza] || ""}${extra}`;

  for (let i = 0; i < tokens.length; i += 500) {
    const gruppo = tokens.slice(i, i + 500);
    const res = await fcm.sendEachForMulticast({
      tokens: gruppo,
      data: { title, body, url: `./?p=${doc.id}`, tag: `arrivo-${doc.id}` },
      webpush: { headers: { Urgency: "high", TTL: "43200" } }
    });
    res.responses.forEach((r, j) => {
      if (r.success) return;
      const code = r.error?.code || "";
      console.warn(`Invio non riuscito: ${code}`);
      if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"].includes(code)) scaduti.add(gruppo[j]);
    });
    console.log(`${title}: ${res.successCount} inviate, ${res.failureCount} non riuscite.`);
  }
}

// Pulisce i telefoni che hanno disinstallato l'app o tolto il permesso
await Promise.all([...scaduti].map((t) => db.collection("dispositivi").doc(t).delete()));
if (scaduti.size) console.log(`Rimossi ${scaduti.size} dispositivi non più validi.`);
