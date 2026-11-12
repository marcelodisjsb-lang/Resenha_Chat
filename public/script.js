const socket = io();

const telaEntrada = document.querySelector("#telaEntrada");
const areaChat = document.querySelector("#areaChat");

const formularioNome = document.querySelector("#formNome");
const campoNome = document.querySelector("#nome");

const conversaPublica = document.querySelector("#conversaPublica");
const conversaPrivada = document.querySelector("#conversaPrivada");

const formularioMensagem = document.querySelector("#formMensagem");
const campoMensagem = document.querySelector("#textoMensagem");

const formularioMensagemPrivada =
    document.querySelector("#formMensagemPrivada");

const campoMensagemPrivada =
    document.querySelector("#textoMensagemPrivada");

const caixaMensagens = document.querySelector("#mensagens");
const caixaMensagensPrivadas =
    document.querySelector("#mensagensPrivadas");

const listaUsuarios = document.querySelector("#listaUsuarios");
const quantidadeUsuarios =
    document.querySelector("#quantidadeUsuarios");

const caixaAviso = document.querySelector("#aviso");
const caixaAvisoPrivado =
    document.querySelector("#avisoPrivado");

const tituloPrivado = document.querySelector("#tituloPrivado");
const botaoVoltar = document.querySelector("#voltarSala");

let meuNome = "";
let usuarioSelecionado = null;

const emojisReacao = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

// Entrar no chat
formularioNome.addEventListener("submit", (evento) => {

    evento.preventDefault();

    const nome = campoNome.value.trim();

    if (!nome) return;

    socket.emit("entrar", nome);
});

socket.on("entradaConfirmada", (nome) => {

    meuNome = nome;

    telaEntrada.classList.add("escondido");
    areaChat.classList.remove("escondido");

    campoMensagem.focus();
});

// Enviar mensagem pública
formularioMensagem.addEventListener("submit", (evento) => {

    evento.preventDefault();

    const texto = campoMensagem.value.trim();

    if (!texto) return;

    socket.emit("enviarMensagem", texto);

    campoMensagem.value = "";
    campoMensagem.focus();
});

// Enviar mensagem privada
formularioMensagemPrivada.addEventListener("submit", (evento) => {

    evento.preventDefault();

    if (!usuarioSelecionado) return;

    const texto = campoMensagemPrivada.value.trim();

    if (!texto) return;

    socket.emit("enviarPrivado", {
        destinatarioId: usuarioSelecionado.id,
        texto: texto
    });

    campoMensagemPrivada.value = "";
    campoMensagemPrivada.focus();
});

// Atalhos de emojis nas duas áreas
document.querySelectorAll(".emoji").forEach((botao) => {

    botao.addEventListener("click", () => {

        const emoji = botao.dataset.emoji;

        if (usuarioSelecionado && !conversaPrivada.classList.contains("escondido")) {
            campoMensagemPrivada.value += emoji;
            campoMensagemPrivada.focus();
        } else {
            campoMensagem.value += emoji;
            campoMensagem.focus();
        }
    });
});

// Criar botão de apagar
function adicionarBotaoApagar(artigo, privado) {

    const botaoApagar = document.createElement("button");

    botaoApagar.type = "button";
    botaoApagar.className = "apagar-mensagem";
    botaoApagar.textContent = "🗑️ Apagar";

    botaoApagar.addEventListener("click", () => {

        const confirmar = window.confirm(
            "Deseja apagar esta mensagem para todos?"
        );

        if (!confirmar) return;

        if (privado) {
            socket.emit("apagarPrivado", artigo.dataset.id);
        } else {
            socket.emit("apagarMensagem", artigo.dataset.id);
        }
    });

    artigo.appendChild(botaoApagar);
}

// Criar mensagem pública
function criarMensagemPublica(mensagem) {

    const artigo = document.createElement("article");

    artigo.className = "mensagem";
    artigo.dataset.id = mensagem.id;

    if (mensagem.authorId === socket.id) {
        artigo.classList.add("propria");
    }

    const detalhes = document.createElement("div");
    detalhes.className = "detalhes";

    const nome = document.createElement("strong");
    nome.textContent = mensagem.nome;

    const horario = document.createElement("time");
    horario.textContent = mensagem.horario;

    detalhes.append(nome, horario);

    const texto = document.createElement("p");
    texto.className = "texto";
    texto.textContent = mensagem.texto;

    const reacoes = document.createElement("div");
    reacoes.className = "reacoes";

    artigo.append(detalhes, texto, reacoes);

    if (mensagem.authorId === socket.id) {
        adicionarBotaoApagar(artigo, false);
    }

    caixaMensagens.appendChild(artigo);

    atualizarReacoes(
        mensagem.id,
        mensagem.reacoes || {}
    );

    caixaMensagens.scrollTop = caixaMensagens.scrollHeight;
}

