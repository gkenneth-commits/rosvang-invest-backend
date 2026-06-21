const express = require("express");
const cron    = require("node-cron");
const fetch   = (...a) => import("node-fetch").then(({default:f})=>f(...a));
const app     = express();
app.use(express.json());

const SID   = (process.env.TWILIO_SID    || "ACfd288a5bd0a615c040078fb10f03f049").trim();
const TOKEN = (process.env.TWILIO_TOKEN  || "8b23ac5962d08ab9145784e68e274861").trim();
const FROM  = (process.env.TWILIO_FROM   || "whatsapp:+14155238886").trim();
const TO    = (process.env.KENNETH_WA    || "whatsapp:+919538864425").trim();
const FIN   = (process.env.FINNHUB_KEY   || "d8r0mh9r01quatdats5gd8r0mh9r01quatdats60").trim();

async function sendWA(msg) {
  try {
    const twilio = require("twilio");
    const client = new twilio.Twilio(SID, TOKEN);
    await client.messages.create({ from: FROM, to: TO, body: msg });
    console.log("WA sendt OK");
    return true;
  } catch(e) { console.error("WA fejl:", e.message); return false; }
}

async function getQuote(sym) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FIN}`);
    const d = await r.json();
    return { sym, price: d.c||0, pct: d.dp||0 };
  } catch(e) { return { sym, price:0, pct:0 }; }
}

const STOCKS = ["NVDA","MSFT","META","AMZN","TSM","CRWD","ASML","INFY"];

cron.schedule("30 0 * * 1-5", async () => {
  const q = await Promise.all(STOCKS.slice(0,6).map(getQuote));
  const d = new Date().toLocaleDateString("da-DK",{weekday:"long",day:"numeric",month:"long"});
  let m = `ROSVANG INVEST - MORGENBRIEFING\n${d}\n\nLIVE PRISER:\n`;
  q.forEach(x => { m += `${x.pct>=0?"UP":"DN"} ${x.sym} $${x.price.toFixed(2)} (${x.pct>=0?"+":""}${x.pct.toFixed(2)}%)\n`; });
  m += `\nKOB: NVDA + NOVO B + INFY\n- Harald - Rosvang Invest`;
  await sendWA(m);
}, { timezone:"UTC" });

cron.schedule("*/30 9-16 * * 1-5", async () => {
  const q = await Promise.all(STOCKS.map(getQuote));
  const s = q.filter(x => Math.abs(x.pct) >= 3);
  if(!s.length) return;
  let m = `ROSVANG INVEST - SIGNAL ALERT\n\n`;
  s.forEach(x => { m += `${x.pct>=3?"KOB":"SAELG"} ${x.sym} ${x.pct>=0?"+":""}${x.pct.toFixed(2)}%\n`; });
  m += `\n- Harald`;
  await sendWA(m);
}, { timezone:"UTC" });

app.get("/health", (req,res) => res.json({ status:"Harald operationel", tid:new Date().toISOString() }));

app.get("/test-wa", async (req,res) => {
  const ok = await sendWA("ROSVANG INVEST - TEST\nHarald backend er live!\n- Harald");
  res.json({ ok, besked: ok ? "WhatsApp sendt!" : "Fejl" });
});

app.get("/priser", async (req,res) => {
  const q = await Promise.all(STOCKS.map(getQuote));
  res.json({ ok:true, data:q });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Harald korer paa port ${PORT}`));
