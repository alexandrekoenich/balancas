(async () => {
  const title = document.getElementById("title");
  const message = document.getElementById("message");
  const details = document.getElementById("details");
  const config = window.BALANCAS_CONFIG;
  const id = new URLSearchParams(location.search).get("id")?.trim();
  if (!id) {
    location.replace("cadastro.html");
    return;
  }
  if (!/^BAL-\d+$/i.test(id)) {
    message.textContent = "Informe um código válido no endereço, por exemplo: ?id=BAL-001.";
    return;
  }
  title.textContent = id.toUpperCase();
  if (!config?.publishableKey || config.publishableKey.startsWith("COLE_AQUI")) {
    message.textContent = "A consulta ainda não foi configurada.";
    return;
  }
  const labels = {
    id: "Identificação", codigo: "Código", local: "Local", localizacao: "Localização",
    marca: "Marca", modelo: "Modelo", numero_serie: "Número de série",
    serie: "Número de série", capacidade: "Capacidade", status: "Status",
    setor: "Setor", responsavel: "Responsável",
    ultima_calibracao: "Última calibração", proxima_calibracao: "Próxima calibração",
    ultima_manutencao: "Última manutenção", observacao: "Observação"
  };
  try {
    const url = new URL(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`);
    url.searchParams.set("select", "*");
    url.searchParams.set(config.idColumn, `eq.${id.toUpperCase()}`);
    url.searchParams.set("limit", "1");
    const response = await fetch(url, {
      headers: { apikey: config.publishableKey }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const [record] = await response.json();
    if (!record) {
      message.textContent = "Balança não encontrada.";
      return;
    }
    for (const [key, value] of Object.entries(record)) {
      if (value == null || value === "" || !labels[key]) continue;
      const row = document.createElement("div");
      row.className = "row";
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = labels[key];
      dd.textContent = key === "status" && typeof value === "boolean"
        ? (value ? "Ativa" : "Inativa")
        : String(value);
      row.append(dt, dd);
      details.append(row);
    }
    message.hidden = true;
    details.hidden = false;
    document.getElementById("card-link").href = `cartao.html?id=${encodeURIComponent(id.toUpperCase())}`;
    document.getElementById("card-action").hidden = false;
  } catch {
    message.textContent = "Não foi possível consultar esta balança. Tente novamente mais tarde.";
  }
})();
