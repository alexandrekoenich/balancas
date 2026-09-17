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

  function setMessage(text, error = false) {
    message.textContent = text;
    message.classList.toggle("error", error);
  }

  async function apiError(response) {
    const body = await response.json().catch(() => ({}));
    return body.message || body.msg || body.error_description || body.error || `Erro ${response.status}`;
  }

  function showDashboard() {
    registration.hidden = true;
    dashboard.hidden = false;
    document.getElementById("page-title").textContent = "Balanças";
    setMessage("Consulte uma balança ou gere seu cartão.");
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
      badge.className = `status-badge ${scale.status ? "active" : "inactive"}`;
      badge.textContent = scale.status ? "Ativa" : "Inativa";
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
      actions.append(view, card);
      item.append(header, sector, actions);
      scaleList.append(item);
    }
  }

  async function loadScales() {
    listMessage.textContent = "Carregando balanças…";
    try {
      const url = new URL(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`);
      url.searchParams.set("select", "codigo,setor,status,responsavel");
      url.searchParams.set("order", "codigo.asc");
      url.searchParams.set("limit", "1000");
      const response = await fetch(url, { headers: { apikey: config.publishableKey } });
      if (!response.ok) throw new Error(await apiError(response));
      scales = await response.json();
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
  document.getElementById("new-scale").addEventListener("click", () => {
    dashboard.hidden = true;
    registration.hidden = false;
    document.getElementById("page-title").textContent = "Cadastrar balança";
    setMessage("Preencha os dados da nova balança.");
    document.getElementById("codigo").focus();
  });
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
    const button = scaleForm.querySelector("button");
    const codigo = document.getElementById("codigo").value.trim().toUpperCase();
    const data = {
      codigo,
      setor: document.getElementById("setor").value.trim(),
      responsavel: document.getElementById("responsavel").value.trim() || null,
      status: document.getElementById("status").value === "true",
      ultima_manutencao: document.getElementById("ultima_manutencao").value || null
    };
    button.disabled = true;
    savedLink.hidden = true;
    setMessage("Salvando balança…");
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.table)}`, {
        method: "POST",
        headers: {
          apikey: config.publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const detail = await apiError(response);
        if (response.status === 401 || response.status === 403) {
          throw new Error("Conta sem permissão para cadastrar. Verifique a política de INSERT no Supabase.");
        }
        if (response.status === 409 || /duplicate|unique/i.test(detail)) {
          throw new Error(`O código ${codigo} já está cadastrado.`);
        }
        throw new Error(detail);
      }
      setMessage(`${codigo} cadastrada com sucesso.`);
      const link = document.createElement("a");
      link.href = `index.html?id=${encodeURIComponent(codigo)}`;
      link.textContent = `Ver ficha da ${codigo}`;
      savedLink.replaceChildren(link);
      savedLink.hidden = false;
      scaleForm.reset();
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
