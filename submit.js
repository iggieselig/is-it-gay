/* =========================================================
   is it gay? — página de sugestões
   Envia o formulário pra um Google Forms (as respostas caem
   numa aba da planilha, onde você aceita ou rejeita).
   Depende de data.js (carregado antes no HTML).
   ========================================================= */

/* ------------------ CONFIGURAÇÃO DO GOOGLE FORMS ------------------
   Enquanto "action" estiver vazio, o formulário avisa que as
   sugestões ainda não estão abertas e não envia nada.

   action: o link do seu formulário, trocando o final
           "/viewform" por "/formResponse"
   fields: o código "entry.123456789" de cada pergunta
   ------------------------------------------------------------------ */

const GOOGLE_FORM = {
  action: "",
  fields: {
    title: "",
    media: "",
    year:  "",
    gay:   "",
    why:   "",
    name:  "",
  },
};

/* ------------------ ELEMENTOS ------------------ */

const form          = document.getElementById("submitForm");
const titleInput    = document.getElementById("titleInput");
const duplicateNote = document.getElementById("duplicateNote");
const formStatus    = document.getElementById("formStatus");
const sendBtn       = form.querySelector(".submit-btn");

/* ------------------ AVISO DE DUPLICATA ------------------ */

titleInput.addEventListener("input", async () => {
  await ready;
  const item = findBest(titleInput.value);

  if (item && !dataError) {
    duplicateNote.textContent =
      `"${item.title}" is already on the list (${item.gay ? "yes" : "no"}). ` +
      `you can still send it if you think it's wrong.`;
    duplicateNote.hidden = false;
  } else {
    duplicateNote.hidden = true;
  }
});

/* ------------------ ENVIO ------------------ */

function setStatus(text, type = "") {
  formStatus.textContent = text;
  formStatus.className = "form-note" + (type ? " " + type : "");
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const values = Object.fromEntries(new FormData(form));
  Object.keys(values).forEach(k => (values[k] = String(values[k]).trim()));

  // robô preencheu o campo invisível: finge que deu certo e ignora
  if (values.website) {
    form.reset();
    return setStatus("thank you! ✨", "ok");
  }

  if (!values.title || !values.media || !values.gay) {
    return setStatus("please fill in the title, type and yes/no.", "error");
  }

  if (!GOOGLE_FORM.action) {
    console.info("GOOGLE_FORM.action is empty in submit.js, so nothing was sent:", values);
    return setStatus("submissions aren't open yet, come back soon!", "error");
  }

  const body = new URLSearchParams();
  for (const [key, entry] of Object.entries(GOOGLE_FORM.fields)) {
    if (entry && values[key]) body.append(entry, values[key]);
  }

  sendBtn.disabled = true;
  setStatus("sending…");

  try {
    // "no-cors": o Google não deixa ler a resposta, mas recebe o envio
    await fetch(GOOGLE_FORM.action, { method: "POST", mode: "no-cors", body });
    form.reset();
    duplicateNote.hidden = true;
    setStatus("thank you! i'll take a look ✨", "ok");
  } catch (err) {
    console.error("Could not send the form:", err);
    setStatus("something went wrong, please try again.", "error");
  } finally {
    sendBtn.disabled = false;
  }
});
