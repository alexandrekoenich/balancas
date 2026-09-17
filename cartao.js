(async () => {
  const config = window.BALANCAS_CONFIG;
  const code = new URLSearchParams(location.search).get("id")?.trim().toUpperCase();
  const message = document.getElementById("message");
  const printButton = document.getElementById("print-button");
  const siteUrlInput = document.getElementById("site-url");
  let verified = false;
  let qrReady = false;
  let activeBase = null;

  function publicBase(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(url.hostname)) return null;
      url.search = "";
      url.hash = "";
      if (url.pathname.endsWith("/index.html")) url.pathname = url.pathname.slice(0, -"index.html".length);
      if (!url.pathname.endsWith("/")) url.pathname += "/";
      return url;
    } catch { return null; }
  }

  function renderQr(base, test = false) {
    try {
      const destination = base ? new URL("index.html", base) : null;
      if (destination) destination.searchParams.set("id", code);
      const qr = qrcode(0, "M");
      qr.addData(destination?.href || code);
      qr.make();
      document.getElementById("qrcode").innerHTML = qr.createSvgTag(4, 8);
      qrReady = true;
      activeBase = base;
      printButton.disabled = !verified || !base;
      printButton.textContent = test ? "Imprimir cartão de teste" : "Imprimir ou salvar PDF";
      message.textContent = !base
        ? "QR de prévia: contém apenas o código. Abra pelo servidor local ou informe o endereço público para gerar o link da ficha."
        : test
          ? `QR de teste: abre ${destination.href} apenas neste computador. Informe o endereço público antes de imprimir o cartão definitivo.`
          : `Cartão pronto. O QR Code abre a ficha ${code}.`;
    } catch {
      qrReady = false;
      printButton.disabled = true;
      message.textContent = "Não foi possível montar o QR Code para este endereço.";
    }
  }

  if (!code || !/^BAL-\d+$/.test(code)) {
    message.textContent = "Código de balança inválido.";
    return;
  }
  document.getElementById("heading-code").textContent = code;
  document.getElementById("card-code").textContent = code;
  document.getElementById("back-link").href = `index.html?id=${encodeURIComponent(code)}`;

  const currentBase = /^https?:$/.test(location.protocol) ? new URL(".", location.href).href : "";
  let storedBase = "";
  try { storedBase = localStorage.getItem("balancasPublicSiteUrl") || ""; } catch { /* arquivo local sem armazenamento */ }
  const base = publicBase(currentBase) || publicBase(storedBase) || (currentBase ? new URL(currentBase) : null);
  if (base) {
    siteUrlInput.value = base.href;
    renderQr(base, base.protocol !== "https:");
  } else {
    renderQr(null);
  }

  document.getElementById("apply-url").addEventListener("click", () => {
    const base = publicBase(siteUrlInput.value.trim());
    if (!base) {
      message.textContent = "Informe um endereço HTTPS público, como https://usuario.github.io/balancas/.";
      printButton.disabled = true;
      return;
    }
    try { localStorage.setItem("balancasPublicSiteUrl", base.href); } catch { /* arquivo local sem armazenamento */ }
    renderQr(base);
  });
  printButton.addEventListener("click", () => window.print());

  try {
    const url = new URL(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`);
    url.searchParams.set("select", config.idColumn);
    url.searchParams.set(config.idColumn, `eq.${code}`);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, { headers: { apikey: config.publishableKey } });
    if (!response.ok) throw new Error();
    const records = await response.json();
    if (!records.length) {
      message.textContent = "Balança não encontrada. Abra uma ficha cadastrada para gerar o cartão.";
      return;
    }
    verified = true;
    printButton.disabled = !qrReady || !activeBase;
  } catch {
    message.textContent = "QR exibido como prévia; não foi possível confirmar a balança no Supabase.";
  }
})();
