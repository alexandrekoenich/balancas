(() => {
  const config = window.BALANCAS_CONFIG;
  const message = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const recoveryForm = document.getElementById("recovery-form");
  const resetForm = document.getElementById("reset-form");
  const signupResult = document.getElementById("signup-result");
  const scaleForm = document.getElementById("scale-form");
  const workspace = document.getElementById("workspace");
  const dashboard = document.getElementById("dashboard");
  const registration = document.getElementById("registration");
  const scaleList = document.getElementById("scale-list");
  const listMessage = document.getElementById("list-message");
  const scaleSearch = document.getElementById("scale-search");
  const savedLink = document.getElementById("saved-link");
  let accessToken = null;
  let recoveryToken = null;
  let scales = [];
  let hasSituationColumn = false;
  let editingCode = null;

  const situationLabels = {
    ativa: "Ativa",
    inativa: "Inativa",
    manutencao: "Em manutenção"
  };

  function situationOf(scale) {
    return situationLabels[scale.situacao] ? scale.situacao : (scale.status ? "ativa" : "inativa");
  }

  function setMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("error", error);
  }

  async function apiError(response) {
    const body = await response.json().catch(() => ({}));
    return body.message || body.msg || body.error_description || body.error || `Erro ${response.status}`;
  }

  function showDashboard() {
    editingCode = null;
    scaleForm.reset();
    document.getElementById("codigo").readOnly = false;
    document.getElementById("codigo-hint").hidden = true;
    registration.hidden = true;
    dashboard.hidden = false;
    document.getElementById("page-title").textContent = "Balanças";
    setMessage("Consulte uma balança ou gere seu cartão.");
  }

  function openScaleForm(scale = null) {
    scaleForm.reset();
    editingCode = scale?.codigo || null;
    document.getElementById("codigo").value = scale?.codigo || "";
    document.getElementById("codigo").readOnly = Boolean(editingCode);
    document.getElementById("codigo-hint").hidden = !editingCode;
    document.getElementById("setor").value = scale?.setor || "";
    document.getElementById("responsavel").value = scale?.responsavel || "";
    document.getElementById("status").value = scale ? situationOf(scale) : "ativa";
    document.getElementById("ultima_manutencao").value = scale?.ultima_manutencao?.slice(0, 10) || "";
    document.getElementById("form-title").textContent = editingCode ? `Editar ${editingCode}` : "Nova balança";
    document.getElementById("form-submit").textContent = editingCode ? "Salvar alterações" : "Cadastrar balança";
    savedLink.hidden = true;
    dashboard.hidden = true;
    registration.hidden = false;
    document.getElementById("page-title").textContent = editingCode ? "Editar balança" : "Cadastrar balança";
    setMessage(editingCode ? "Atualize as informações da balança." : "Preencha os dados da nova balança.");
    document.getElementById(editingCode ? "setor" : "codigo").focus();
  }

  function renderScales() {
    const term = scaleSearch.value.trim().toLocaleLowerCase("pt-BR");
    const matching = scales.filter((scale) =>
      `${scale.codigo || ""} ${scale.setor || ""}`.toLocaleLowerCase("pt-BR").includes(term)
    );
    scaleList.replaceChildren();
    listMessage.textContent = matching.length
      ? `${matching.length} balança${matching.length === 1 ? "" : "s"} encontrada${matching.length === 1 ? "" : "s"}.`
      : "Nenhuma balança encontrada.";
    for (const scale of matching) {
      if (!scale.codigo) continue;
      const item = document.createElement("article");
      item.className = "scale-item";
      const header = document.createElement("div");
      header.className = "scale-item-header";
      const name = document.createElement("strong");
      name.textContent = scale.codigo;
      const badge = document.createElement("span");
      const situation = situationOf(scale);
      badge.className = `status-badge ${situation}`;
      badge.textContent = situationLabels[situation];
      header.append(name, badge);
      const sector = document.createElement("p");
      sector.textContent = scale.setor || "Setor não informado";
      const actions = document.createElement("div");
      actions.className = "scale-item-actions";
      const view = document.createElement("a");
      view.href = `index.html?id=${encodeURIComponent(scale.codigo)}`;
      view.textContent = "Consultar ficha";
      const card = document.createElement("a");
      card.href = `cartao.html?id=${encodeURIComponent(scale.codigo)}`;
      card.textContent = "Gerar cartão";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Editar";
      edit.addEventListener("click", () => openScaleForm(scale));
      actions.append(view, card, edit);
      const editor = document.createElement("div");
      editor.className = "situation-editor";
      const editorLabel = document.createElement("label");
      editorLabel.textContent = "Alterar situação";
      const select = document.createElement("select");
      for (const [value, label] of Object.entries(situationLabels)) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.append(option);
      }
      select.value = situation;
      const save = document.createElement("button");
      save.type = "button";
      save.textContent = "Salvar situação";
      const feedback = document.createElement("span");
      feedback.setAttribute("role", "status");
      save.addEventListener("click", () => saveSituation(scale.codigo, select.value, save, feedback));
      editor.append(editorLabel, select, save, feedback);
      item.append(header, sector, actions, editor);
      scaleList.append(item);
    }
  }

  async function saveSituation(codigo, situacao, button, feedback) {
    if (situacao === "manutencao" && !hasSituationColumn) {
      feedback.textContent = "Atualize a tabela no Supabase para usar Em manutenção.";
      return;
    }
    button.disabled = true;
    feedback.textContent = "Salvando…";
    try {
      const url = new URL(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`);
      url.searchParams.set(config.idColumn, `eq.${codigo}`);
      const data = { status: situacao === "ativa" };
      if (hasSituationColumn) data.situacao = situacao;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await apiError(response));
      const changed = await response.json();
      if (!changed.length) throw new Error("Conta sem permissão para alterar esta balança.");
      await loadScales();
      setMessage(`${codigo}: situação alterada para ${situationLabels[situacao]}.`);
    } catch (error) {
      feedback.textContent = `Não foi possível salvar: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  async function loadScales() {
    listMessage.textContent = "Carregando balanças…";
    try {
      const url = new URL(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`);
      url.searchParams.set("select", "*");
      url.searchParams.set("order", "codigo.asc");
      url.searchParams.set("limit", "1000");
      const response = await fetch(url, { headers: { apikey: config.publishableKey } });
      if (!response.ok) throw new Error(await apiError(response));
      scales = await response.json();
      hasSituationColumn = scales.some((scale) => Object.hasOwn(scale, "situacao"));
      renderScales();
    } catch {
      listMessage.textContent = "Não foi possível carregar as balanças. Tente atualizar a lista.";
    }
  }

  async function enterWorkspace(user) {
    document.getElementById("signed-in-as").textContent = user?.email || "Conta conectada";
    signupResult.textContent = user?.id ? `ID da conta para autorização: ${user.id}` : "";
    signupResult.hidden = !user?.id;
    loginForm.hidden = true;
    workspace.hidden = false;
    document.querySelector(".card").classList.add("workspace-card");
    showDashboard();
    await loadScales();
  }

  scaleSearch.addEventListener("input", renderScales);
  document.getElementById("refresh-scales").addEventListener("click", loadScales);
  document.getElementById("new-scale").addEventListener("click", () => openScaleForm());
  document.getElementById("back-dashboard").addEventListener("click", showDashboard);

  const recoveryHash = new URLSearchParams(location.hash.slice(1));
  if (recoveryHash.has("access_token") && recoveryHash.get("type") !== "recovery") {
    history.replaceState(null, "", location.pathname + location.search);
  }
  if (recoveryHash.get("type") === "recovery") {
    recoveryToken = recoveryHash.get("access_token");
    history.replaceState(null, "", location.pathname + location.search);
    if (recoveryToken) {
      loginForm.hidden = true;
      resetForm.hidden = false;
      setMessage("Digite a nova senha da sua conta.");
    } else {
      setMessage("O link de redefinição está inválido ou expirou. Solicite outro link.", true);
    }
  }

  document.getElementById("show-recovery").addEventListener("click", () => {
    loginForm.hidden = true;
    recoveryForm.hidden = false;
    document.getElementById("recovery-email").value = document.getElementById("email").value;
    setMessage("Informe seu e-mail para receber o link de redefinição.");
  });

  document.getElementById("recovery-back").addEventListener("click", () => {
    recoveryForm.hidden = true;
    loginForm.hidden = false;
    setMessage("Entre com sua conta.");
  });

  recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!/^https?:$/.test(location.protocol)) {
      setMessage("Abra a aplicação pelo servidor local para redefinir a senha.", true);
      return;
    }
    const button = recoveryForm.querySelector("button[type=submit]");
    button.disabled = true;
    setMessage("Enviando link…");
    try {
      const redirectTo = new URL("cadastro.html", location.href).href;
      const endpoint = new URL(`${config.supabaseUrl}/auth/v1/recover`);
      endpoint.searchParams.set("redirect_to", redirectTo);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: document.getElementById("recovery-email").value.trim() })
      });
      if (!response.ok) throw new Error(await apiError(response));
      setMessage("Se a conta existir, você receberá um link para redefinir a senha. Confira também a caixa de spam.");
    } catch (error) {
      setMessage(`Não foi possível enviar o link: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("new-password").value;
    if (password !== document.getElementById("confirm-new-password").value) {
      setMessage("As senhas não coincidem.", true);
      return;
    }
    const button = resetForm.querySelector("button[type=submit]");
    button.disabled = true;
    setMessage("Salvando nova senha…");
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${recoveryToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });
      if (!response.ok) throw new Error(await apiError(response));
      recoveryToken = null;
      resetForm.reset();
      resetForm.hidden = true;
      loginForm.hidden = false;
      setMessage("Senha redefinida. Entre com a nova senha.");
    } catch (error) {
      setMessage(`Não foi possível redefinir a senha: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("show-signup").addEventListener("click", () => {
    loginForm.hidden = true;
    signupForm.hidden = false;
    signupResult.hidden = true;
    setMessage("Crie seu acesso com e-mail e senha.");
  });

  document.getElementById("show-login").addEventListener("click", () => {
    signupForm.hidden = true;
    loginForm.hidden = false;
    setMessage("Entre com sua conta.");
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    if (password !== document.getElementById("signup-confirm").value) {
      setMessage("As senhas não coincidem.", true);
      return;
    }
    const button = signupForm.querySelector("button[type=submit]");
    button.disabled = true;
    setMessage("Criando conta…");
    try {
      const signupEndpoint = new URL(`${config.supabaseUrl}/auth/v1/signup`);
      if (/^https?:$/.test(location.protocol)) {
        signupEndpoint.searchParams.set("redirect_to", new URL("cadastro.html", location.href).href);
      }
      const response = await fetch(signupEndpoint, {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error(await apiError(response));
      const result = await response.json();
      signupForm.reset();
      signupForm.hidden = true;
      loginForm.hidden = false;
      document.getElementById("email").value = email;
      signupResult.textContent = result.user?.id
        ? `ID da conta para autorização: ${result.user.id}`
        : "Após entrar, copie o ID da conta para autorização.";
      signupResult.hidden = false;
      setMessage("Conta solicitada. Confirme o e-mail se receber uma mensagem do Supabase; depois entre com sua senha.");
    } catch (error) {
      setMessage(`Não foi possível criar a conta: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button");
    button.disabled = true;
    setMessage("Entrando…");
    try {
      const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value
        })
      });
      if (!response.ok) throw new Error(await apiError(response));
      const session = await response.json();
      accessToken = session.access_token;
      try { sessionStorage.setItem("balancasSession", JSON.stringify({ accessToken, user: session.user })); } catch { /* sessão apenas nesta página */ }
      document.getElementById("password").value = "";
      await enterWorkspace(session.user);
    } catch (error) {
      setMessage(`Não foi possível entrar: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById("logout").addEventListener("click", () => {
    accessToken = null;
    try { sessionStorage.removeItem("balancasSession"); } catch { /* sessão apenas nesta página */ }
    workspace.hidden = true;
    document.querySelector(".card").classList.remove("workspace-card");
    registration.hidden = true;
    dashboard.hidden = false;
    loginForm.hidden = false;
    savedLink.hidden = true;
    signupResult.hidden = true;
    document.getElementById("page-title").textContent = "Gestão de balanças";
    setMessage("Você saiu. Entre novamente para cadastrar.");
  });

  scaleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!accessToken) return;
    const button = document.getElementById("form-submit");
    const isEdit = Boolean(editingCode);
    const codigo = document.getElementById("codigo").value.trim().toUpperCase();
    const situacao = document.getElementById("status").value;
    if (situacao === "manutencao" && !hasSituationColumn) {
      setMessage("Atualize a tabela no Supabase para usar a situação Em manutenção.", true);
      return;
    }
    const data = {
      setor: document.getElementById("setor").value.trim(),
      responsavel: document.getElementById("responsavel").value.trim() || null,
      status: situacao === "ativa",
      ultima_manutencao: document.getElementById("ultima_manutencao").value || null
    };
    if (!isEdit) data.codigo = codigo;
    if (hasSituationColumn) data.situacao = situacao;
    button.disabled = true;
    savedLink.hidden = true;
    setMessage(isEdit ? "Salvando alterações…" : "Salvando balança…");
    try {
      const url = new URL(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`);
      if (isEdit) url.searchParams.set(config.idColumn, `eq.${editingCode}`);
      const response = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: isEdit ? "return=representation" : "return=minimal"
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const detail = await apiError(response);
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Conta sem permissão para ${isEdit ? "editar" : "cadastrar"}. Verifique as políticas no Supabase.`);
        }
        if (!isEdit && (response.status === 409 || /duplicate|unique/i.test(detail))) {
          throw new Error(`O código ${codigo} já está cadastrado.`);
        }
        throw new Error(detail);
      }
      if (isEdit && !(await response.json()).length) {
        throw new Error("Conta sem permissão para editar esta balança.");
      }
      setMessage(`${codigo} ${isEdit ? "atualizada" : "cadastrada"} com sucesso.`);
      const link = document.createElement("a");
      link.href = `index.html?id=${encodeURIComponent(codigo)}`;
      link.textContent = `Ver ficha da ${codigo}`;
      savedLink.replaceChildren(link);
      savedLink.hidden = false;
      if (!isEdit) scaleForm.reset();
      await loadScales();
    } catch (error) {
      setMessage(`Não foi possível cadastrar: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  if (recoveryHash.get("type") !== "recovery") {
    let savedSession = null;
    try { savedSession = JSON.parse(sessionStorage.getItem("balancasSession") || "null"); } catch { /* sessão indisponível */ }
    if (savedSession?.accessToken) {
      fetch(`${config.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${savedSession.accessToken}` }
      }).then(async (response) => {
        if (!response.ok) throw new Error("Sessão expirada");
        accessToken = savedSession.accessToken;
        await enterWorkspace(await response.json());
      }).catch(() => {
        try { sessionStorage.removeItem("balancasSession"); } catch { /* sessão indisponível */ }
      });
    }
  }
})();
