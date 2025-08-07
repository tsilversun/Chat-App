const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// File upload setup
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // your password here
  database: 'chat_db'
});
db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL');
});

// REST endpoint for uploading images
app.post('/upload', upload.single('image'), (req, res) => {
  const fileUrl = `/uploads/${req.file.filename}`;
  res.send({ url: fileUrl });
});


// Socket.IO chat logic
io.on('connection', (socket) => {
  let currentUser = '';

  // Receive username
  socket.on('set username', (username) => {
    currentUser = username;

    // Load previous messages
    db.query('SELECT * FROM messages ORDER BY created_at ASC LIMIT 50', (err, rows) => {
      if (err) throw err;
      rows.forEach(msg => socket.emit('chat message', msg));
    });
  });

  //user count
//   let userConnected = 0;
//   io.on('connection', (socket) => {
//   usersConnected++;
//   io.emit('user count', usersConnected);

//   socket.on('disconnect', () => {
//     usersConnected--;
//     io.emit('user count', usersConnected);
//   });
// });


  // Handle new message
  socket.on('chat message', (msg) => {
    const message = {
      username: currentUser,
      type: msg.type,
      data: msg.data
    };

    db.query('INSERT INTO messages SET ?', message, (err) => {
      if (err) throw err;
      io.emit('chat message', { ...message, created_at: new Date() });
    });
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
