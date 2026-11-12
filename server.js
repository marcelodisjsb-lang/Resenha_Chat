const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const mensagens = [];
const mensagensPrivadas = [];
const usuarios = new Map();

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {

    socket.emit("historico", mensagens);

    socket.on("entrar", (nomeRecebido) => {

        const nome = String(nomeRecebido || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 20);

        if (!nome) return;

        socket.data.nome = nome;
        usuarios.set(socket.id, nome);

        atualizarUsuarios();

        socket.emit("entradaConfirmada", nome);

        io.emit("aviso", nome + " entrou no chat.");
    });

    // Enviar mensagem pública
    socket.on("enviarMensagem", (textoRecebido) => {

        if (!socket.data.nome) return;

        const texto = String(textoRecebido || "")
            .trim()
            .slice(0, 500);

        if (!texto) return;

        if (!podeEnviar(socket)) return;

        const mensagem = {
            id: criarId(),
            authorId: socket.id,
            nome: socket.data.nome,
            texto: texto,
            horario: horarioAtual(),
            reacoes: {}
        };

        mensagens.push(mensagem);

        if (mensagens.length > 100) {
            mensagens.shift();
        }

        io.emit("novaMensagem", mensagem);
    });

    // Apagar mensagem pública própria
    socket.on("apagarMensagem", (mensagemId) => {

        if (!socket.data.nome) return;

        const indice = mensagens.findIndex(
            mensagem =>
                mensagem.id === mensagemId &&
                mensagem.authorId === socket.id
        );

        if (indice === -1) return;

        mensagens.splice(indice, 1);

        io.emit("mensagemApagada", mensagemId);
    });

    // Abrir conversa privada
    socket.on("abrirPrivado", (destinatarioId) => {

        if (!socket.data.nome) return;
        if (!usuarios.has(destinatarioId)) return;
        if (destinatarioId === socket.id) return;

        const historico = mensagensPrivadas.filter(
            mensagem =>
                (mensagem.deId === socket.id &&
                 mensagem.paraId === destinatarioId) ||
                (mensagem.deId === destinatarioId &&
                 mensagem.paraId === socket.id)
        );

        socket.emit("historicoPrivado", {
            usuarioId: destinatarioId,
            mensagens: historico
        });
    });

    // Enviar mensagem privada
    socket.on("enviarPrivado", (dados) => {

        if (!socket.data.nome || !dados) return;

        const destinatarioId = dados.destinatarioId;

        if (!usuarios.has(destinatarioId)) return;
        if (destinatarioId === socket.id) return;

        const texto = String(dados.texto || "")
            .trim()
            .slice(0, 500);

        if (!texto) return;

        if (!podeEnviar(socket)) return;

        const mensagem = {
            id: criarId(),
            deId: socket.id,
            paraId: destinatarioId,
            nome: socket.data.nome,
            texto: texto,
            horario: horarioAtual()
        };

        mensagensPrivadas.push(mensagem);

        if (mensagensPrivadas.length > 200) {
            mensagensPrivadas.shift();
        }

        // Somente remetente e destinatário recebem a mensagem
        io.to(socket.id).emit("novaMensagemPrivada", mensagem);
        io.to(destinatarioId).emit("novaMensagemPrivada", mensagem);
    });

    // Apagar mensagem privada própria
    socket.on("apagarPrivado", (mensagemId) => {

        if (!socket.data.nome) return;

        const indice = mensagensPrivadas.findIndex(
            mensagem =>
                mensagem.id === mensagemId &&
                mensagem.deId === socket.id
        );

        if (indice === -1) return;

        const mensagem = mensagensPrivadas[indice];

        mensagensPrivadas.splice(indice, 1);

        io.to(mensagem.deId).emit(
            "mensagemPrivadaApagada",
            mensagemId
        );

        io.to(mensagem.paraId).emit(
            "mensagemPrivadaApagada",
            mensagemId
        );
    });

    // Reações nas mensagens públicas
    socket.on("reagir", (dados) => {

        const emojis = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

        if (!socket.data.nome || !dados) return;
        if (!emojis.includes(dados.emoji)) return;

        const mensagem = mensagens.find(
            item => item.id === dados.mensagemId
        );

        if (!mensagem) return;

        mensagem.reacoes[dados.emoji] =
            (mensagem.reacoes[dados.emoji] || 0) + 1;

        io.emit("reacaoAtualizada", {
            mensagemId: dados.mensagemId,
            reacoes: mensagem.reacoes
        });
    });

    // Desconexão
    socket.on("disconnect", () => {

        const nome = usuarios.get(socket.id);

        if (nome) {
            usuarios.delete(socket.id);

            atualizarUsuarios();

            io.emit("aviso", nome + " saiu do chat.");
        }
    });
});

// Atualizar participantes
function atualizarUsuarios() {

    const lista = Array.from(usuarios.entries()).map(
        ([id, nome]) => ({
            id: id,
            nome: nome
        })
    );

    io.emit("listaUsuarios", lista);
}

// Limitar frequência de envio
function podeEnviar(socket) {

    const agora = Date.now();

    if (agora - (socket.data.ultimaMensagem || 0) < 700) {
        return false;
    }

    socket.data.ultimaMensagem = agora;

    return true;
}

// Gerar identificador
function criarId() {
    return Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Horário das mensagens
function horarioAtual() {
    return new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

server.listen(PORT, "0.0.0.0", () => {
    console.log("ConectaChat funcionando na porta " + PORT);
});
