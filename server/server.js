const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Conectar ao banco de dados SQLite
const db = new sqlite3.Database('./mamadas.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        createTables();
    }
});

// Criar tabelas se não existirem
function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        userType TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS babies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        birthDate TEXT,
        motherName TEXT,
        userId INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS feedings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        babyId INTEGER,
        startTime TEXT,
        endTime TEXT,
        formulaAmount INTEGER,
        date TEXT,
        FOREIGN KEY (babyId) REFERENCES babies(id)
    )`);
}

// Rotas da API
app.post('/signup', (req, res) => {
    const { name, email, password, userType, babyName, birthDate, motherName } = req.body;

    db.run('INSERT INTO users (name, email, password, userType) VALUES (?, ?, ?, ?)',
        [name, email, password, userType],
        function(err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            const userId = this.lastID;
            db.run('INSERT INTO babies (name, birthDate, motherName, userId) VALUES (?, ?, ?, ?)',
                [babyName, birthDate, motherName, userId],
                (err) => {
                    if (err) {
                        return res.status(400).json({ error: err.message });
                    }
                    res.json({ message: 'Usuário e bebê cadastrados com sucesso', userId });
                }
            );
        }
    );
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!user) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        }
        res.json({ message: 'Login bem-sucedido', user });
    });
});

// Adicione mais rotas conforme necessário para outras operações (CRUD de bebês, mamadas, etc.)

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
