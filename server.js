const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // your MySQL password
  database: 'chat_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize DB table if not exists
// async function initDb() {
//   const conn = await pool.getConnection();
//   await conn.query(`
//     CREATE TABLE IF NOT EXISTS messages (
//       id INT AUTO_INCREMENT PRIMARY KEY,
//       username VARCHAR(255),
//       message TEXT,
//       file VARCHAR(255),
//       timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     )
//   `);
//   conn.release();
// }
// initDb().catch(console.error);

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// File upload endpoint (only save file and return URL, no DB insert)
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    res.json({ fileUrl: `/uploads/${file.filename}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected');

  // Send last 20 messages on request
  socket.on('request chat history', async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 20');
      socket.emit('chat history', rows.reverse());
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  });

  // Receive and broadcast chat messages
  socket.on('chat message', async (data) => {
    const { username, message, file } = data;

    try {
      const conn = await pool.getConnection();
      await conn.query('INSERT INTO messages (username, message, file) VALUES (?, ?, ?)', [
        username,
        message,
        file || null
      ]);
      conn.release();

      io.emit('chat message', {
        username,
        message,
        file: file || null,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
