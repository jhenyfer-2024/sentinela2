onst express = require("express");
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
const FRONTEND_DIR = path.join(__dirname, "../frontend");
app.use(express.static(FRONTEND_DIR));

// Banco de dados
const DB_FILE = path.join(__dirname, "db.json");

// =========================
// BANCO DE DADOS
// =========================

function createEmptyDB() {
  return {
    usuarios: [],
    pacientes: [],
    triagens: [],
    consultas: [],
    tv_chamada: null,
    tv_historico: []
  };
}

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const db = createEmptyDB();

    try {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(db, null, 2),
        "utf8"
      );
    } catch (error) {
      console.error("Erro ao criar banco de dados:", error);
    }

    return db;
  }

  try {
    const content = fs.readFileSync(DB_FILE, "utf8");

    if (!content.trim()) {
      return createEmptyDB();
    }

    const db = JSON.parse(content);

    // Garante que todos os campos existam
    if (!Array.isArray(db.usuarios)) {
      db.usuarios = [];
    }

    if (!Array.isArray(db.pacientes)) {
      db.pacientes = [];
    }

    if (!Array.isArray(db.triagens)) {
      db.triagens = [];
    }

    if (!Array.isArray(db.consultas)) {
      db.consultas = [];
    }

    if (!("tv_chamada" in db)) {
      db.tv_chamada = null;
    }

    if (!Array.isArray(db.tv_historico)) {
      db.tv_historico = [];
    }

    return db;

  } catch (error) {
    console.error("Erro ao ler o banco de dados:", error);

    return createEmptyDB();
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    return true;

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

    const usuario = req.body.usuario;
    const senha = req.body.senha;

    if (!usuario || !senha) {
      return res.status(400).json({
        erro: "Usuário e senha são obrigatórios"
      });
    }

    const user = db.usuarios.find(
      (u) =>
        u.usuario === usuario &&
        u.senha === senha
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

    if (!req.body.nome) {
      return res.status(400).json({
        erro: "Nome do paciente é obrigatório"
      });
    }

    const paciente = {
      id: Date.now(),

      nome: req.body.nome,

      cpf: req.body.cpf || "",

      tipo: req.body.tipo || "",

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

    // Classificação automática pelo valor da temperatura
    if (!isNaN(temperatura)) {
      if (temperatura >= 39) {
        risco = "vermelho";
      } else if (temperatura >= 38) {
        risco = "amarelo";
      } else if (!risco) {
        risco = "verde";
      }
    }

    if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),

      nome: req.body.nome || "",

      sintoma: req.body.sintoma || "",

      temperatura: req.body.temperatura || "",

      alergia: req.body.alergia || "",

      observacao: req.body.observacao || "",

      risco: risco,

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

      localTipo: req.body.localTipo || "",

      localNumero: req.body.localNumero || "",

      paciente: req.body.paciente || "",

      hora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }),

      createdAt: new Date().toISOString()
    };

    db.tv_chamada = chamada;

    db.tv_historico.unshift(chamada);

    // Mantém somente as últimas 5 chamadas
    if (db.tv_historico.length > 5) {
      db.tv_historico = db.tv_historico.slice(0, 5);
    }

    writeDB(db);

    res.json(chamada);

  } catch (error) {
    console.error("Erro ao chamar paciente:", error);

    res.status(500).json({
      erro: "Erro ao realizar chamada"
    });
  }
});

// =========================
// TV / CONSULTAR CHAMADA
// =========================

app.get("/tv/chamada", (req, res) => {
  try {
    const db = readDB();

    res.json({
      chamada: db.tv_chamada,
      historico: db.tv_historico
    });

  } catch (error) {
    console.error("Erro ao buscar chamada da TV:", error);

    res.status(500).json({
      erro: "Erro ao buscar chamada"
    });
  }
});

// =========================
// LISTA DE MEDICAÇÕES
// =========================

app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

// =========================
// CONSULTA MÉDICA
// =========================

app.post("/consulta", (req, res) => {
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),

      paciente: req.body.paciente || "",

      diagnostico: req.body.diagnostico || "",

      medicacao: req.body.medicacao || "",

      obs: req.body.obs || "",

      createdAt: new Date().toISOString()
    };

    db.consultas.push(consulta);

    writeDB(db);

    res.json(consulta);

  } catch (error) {
    console.error("Erro ao registrar consulta:", error);

    res.status(500).json({
      erro: "Erro ao registrar consulta"
    });
  }
});

// =========================
// LISTAR CONSULTAS / MEDICAÇÕES
// =========================

app.get("/medicacoes", (req, res) => {
  try {
    const db = readDB();

    res.json(db.consultas);

  } catch (error) {
    console.error("Erro ao listar consultas:", error);

    res.status(500).json({
      erro: "Erro ao buscar consultas"
    });
  }
});

// =========================
// ROTA PRINCIPAL
// =========================

app.get("/", (req, res) => {
  const indexPath = path.join(
    FRONTEND_DIR,
    "index.html"
  );

  res.sendFile(indexPath, (error) => {
    if (error) {
      console.error("Erro ao abrir index.html:", error);

      res.status(500).json({
        status: "erro",
        mensagem: "Frontend não encontrado"
      });
    }
  });
});

// =========================
// TRATAMENTO DE ROTAS NÃO ENCONTRADAS
// =========================

app.use((req, res, next) => {
  res.status(404).json({
    erro: "Rota não encontrada",
    rota: req.originalUrl
  });
});

// =========================
// TRATAMENTO DE ERROS
// =========================

app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);

  res.status(500).json({
    erro: "Erro interno do servidor"
  });
});

// =========================
// SERVIDOR
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🏥 Hospital Pro rodando na porta ${PORT}`);
});
