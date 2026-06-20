const express  = require("express");
const cron     = require("node-cron");
const fetch    = (...a) => import("node-fetch").then(({default:f})=>f(...a));
const twilio   = require("twilio");

const app = express();
app.use(express.json());

const TWILIO_SID    = process.env.TWILIO_SID    || "ACfd288a5bd0a615c040078fb10f03f049";
const TWILIO_TOKEN  = process.env.TWILIO_TOKEN  || "8b23ac5962d08ab9145784e68e274861";
const TWILIO_FROM   = process.env.TWILIO_FROM   || "whatsapp:+14155238886";
const KENNETH_WA    = process.env.KENNETH_WA    || "whatsapp:+919538864425";
const FINNHUB_KEY   = process.env.FINNHUB_KEY   || "d8r0mh9r01quatdats5gd8r0mh9r01quatdats60";

const client = twilio(TWILIO_SID, TWILIO_TOKEN);
const STOCKS = ["NVDA","MSFT","META","AMZN","TSM","CRWD","ASML","INFY"];

async function sendWA(message) {
  try {
    await client.messages.create({ from: TWILIO_FROM, to: KENNETH_WA, body: message });
    console.log("✅ WhatsApp sendt");
  } catch(err) { console.error("❌ Fejl:", err.message); }
}

async function getQuote(sym) {
  const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`);
  const data = await res.json();
  return { sym, price:data.c, pct:data.dp };
}

cron.schedule("30 0 * * 1-5", async () => {
  const quotes = await Promise.all(STOCKS.slice(0,6).map(getQuote));
  const dato = new Date().toLocaleDateString("da-DK",{weekday:"long",day:"numeric",month:"long"});
  let msg = `🌅 *ROSVANG INVEST — MORGENBRIEFING*\n📅 ${dato} · Bangalore\n\n📊 *LIVE PRISER:*\n`;
  quotes.forEach(q => {
    const up = q.pct >= 0;
    msg += `${up?"▲":"▼"} *${q.sym}* $${q.price?.toFixed(2)} ${up?"+":""}${q.pct?.toFixed(2)}%\n`;
  });
  msg += `\n🎯 NVDA · TSM · NOVO B = kernebeholdninger.\n— Harald · Rosvang Invest`;
  await sendWA(msg);
}, { timezone:"UTC" });

cron.schedule("*/30 9-16 * * 1-5", async () => {
  const quotes = await Promise.all(STOCKS.map(getQuote));
  const signals = quotes.filter(q => Math.abs(q.pct) >= 3.0);
  if(!signals.length) return;
  let msg = `⚡ *ROSVANG INVEST — SIGNAL ALERT*\n\n`;
  signals.forEach(q => {
    msg += `${q.pct>=3?"🟢 KØB":"🔴 SÆLG"} *${q.sym}* ${q.pct>=0?"+":""}${q.pct?.toFixed(2)}% → $${q.price?.toFixed(2)}\n`;
  });
  msg += `\n— Harald · Rosvang Invest`;
  await sendWA(msg);
}, { timezone:"UTC" });

cron.schedule("30 9 * * 5", async () => {
  const quotes = await Promise.all(STOCKS.map(getQuote));
  const dato = new Date().toLocaleDateString("da-DK",{day:"numeric",month:"long",year:"numeric"});
  let msg = `📋 *ROSVANG INVEST — UGERAPPORT*\n📅 ${dato}\n\n`;
  quotes.forEach(q => { msg += `${q.pct>=0?"▲":"▼"} ${q.sym}: ${q.pct>=0?"+":""}${q.pct?.toFixed(2)}%\n`; });
  msg += `\n— Harald · Investeringsdirektør · Rosvang Invest`;
  await sendWA(msg);
}, { timezone:"UTC" });

app.get("/health", (req,res) => res.json({status:"Harald operationel", tid:new Date().toISOString()}));
app.get("/priser", async (req,res) => {
  const quotes = await Promise.all(STOCKS.map(getQuote));
  res.json({ok:true, data:quotes});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Harald kører på port ${PORT}`));
