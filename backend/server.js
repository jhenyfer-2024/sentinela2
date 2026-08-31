const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

// =========================
// CONFIGURAÇÕES
// =========================

app.use(express.json());
app.use(cors());

// Servir o frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Banco de dados
const DB_FILE = path.join(__dirname, "db.json");

// =========================
// BANCO DE DADOS
// =========================

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }

  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    // Garante que os campos existam
    if (!db.usuarios) db.usuarios = [];
    if (!db.pacientes) db.pacientes = [];
    if (!db.triagens) db.triagens = [];
    if (!db.consultas) db.consultas = [];
    if (!db.tv_chamada) db.tv_chamada = null;
    if (!db.tv_historico) db.tv_historico = [];

    return db;
  } catch (error) {
    console.error("Erro ao ler o banco de dados:", error);

    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Erro ao salvar o banco de dados:", error);
    throw error;
  }
}

// =========================
// TESTE DO SERVIDOR
// =========================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mensagem: "Hospital Pro API funcionando"
  });
});

// =========================
// LOGIN
// =========================

app.post("/login", (req, res) => {
  try {
    const db = readDB();

    const user = db.usuarios.find(
      (u) =>
        u.usuario === req.body.usuario &&
        u.senha === req.body.senha
    );

    if (!user) {
      return res.status(401).json({
        erro: "Login inválido"
      });
    }

    res.json(user);
  } catch (error) {
    console.error("Erro no login:", error);

    res.status(500).json({
      erro: "Erro interno no servidor"
    });
  }
});

// =========================
// ATENDIMENTO
// CADASTRAR PACIENTE
// =========================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),
      nome: req.body.nome,
      cpf: req.body.cpf,
      tipo: req.body.tipo,
      status: "triagem",
      createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);

    writeDB(db);

    res.json(paciente);
  } catch (error) {
    console.error("Erro no atendimento:", error);

    res.status(500).json({
      erro: "Erro ao cadastrar paciente"
    });
  }
});

// =========================
// LISTAR PACIENTES
// =========================

app.get("/pacientes", (req, res) => {
  try {
    const db = readDB();

    res.json(db.pacientes);
  } catch (error) {
    console.error("Erro ao listar pacientes:", error);

    res.status(500).json({
      erro: "Erro ao buscar pacientes"
    });
  }
});

// =========================
// TRIAGEM
// =========================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    let risco = req.body.risco;

    const temperatura = Number(req.body.temperatura);

    if (temperatura >= 39) {
      risco = "vermelho";
    } else if (temperatura >= 38) {
      risco = "amarelo";
    } else if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),
      nome: req.body.nome,
      sintoma: req.body.sintoma,
      temperatura: req.body.temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,
      risco,
      status: "aguardando_medico",
      createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);

    writeDB(db);

    res.json(triagem);
  } catch (error) {
    console.error("Erro na triagem:", error);

    res.status(500).json({
      erro: "Erro ao registrar triagem"
    });
  }
});

// =========================
// LISTAR TRIAGENS
// =========================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();

    res.json(db.triagens);
  } catch (error) {
    console.error("Erro ao listar triagens:", error);

    res.status(500).json({
      erro: "Erro ao buscar triagens"
    });
  }
});

// =========================
// TV / CHAMADA DE PACIENTE
// =========================

app.post("/tv/chamar", (req, res) => {
  try {
    const db = readDB();

    const chamada = {
      id: Date.now().toString(),

      localTipo: req.body.localTipo,

      localNumero: req.body.localNumero,

      paciente: req.body.paciente,

      hora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    db.tv_chamada = chamada;

    db.tv_historico.unshift(chamada);

    // Mantém somente as últimas 5 chamadas