// Criar mensagem privada
function criarMensagemPrivada(mensagem) {

    if (!usuarioSelecionado) return;

    const conversaCorreta =
        (mensagem.deId === socket.id &&
         mensagem.paraId === usuarioSelecionado.id) ||
        (mensagem.deId === usuarioSelecionado.id &&
         mensagem.paraId === socket.id);

    if (!conversaCorreta) return;

    if (caixaMensagensPrivadas.querySelector(
        `[data-id="${mensagem.id}"]`
    )) return;

    const artigo = document.createElement("article");

    artigo.className = "mensagem";
    artigo.dataset.id = mensagem.id;

    if (mensagem.deId === socket.id) {
        artigo.classList.add("propria");
    }

    const detalhes = document.createElement("div");
    detalhes.className = "detalhes";

    const nome = document.createElement("strong");
    nome.textContent = mensagem.deId === socket.id
        ? "Você"
        : mensagem.nome;

    const horario = document.createElement("time");
    horario.textContent = mensagem.horario;

    detalhes.append(nome, horario);

    const texto = document.createElement("p");
    texto.className = "texto";
    texto.textContent = mensagem.texto;

    artigo.append(detalhes, texto);

    if (mensagem.deId === socket.id) {
        adicionarBotaoApagar(artigo, true);
    }

    caixaMensagensPrivadas.appendChild(artigo);

    caixaMensagensPrivadas.scrollTop =
        caixaMensagensPrivadas.scrollHeight;
}

// Atualizar reações
function atualizarReacoes(mensagemId, reacoes) {

    const artigo = caixaMensagens.querySelector(
        `[data-id="${mensagemId}"]`
    );

    if (!artigo) return;

    const area = artigo.querySelector(".reacoes");

    if (!area) return;

    area.replaceChildren();

    emojisReacao.forEach((emoji) => {

        const total = reacoes[emoji] || 0;

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "reacao";

        botao.textContent = total > 0
            ? `${emoji} ${total}`
            : emoji;

        botao.addEventListener("click", () => {

            socket.emit("reagir", {
                mensagemId: mensagemId,
                emoji: emoji
            });
        });

        area.appendChild(botao);
    });
}

// Histórico público
socket.on("historico", (historico) => {

    caixaMensagens.replaceChildren();

    historico.forEach((mensagem) => {
        criarMensagemPublica(mensagem);
    });
});

// Novas mensagens públicas
socket.on("novaMensagem", (mensagem) => {
    criarMensagemPublica(mensagem);
});

// Apagar mensagem pública
socket.on("mensagemApagada", (mensagemId) => {

    const artigo = caixaMensagens.querySelector(
        `[data-id="${mensagemId}"]`
    );

    if (artigo) {
        artigo.remove();
    }
});

// Lista de participantes
socket.on("listaUsuarios", (usuarios) => {

    listaUsuarios.replaceChildren();

    quantidadeUsuarios.textContent = usuarios.length;

    usuarios.forEach((usuario) => {

        if (usuario.id === socket.id) return;

        const item = document.createElement("li");

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "usuario-botao";
        botao.textContent = usuario.nome;

        botao.addEventListener("click", () => {
            abrirConversaPrivada(usuario);
        });

        item.appendChild(botao);

        listaUsuarios.appendChild(item);
    });

    // Se o usuário sair, volta para a sala geral
    if (
        usuarioSelecionado &&
        !usuarios.some(usuario => usuario.id === usuarioSelecionado.id)
    ) {
        voltarParaSala();
        mostrarAviso("Essa pessoa saiu do chat.");
    }
});

// Abrir conversa privada
function abrirConversaPrivada(usuario) {

    usuarioSelecionado = usuario;

    tituloPrivado.textContent = "🔒 " + usuario.nome;

    conversaPublica.classList.add("escondido");
    conversaPrivada.classList.remove("escondido");

    caixaMensagensPrivadas.replaceChildren();

    campoMensagemPrivada.value = "";
    campoMensagemPrivada.focus();

    socket.emit("abrirPrivado", usuario.id);
}

// Receber histórico privado
socket.on("historicoPrivado", (dados) => {

    if (!usuarioSelecionado) return;

    if (dados.usuarioId !== usuarioSelecionado.id) return;

    caixaMensagensPrivadas.replaceChildren();

    dados.mensagens.forEach((mensagem) => {
        criarMensagemPrivada(mensagem);
    });
});

// Receber nova mensagem privada
socket.on("novaMensagemPrivada", (mensagem) => {

    if (!usuarioSelecionado) return;

    const conversaCorreta =
        (mensagem.deId === socket.id &&
         mensagem.paraId === usuarioSelecionado.id) ||
        (mensagem.deId === usuarioSelecionado.id &&
         mensagem.paraId === socket.id);

    if (conversaCorreta) {
        criarMensagemPrivada(mensagem);
    } else if (mensagem.paraId === socket.id) {
        caixaAviso.textContent =
            "Você recebeu uma mensagem privada de " + mensagem.nome + ".";
    }
});

// Apagar mensagem privada
socket.on("mensagemPrivadaApagada", (mensagemId) => {

    const artigo = caixaMensagensPrivadas.querySelector(
        `[data-id="${mensagemId}"]`
    );

    if (artigo) {
        artigo.remove();
    }
});

// Atualizar reações
socket.on("reacaoAtualizada", (dados) => {

    atualizarReacoes(
        dados.mensagemId,
        dados.reacoes
    );
});

// Voltar para sala geral
botaoVoltar.addEventListener("click", voltarParaSala);

function voltarParaSala() {

    usuarioSelecionado = null;

    conversaPrivada.classList.add("escondido");
    conversaPublica.classList.remove("escondido");

    campoMensagem.focus();
}

// Avisos
socket.on("aviso", (texto) => {
    mostrarAviso(texto);
});

function mostrarAviso(texto) {

    caixaAviso.textContent = texto;

    window.setTimeout(() => {

        if (caixaAviso.textContent === texto) {
            caixaAviso.textContent = "";
        }

    }, 3500);
}

// Erros de conexão
socket.on("connect_error", () => {

    caixaAviso.textContent =
        "Não foi possível conectar. Atualize a página e tente novamente.";
});
