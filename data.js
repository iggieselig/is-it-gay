/* =========================================================
   is it gay? — dados compartilhados por todas as páginas
   Carrega a lista da planilha do Google Sheets.
   Colunas usadas da planilha: name, media_type, year, is_gay
   ========================================================= */

const SHEET_ID = "1AUig8tdWS4K9NZVTpGJzMYWPvhNRD8WiB_KCecuNbqo";

// Dois jeitos de baixar a planilha; se um falhar, tenta o outro.
const CSV_URLS = [
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
];

// Posição de cada coluna na planilha (contando do 0):
// id=0, name=1, media_type=2, year=3, is_gay=4
const COLUMNS = { name: 1, media: 2, year: 3, gay: 4 };

let data = [];        // todos os títulos da planilha
let dataError = null; // erro, se a planilha não carregar

/* ------------------ CARREGAR DADOS ------------------ */

// Deixa o texto comparável: sem acento, minúsculo, sem pontuação.
// Assim "Yuri on ICE!!" encontra "Yuri on Ice".
function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Lê CSV de verdade (aceita vírgulas e aspas dentro dos campos).
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row);
      row = []; field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Jeito 1: baixar a planilha como CSV (pode ser bloqueado pelo navegador).
async function fetchCSVRows() {
  let lastError;
  for (const url of CSV_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith("<")) throw new Error("got a web page, not a CSV (is the sheet public?)");
      return parseCSV(text).slice(1); // pula o cabeçalho
    } catch (err) {
      console.warn("Failed to load", url, err);
      lastError = err;
    }
  }
  throw lastError;
}

// Jeito 2: carregar a planilha como <script> (JSONP). Funciona até abrindo
// o arquivo direto do computador, porque o navegador não bloqueia scripts.
function scriptRows() {
  return new Promise((resolve, reject) => {
    const callback = "isItGayData_" + Date.now();
    const script = document.createElement("script");

    const cleanup = () => { delete window[callback]; script.remove(); };

    // O Google às vezes chama a função pelo nome padrão dele em vez do nosso
    window.google = window.google || {};
    google.visualization = google.visualization || {};
    google.visualization.Query = google.visualization.Query || {};
    const timer = setTimeout(() => { cleanup(); reject(new Error("timed out")); }, 10000);

    window[callback] = response => {
      clearTimeout(timer);
      cleanup();
      if (response.status === "error") return reject(new Error("Google Sheets returned an error"));
      const rows = response.table.rows.map(r =>
        (r.c || []).map(c => (c && c.v != null ? String(c.v) : ""))
      );
      // se o Google não reconheceu o cabeçalho, ele vem como primeira linha
      if (rows[0] && rows[0][COLUMNS.name] === "name") rows.shift();
      resolve(rows);
    };
    google.visualization.Query.setResponse = window[callback];

    script.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error("couldn't reach Google Sheets")); };
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=0&headers=1&tqx=responseHandler:${callback}`;
    document.head.appendChild(script);
  });
}

async function getRows() {
  try {
    return await fetchCSVRows();
  } catch (err) {
    console.warn("CSV download failed, trying the script method", err);
    return await scriptRows();
  }
}

async function loadData() {
  const rows = await getRows();
  const cell = (row, i) => (row[i] || "").trim();

  data = rows
    .filter(row => cell(row, COLUMNS.name))
    .map(row => {
      const title = cell(row, COLUMNS.name);
      return {
        title,
        media: cell(row, COLUMNS.media),
        year:  cell(row, COLUMNS.year),
        gay:   cell(row, COLUMNS.gay).toUpperCase() === "YES",
        key:   normalize(title),
      };
    });

  if (!data.length) throw new Error("the sheet loaded but no titles were found");
  console.log(`Loaded ${data.length} titles`);
}

// Guarda a promessa: qualquer busca feita antes de carregar espera por ela.
// Ela nunca "quebra": se der erro, ele fica guardado em dataError.
const ready = loadData().catch(err => {
  console.error("Could not load the sheet:", err);
  dataError = err;
});

/* ------------------ BUSCA ------------------ */

function filterTitles(query) {
  const q = normalize(query);
  if (!q) return [];
  return data.filter(item => item.key.includes(q));
}

// Acha o título mais provável: nome exato, ou o único que contém o texto.
function findBest(query) {
  const q = normalize(query);
  if (!q) return null;

  const exact = data.find(item => item.key === q);
  if (exact) return exact;

  const partial = filterTitles(query);
  return partial.length === 1 ? partial[0] : null;
}
