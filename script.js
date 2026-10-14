/* =========================================================
   is it gay? — página inicial (busca)
   Depende de data.js (carregado antes no HTML).
   ========================================================= */

/* ------------------ ELEMENTOS ------------------ */

const input       = document.getElementById("searchInput");
const clearBtn    = document.getElementById("clearBtn");
const suggestions = document.getElementById("suggestions");
const results     = document.getElementById("results");
const rollBtn     = document.getElementById("rollBtn");
const luckyBtn    = document.getElementById("luckyBtn");

/* ------------------ ESTADO ------------------ */

let matches = [];     // sugestões mostradas agora
let activeIndex = -1; // sugestão destacada pelo teclado

// separa o "feeling lucky?" em letras pra animação do hover (ver CSS)
const RAINBOW = ["#ff4f6d", "#ff8f3a", "#f2b705", "#2fc27a", "#00a8c6", "#6f6cff", "#b05cff"];
const luckyText = luckyBtn.textContent;
luckyBtn.setAttribute("aria-label", luckyText);
luckyBtn.textContent = "";
[...luckyText].forEach((char, i) => {
  const span = document.createElement("span");
  span.textContent = char === " " ? "\u00a0" : char;
  span.setAttribute("aria-hidden", "true");
  span.style.setProperty("--i", i);
  span.style.setProperty("--c", RAINBOW[i % RAINBOW.length]);
  luckyBtn.appendChild(span);
});

ready.then(() => {
  if (dataError) showMessage("couldn't load the list :( — " + dataError.message);
});

/* ------------------ RESULTADO ------------------ */

function showMessage(text) {
  results.innerHTML = "";
  const msg = document.createElement("p");
  msg.className = "result-note";
  msg.textContent = text;
  results.appendChild(msg);
}

function showResult(item) {
  results.innerHTML = "";

  const answer = document.createElement("div");
  answer.className = "result-answer";

  const note = document.createElement("p");
  note.className = "result-note";

  if (!item) {
    answer.textContent = "unknown";
    note.textContent = "not on the list (yet)";
  } else {
    answer.textContent = item.gay ? "yes" : "no";
    note.textContent = [item.title, item.year, item.media].filter(Boolean).join(" · ");
  }

  results.append(answer, note);
}

async function check(query) {
  if (!query.trim()) return;
  closeSuggestions();
  await ready;
  showResult(findBest(query));
}

function selectItem(item) {
  input.value = item.title;
  updateClearBtn();
  closeSuggestions();
  showResult(item);
}

/* ------------------ SUGESTÕES ------------------ */

function renderSuggestions() {
  suggestions.innerHTML = "";
  activeIndex = -1;

  if (!matches.length) return closeSuggestions();

  matches.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.setAttribute("role", "option");

    const details = [item.year, item.media].filter(Boolean).join(" — ");
    div.textContent = details ? `${item.title} (${details})` : item.title;

    // mousedown (e não click) pra não perder o foco do input antes
    div.addEventListener("mousedown", e => {
      e.preventDefault();
      selectItem(item);
    });

    suggestions.appendChild(div);
  });

  suggestions.classList.add("open");
  suggestions.style.display = "block";
}

function closeSuggestions() {
  suggestions.classList.remove("open");
  suggestions.style.display = "none";
  matches = [];
  activeIndex = -1;
}

function highlight(index) {
  const items = suggestions.children;
  [...items].forEach(el => el.classList.remove("active"));
  activeIndex = index;
  if (items[index]) {
    items[index].classList.add("active");
    items[index].scrollIntoView({ block: "nearest" });
  }
}

/* ------------------ EVENTOS ------------------ */

function updateClearBtn() {
  const hasText = input.value.trim() !== "";
  clearBtn.textContent = hasText ? "close" : "search";
  clearBtn.classList.toggle("clickable", hasText);
}

input.addEventListener("input", async () => {
  updateClearBtn();
  await ready;
  matches = filterTitles(input.value);
  renderSuggestions();
});

input.addEventListener("keydown", e => {
  const open = suggestions.classList.contains("open");

  if (e.key === "ArrowDown" && open) {
    e.preventDefault();
    highlight((activeIndex + 1) % matches.length);
  } else if (e.key === "ArrowUp" && open) {
    e.preventDefault();
    highlight((activeIndex - 1 + matches.length) % matches.length);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (open && activeIndex > -1) selectItem(matches[activeIndex]);
    else check(input.value);
  } else if (e.key === "Escape") {
    closeSuggestions();
  }
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  results.innerHTML = "";
  closeSuggestions();
  updateClearBtn();
  input.focus();
});

rollBtn.addEventListener("click", () => {
  check(input.value);
  input.blur();
});

luckyBtn.addEventListener("click", async () => {
  await ready;
  if (!data.length) return;
  selectItem(data[Math.floor(Math.random() * data.length)]);
});

// clicar fora fecha as sugestões
document.addEventListener("mousedown", e => {
  if (!e.target.closest(".search-area")) closeSuggestions();
});
