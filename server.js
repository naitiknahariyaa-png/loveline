require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ngrok = require('@ngrok/ngrok');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e9, // 1 GB for socket messages
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CHUNKS_DIR = path.join(__dirname, 'chunks');
const DATA_DIR = path.join(__dirname, 'data');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const JELLYFIN_CONFIG_FILE = path.join(DATA_DIR, 'jellyfin_config.json');

// Ensure directories exist
[UPLOADS_DIR, CHUNKS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// JSON Persistence Helpers
function loadJSON(filePath, defaultVal = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return raw ? JSON.parse(raw) : defaultVal;
    }
  } catch (err) {
    console.error('Error reading JSON file:', filePath, err.message);
  }
  return defaultVal;
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing JSON file:', filePath, err.message);
  }
}

// Sanitization & Security Helpers
function sanitizeString(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function sanitizeRoomCode(room) {
  if (typeof room !== 'string') return 'general';
  return room.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').slice(0, 50);
}

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    const rawBase = path.basename(file.originalname, ext);
    const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    cb(null, `${uuidv4()}_${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Jellyfin & Streambert Cinema Media Catalog (Bollywood Hindi + Web Series + Anime) ──
const MEDIA_CATALOG = [
  // ── HINDI ROMANTIC BOLLYWOOD MOVIES ──
  {
    id: "hn-1",
    title: "Dilwale Dulhania Le Jayenge (DDLJ)",
    language: "Hindi",
    category: "hindi-movie",
    year: "1995",
    genre: "Romance / Bollywood Classic",
    rating: "9.3/10",
    poster: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80",
    description: "Raj meets Simran in Europe and falls in love. When Simran is promised to another in Punjab, Raj embarks on an unforgettable journey to win her family's heart.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    tag: "All-Time Classic 🌹"
  },
  {
    id: "hn-2",
    title: "Yeh Jawaani Hai Deewani (YJHD)",
    language: "Hindi",
    category: "hindi-movie",
    year: "2013",
    genre: "Romance / Drama / Youth",
    rating: "8.9/10",
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
    description: "Kabir and Naina meet on a trekking trip and reconnect years later. A soulful film about finding love, living dreams, and the sweetness of togetherness.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    tag: "Youth & Romance 💖"
  },
  {
    id: "hn-3",
    title: "Jab We Met",
    language: "Hindi",
    category: "hindi-movie",
    year: "2007",
    genre: "Romance / Comedy / Feel-Good",
    rating: "9.0/10",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    description: "A depressed wealthy businessman's life turns 180 degrees after he meets a bubbly, outspoken girl on a train to Bhatinda.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    tag: "Feel-Good Love ✨"
  },
  {
    id: "hn-4",
    title: "Aashiqui 2",
    language: "Hindi",
    category: "hindi-movie",
    year: "2013",
    genre: "Romance / Musical / Soulful",
    rating: "8.8/10",
    poster: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80",
    description: "Rahul, a singing sensation, falls deeply for Aarohi, a bar singer. He vows to make her a shining star, leading to an emotional musical journey.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    tag: "Emotional Musical 🎶"
  },
  {
    id: "hn-5",
    title: "Rocky Aur Rani Kii Prem Kahaani",
    language: "Hindi",
    category: "hindi-movie",
    year: "2023",
    genre: "Romance / Family / Bollywood Drama",
    rating: "8.6/10",
    poster: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=600&auto=format&fit=crop&q=80",
    description: "Rocky and Rani from completely different cultural backgrounds swap families for three months before marriage in a grand Bollywood spectacle.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    tag: "Recent Hit 🌟"
  },
  {
    id: "hn-6",
    title: "Veer-Zaara",
    language: "Hindi",
    category: "hindi-movie",
    year: "2004",
    genre: "Romance / Cross-Border Epic",
    rating: "9.2/10",
    poster: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    description: "Squadron Leader Veer Pratap Singh and a Pakistani girl Zaara Haayat Khan share an epic love story that endures 22 years of silence and sacrifice.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    tag: "Soulful Masterpiece 🕊️"
  },

  // ── POPULAR HINDI ROMANTIC WEB SERIES ──
  {
    id: "ws-1",
    title: "Little Things",
    language: "Hindi / English",
    category: "web-series",
    year: "2016-2021",
    genre: "Romance / Slice of Life / Couple Goals",
    rating: "9.1/10",
    poster: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&auto=format&fit=crop&q=80",
    description: "Dhruv and Kavya navigate conversations, everyday hurdles, and comfort in their warm live-in relationship in Mumbai.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    tag: "Cozy Couple Goals 🧸"
  },
  {
    id: "ws-2",
    title: "Mismatched",
    language: "Hindi",
    category: "web-series",
    year: "2020-2024",
    genre: "Romance / Campus / Drama",
    rating: "8.7/10",
    poster: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80",
    description: "After a charming meet-cute, two teenagers build an app while navigating summer coding school, heartbreaks, and sweet romantic chemistry.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    tag: "Campus Love 💻"
  },
  {
    id: "ws-3",
    title: "Flames",
    language: "Hindi",
    category: "web-series",
    year: "2018-2023",
    genre: "Teen Romance / Nostalgia / Sweet",
    rating: "8.9/10",
    poster: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    description: "The heartwarming innocence of first teenage love set in a Delhi tuition center, capturing butterflies, sweet notes, and first dates.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    tag: "First Love Memories 💌"
  },
  {
    id: "ws-4",
    title: "Permanent Roommates",
    language: "Hindi",
    category: "web-series",
    year: "2014-2023",
    genre: "Rom-Com / Live-In Couple",
    rating: "8.8/10",
    poster: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop&q=80",
    description: "After a 3-year long-distance relationship, Mikesh and Tanya reunite and face the comical realities of moving in together and prospective marriage.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    tag: "Long-Distance Love ✈️"
  },

  // ── INTERNATIONAL STREAMBERT / JELLYFIN HITS ──
  {
    id: "in-1",
    title: "La La Land",
    language: "English",
    category: "hollywood",
    year: "2016",
    genre: "Romance / Musical / Drama",
    rating: "8.8/10",
    poster: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80",
    description: "A jazz musician and an aspiring actress fall in love while pursuing their dreams in vibrant Los Angeles.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    tag: "Romantic Classic 🎹"
  },
  {
    id: "in-2",
    title: "Your Name (Kimi no Na wa)",
    language: "Japanese / Hindi Dub",
    category: "anime",
    year: "2016",
    genre: "Romance / Fantasy / Anime",
    rating: "9.2/10",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    description: "Two high schoolers form a profound, magical bond when they discover they are swapping bodies across space and time.",
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    tag: "Magical Anime 🌠"
  }
];

// ── Search & Filter API ───────────────────────────────────────────────────────
app.get('/api/media/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  const category = (req.query.category || 'all').toLowerCase().trim();
  const language = (req.query.language || 'all').toLowerCase().trim();

  let results = MEDIA_CATALOG;

  if (category && category !== 'all') {
    results = results.filter(m => m.category.toLowerCase() === category);
  }

  if (language && language !== 'all') {
    results = results.filter(m => m.language.toLowerCase().includes(language));
  }

  if (query) {
    results = results.filter(m =>
      m.title.toLowerCase().includes(query) ||
      m.genre.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.language.toLowerCase().includes(query)
    );
  }

  res.json(results);
});

// ── Jellyfin Integration Endpoints ───────────────────────────────────────────
// Connect local or remote Jellyfin media server instance
app.get('/api/jellyfin/status', (req, res) => {
  const envServerUrl = process.env.JELLYFIN_SERVER_URL || '';
  const envApiKey = process.env.JELLYFIN_API_KEY || '';
  const config = loadJSON(JELLYFIN_CONFIG_FILE, {
    enabled: !!envServerUrl,
    serverUrl: envServerUrl,
    apiKey: envApiKey,
    connected: !!envServerUrl
  });
  res.json(config);
});

app.post('/api/jellyfin/connect', (req, res) => {
  const { serverUrl, apiKey } = req.body;
  if (!serverUrl) return res.status(400).json({ error: 'Server URL is required' });

  const config = {
    enabled: true,
    serverUrl: sanitizeString(serverUrl, 150).replace(/\/$/, ''),
    apiKey: sanitizeString(apiKey, 100),
    connected: true,
    lastTested: new Date().toISOString()
  };

  saveJSON(JELLYFIN_CONFIG_FILE, config);
  res.json({ success: true, message: 'Jellyfin server configured successfully!', config });
});

// Proxy Jellyfin items (movies, series) into the watch party
app.get('/api/jellyfin/items', async (req, res) => {
  const config = loadJSON(JELLYFIN_CONFIG_FILE, {
    serverUrl: process.env.JELLYFIN_SERVER_URL || '',
    apiKey: process.env.JELLYFIN_API_KEY || ''
  });

  if (!config.serverUrl) {
    return res.json([]);
  }

  try {
    const fetchUrl = `${config.serverUrl}/Items?IncludeItemTypes=Movie,Series&Recursive=true&api_key=${config.apiKey}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Jellyfin responded with ${response.status}`);
    const data = await response.json();
    const items = (data.Items || []).map(item => ({
      id: `jf-${item.Id}`,
      title: item.Name,
      language: "Jellyfin Library",
      category: item.Type === 'Series' ? 'web-series' : 'hindi-movie',
      year: item.ProductionYear ? String(item.ProductionYear) : "Recent",
      genre: (item.Genres || []).join(' / ') || "Media",
      rating: item.CommunityRating ? `${item.CommunityRating.toFixed(1)}/10` : "9.0/10",
      poster: `${config.serverUrl}/Items/${item.Id}/Images/Primary?maxHeight=400`,
      description: item.Overview || "Available in your private Jellyfin Library.",
      streamUrl: `${config.serverUrl}/Videos/${item.Id}/stream?static=true&api_key=${config.apiKey}`,
      tag: "Jellyfin Server 🍇"
    }));
    res.json(items);
  } catch (err) {
    console.error('Jellyfin items fetch error:', err.message);
    res.json([]);
  }
});

// Add custom movie / stream via API
app.post('/api/media/add', (req, res) => {
  const { title, streamUrl, poster, genre, language, year, category, tag } = req.body;
  if (!title || !streamUrl) {
    return res.status(400).json({ error: 'Title and streamUrl are required' });
  }

  const newEntry = {
    id: `custom-${Date.now()}`,
    title: sanitizeString(title, 120),
    language: sanitizeString(language, 50) || 'Hindi',
    category: sanitizeString(category, 50) || 'hindi-movie',
    year: sanitizeString(year, 10) || new Date().getFullYear().toString(),
    genre: sanitizeString(genre, 100) || 'Romance',
    rating: '9.0/10',
    poster: poster || 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80',
    description: req.body.description ? sanitizeString(req.body.description, 500) : 'Added to watch party library.',
    streamUrl: streamUrl.trim(),
    tag: sanitizeString(tag, 30) || 'Custom API 🍿'
  };

  MEDIA_CATALOG.unshift(newEntry);
  res.json({ success: true, movie: newEntry });
});

// ── Chunked Upload Endpoints (Up to 5 GB Movies) ──────────────────────────────
app.post('/upload/chunk', express.raw({ limit: '10mb', type: '*/*' }), (req, res) => {
  const { uploadid, chunkindex, totalchunks, filename } = req.headers;
  const uid = sanitizeString(uploadid || req.headers.uploadId, 80);
  const cIdx = parseInt(chunkindex !== undefined ? chunkindex : req.headers.chunkIndex, 10);
  const tChunks = parseInt(totalchunks || req.headers.totalChunks, 10);
  const fName = sanitizeString(filename || req.headers.filename, 100);

  if (!uid || isNaN(cIdx) || isNaN(tChunks) || !fName) {
    return res.status(400).json({ error: 'Missing or invalid chunk metadata headers' });
  }

  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const chunkDir = path.join(CHUNKS_DIR, safeUid);
  if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

  const chunkPath = path.join(chunkDir, `chunk_${cIdx}`);
  fs.writeFileSync(chunkPath, req.body);

  res.json({ received: cIdx + 1, total: tChunks });
});

app.post('/upload/assemble', (req, res) => {
  const { uploadId, filename, totalChunks, room, sender, isMediaForWatchParty } = req.body;
  if (!uploadId || !filename || !totalChunks) {
    return res.status(400).json({ error: 'Missing assemble parameters' });
  }

  const safeUid = sanitizeString(uploadId, 80).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeRoom = sanitizeRoomCode(room);
  const safeSender = sanitizeString(sender, 40) || 'Partner';
  const chunkDir = path.join(CHUNKS_DIR, safeUid);
  const ext = path.extname(filename).slice(0, 10);
  const rawBase = path.basename(filename, ext);
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  const finalName = `${safeUid}_${safeBase}${ext}`;
  const finalPath = path.join(UPLOADS_DIR, finalName);

  try {
    const total = parseInt(totalChunks, 10);
    const writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) {
        return res.status(400).json({ error: `Missing chunk ${i}` });
      }
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
    }
    writeStream.end(() => {
      fs.rmSync(chunkDir, { recursive: true, force: true });

      const fileUrl = `/uploads/${finalName}`;
      const stats = fs.statSync(finalPath);
      const mime = getMimeType(ext);

      const msg = {
        id: uuidv4(),
        type: 'file',
        sender: safeSender,
        filename: sanitizeString(filename, 100),
        url: fileUrl,
        size: stats.size,
        mime,
        timestamp: new Date().toISOString(),
      };

      if (safeRoom) {
        saveRoomMessage(safeRoom, msg);
        io.to(safeRoom).emit('file-message', msg);

        if (isMediaForWatchParty) {
          const roomState = getRoomSyncState(safeRoom);
          roomState.mediaUrl = fileUrl;
          roomState.mediaType = mime.startsWith('video/') ? 'video' : 'audio';
          roomState.mediaTitle = filename;
          roomState.currentTime = 0;
          roomState.playing = true;
          io.to(safeRoom).emit('sync-load-media', {
            url: fileUrl,
            type: roomState.mediaType,
            title: filename,
            sender: safeSender
          });
        }
      }

      res.json({ url: fileUrl, filename, size: stats.size, mime });
    });
  } catch (err) {
    console.error('Assemble error:', err);
    res.status(500).json({ error: 'Failed to assemble file' });
  }
});

// Simple Upload
app.post('/upload/simple', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileUrl = `/uploads/${req.file.filename}`;
  const safeRoom = sanitizeRoomCode(req.body.room);
  const safeSender = sanitizeString(req.body.sender, 40) || 'Partner';
  const isVoiceNote = req.body.isVoiceNote === 'true' || req.body.isVoiceNote === true;

  const msg = {
    id: uuidv4(),
    type: isVoiceNote ? 'voice-note' : 'file',
    sender: safeSender,
    filename: sanitizeString(req.file.originalname, 100),
    url: fileUrl,
    size: req.file.size,
    mime: req.file.mimetype || getMimeType(path.extname(req.file.originalname)),
    duration: req.body.duration ? parseFloat(req.body.duration) : null,
    timestamp: new Date().toISOString(),
  };

  if (safeRoom) {
    saveRoomMessage(safeRoom, msg);
    io.to(safeRoom).emit(msg.type === 'voice-note' ? 'voice-note-message' : 'file-message', msg);
  }

  res.json({ url: fileUrl, filename: req.file.originalname, size: req.file.size, id: msg.id });
});

// ── Persistent Messages & Memory Storage ──────────────────────────────────────
function saveRoomMessage(room, msg) {
  const safeRoom = sanitizeRoomCode(room);
  const allMessages = loadJSON(MESSAGES_FILE, {});
  if (!allMessages[safeRoom]) allMessages[safeRoom] = [];
  allMessages[safeRoom].push(msg);
  if (allMessages[safeRoom].length > 1000) {
    allMessages[safeRoom] = allMessages[safeRoom].slice(-1000);
  }
  saveJSON(MESSAGES_FILE, allMessages);
}

app.get('/api/history/:room', (req, res) => {
  const safeRoom = sanitizeRoomCode(req.params.room);
  const allMessages = loadJSON(MESSAGES_FILE, {});
  res.json(allMessages[safeRoom] || []);
});

// Memories API
app.get('/api/memories/:room', (req, res) => {
  const safeRoom = sanitizeRoomCode(req.params.room);
  const allMemories = loadJSON(MEMORIES_FILE, {});
  res.json(allMemories[safeRoom] || []);
});

app.post('/api/memories/:room', (req, res) => {
  const safeRoom = sanitizeRoomCode(req.params.room);
  const { title, note, date, tag, fileUrl, fileType, author } = req.body;
  const allMemories = loadJSON(MEMORIES_FILE, {});
  if (!allMemories[safeRoom]) allMemories[safeRoom] = [];

  const newMemory = {
    id: uuidv4(),
    title: sanitizeString(title, 120) || 'Sweet Moment',
    note: sanitizeString(note, 2000) || '',
    date: date || new Date().toISOString(),
    tag: sanitizeString(tag, 30) || 'memory',
    fileUrl: fileUrl || null,
    fileType: fileType || null,
    author: sanitizeString(author, 40) || 'Us',
    createdAt: new Date().toISOString()
  };

  allMemories[safeRoom].unshift(newMemory);
  saveJSON(MEMORIES_FILE, allMemories);

  io.to(safeRoom).emit('new-memory', newMemory);
  res.json(newMemory);
});

app.delete('/api/memories/:room/:id', (req, res) => {
  const safeRoom = sanitizeRoomCode(req.params.room);
  const { id } = req.params;
  const allMemories = loadJSON(MEMORIES_FILE, {});
  if (allMemories[safeRoom]) {
    allMemories[safeRoom] = allMemories[safeRoom].filter(m => m.id !== id);
    saveJSON(MEMORIES_FILE, allMemories);
    io.to(safeRoom).emit('memory-deleted', { id });
  }
  res.json({ success: true });
});

// ── Sockets: Synchronized Watch Party & Stop Alert Engine ─────────────────────
const rooms = new Map();
const syncStates = new Map();
const gameStates = new Map();

function getRoomSyncState(room) {
  const safeRoom = sanitizeRoomCode(room);
  if (!syncStates.has(safeRoom)) {
    syncStates.set(safeRoom, {
      mediaUrl: null,
      mediaType: 'video',
      mediaTitle: '',
      playing: false,
      currentTime: 0,
      lastStoppedBy: null,
      lastUpdated: Date.now()
    });
  }
  return syncStates.get(safeRoom);
}

// Couple Quiz Questions Bank
const COUPLE_QUIZ_QUESTIONS = [
  { q: "Who fell in love first?", options: ["Me! 🥰", "My Partner! 💕", "Both at the exact same moment! ✨", "It's still a mystery 🕵️"] },
  { q: "What's our dream romantic vacation?", options: ["Beach resort with sunset dinners 🏖️", "Cozy cabin in snowy mountains ❄️", "Paris / Venice historical city walk 🗼", "Backpacking adventure in nature 🎒"] },
  { q: "Who is more dramatic when they get sick?", options: ["Definitely me 🥺", "My partner 100% 🤧", "Neither, we are tough 💪", "Both of us! 🎭"] },
  { q: "What is the best way to resolve an argument between us?", options: ["A tight warm hug 🤗", "Ordering our favorite comfort food 🍕", "Talking it out calmly 💬", "Funny memes and laughing it off 😂"] },
  { q: "Who takes longer to get ready to go out?", options: ["Me, gotta look gorgeous ✨", "My partner takes forever ⏳", "Both take equal time 👯", "We both get ready in 5 mins ⚡"] },
  { q: "What is our favorite couple activity?", options: ["Binge-watching movies together 🎬", "Long late-night calls / chats 🌙", "Cooking / Eating food together 🍜", "Playing games & teasing each other 🎮"] },
  { q: "If we had a free Sunday, what would we do?", options: ["Cuddle in bed all day long 🛌", "Go exploring a new cafe/city ☕", "Cook something special together 🍳", "Movie marathon with popcorn 🍿"] },
  { q: "Who gives the best romantic surprises?", options: ["Me! I plan everything 🎁", "My partner is the romantic king/queen 👑", "We both surprise each other equally 💖", "We are still planning our first big surprise! 🚀"] }
];

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  socket.on('join-room', ({ room, username, avatar }) => {
    const safeRoom = sanitizeRoomCode(room);
    const safeName = sanitizeString(username, 40) || `Partner_${socket.id.slice(0, 4)}`;
    const safeAvatar = sanitizeString(avatar, 10) || '💖';

    socket.join(safeRoom);
    socket.data.room = safeRoom;
    socket.data.username = safeName;
    socket.data.avatar = safeAvatar;

    if (!rooms.has(safeRoom)) rooms.set(safeRoom, new Set());
    const memberSet = rooms.get(safeRoom);
    for (const m of memberSet) {
      if (m.username === safeName) memberSet.delete(m);
    }

    const memberObj = { id: socket.id, username: safeName, avatar: safeAvatar };
    memberSet.add(memberObj);

    io.to(safeRoom).emit('room-update', { members: [...memberSet], count: memberSet.size });

    // Send existing media sync state
    const syncState = getRoomSyncState(safeRoom);
    socket.emit('sync-state-init', syncState);

    const sysMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${safeName} entered the room 💕`,
      timestamp: new Date().toISOString()
    };
    saveRoomMessage(safeRoom, sysMsg);
    socket.to(safeRoom).emit('system-message', sysMsg);
  });

  socket.on('chat-message', ({ room, text, mood }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const cleanText = sanitizeString(text, 2000);
    if (!cleanText) return;

    const msg = {
      id: uuidv4(),
      type: 'text',
      sender: socket.data.username || 'Partner',
      avatar: socket.data.avatar || '💖',
      text: cleanText,
      mood: sanitizeString(mood, 30) || null,
      timestamp: new Date().toISOString(),
    };
    saveRoomMessage(safeRoom, msg);
    io.to(safeRoom).emit('chat-message', msg);
  });

  // Virtual love actions
  socket.on('send-love-action', ({ room, actionType, customText }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const safeAction = sanitizeString(actionType, 30);
    const actionObj = {
      sender: socket.data.username,
      avatar: socket.data.avatar,
      actionType: safeAction,
      customText: sanitizeString(customText, 100) || '',
      timestamp: new Date().toISOString()
    };

    const actionDescriptions = {
      'kiss': 'sent a sweet romantic kiss! 💋',
      'hug': 'sent a tight warm hug! 🤗',
      'miss': 'said: I miss you so much! 🥺',
      'heart': 'sent exploding love hearts! 💖',
      'love': 'said: I love you forever! 💍'
    };

    const sysMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${socket.data.username} ${actionDescriptions[safeAction] || 'sent love! 💖'}`,
      timestamp: new Date().toISOString()
    };
    saveRoomMessage(safeRoom, sysMsg);

    io.to(safeRoom).emit('love-action-received', actionObj);
  });

  // Watch Party Controls
  socket.on('sync-set-media', ({ room, url, type, title }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const syncState = getRoomSyncState(safeRoom);
    syncState.mediaUrl = url;
    syncState.mediaType = type || 'video';
    syncState.mediaTitle = sanitizeString(title, 120) || 'Shared Movie';
    syncState.currentTime = 0;
    syncState.playing = true;
    syncState.lastStoppedBy = null;
    syncState.lastUpdated = Date.now();

    const loadNotice = {
      id: uuidv4(),
      type: 'system',
      text: `🎬 ${socket.data.username} started playing "${syncState.mediaTitle}"`,
      timestamp: new Date().toISOString()
    };
    saveRoomMessage(safeRoom, loadNotice);
    io.to(safeRoom).emit('system-message', loadNotice);

    io.to(safeRoom).emit('sync-load-media', {
      url,
      type: syncState.mediaType,
      title: syncState.mediaTitle,
      sender: socket.data.username
    });
  });

  socket.on('sync-play', ({ room, currentTime }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const syncState = getRoomSyncState(safeRoom);
    syncState.playing = true;
    syncState.currentTime = currentTime;
    syncState.lastStoppedBy = null;
    syncState.lastUpdated = Date.now();

    socket.to(safeRoom).emit('sync-play', {
      currentTime,
      sender: socket.data.username
    });

    socket.to(safeRoom).emit('movie-resumed-notification', {
      sender: socket.data.username,
      currentTime
    });
  });

  // User pauses/stops movie -> alert second person
  socket.on('sync-pause', ({ room, currentTime }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const syncState = getRoomSyncState(safeRoom);
    syncState.playing = false;
    syncState.currentTime = currentTime;
    syncState.lastStoppedBy = socket.data.username;
    syncState.lastUpdated = Date.now();

    socket.to(safeRoom).emit('sync-pause', {
      currentTime,
      sender: socket.data.username
    });

    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
    const timeStr = `${minutes}:${seconds}`;

    const alertMsg = {
      id: uuidv4(),
      type: 'system',
      text: `⏸️ ${socket.data.username} stopped the movie at ${timeStr}`,
      timestamp: new Date().toISOString()
    };
    saveRoomMessage(safeRoom, alertMsg);
    io.to(safeRoom).emit('system-message', alertMsg);

    socket.to(safeRoom).emit('movie-stopped-notification', {
      sender: socket.data.username,
      timeStr,
      currentTime
    });
  });

  socket.on('sync-seek', ({ room, currentTime }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const syncState = getRoomSyncState(safeRoom);
    syncState.currentTime = currentTime;
    syncState.lastUpdated = Date.now();

    socket.to(safeRoom).emit('sync-seek', {
      currentTime,
      sender: socket.data.username
    });
  });

  // Couple Quiz
  socket.on('quiz-start', ({ room }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const shuffled = [...COUPLE_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random());
    gameStates.set(safeRoom, {
      type: 'quiz',
      questions: shuffled,
      currentIdx: 0,
      answers: {},
      scores: {}
    });

    io.to(safeRoom).emit('quiz-question', {
      questionIdx: 0,
      total: 5,
      question: shuffled[0].q,
      options: shuffled[0].options
    });
  });

  socket.on('quiz-answer', ({ room, questionIdx, optionIdx }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const state = gameStates.get(safeRoom);
    if (!state || state.type !== 'quiz') return;

    if (!state.answers[questionIdx]) state.answers[questionIdx] = {};
    state.answers[questionIdx][socket.data.username] = optionIdx;

    const currentAnswers = state.answers[questionIdx];
    const roomMembers = rooms.get(safeRoom) ? [...rooms.get(safeRoom)] : [];

    io.to(safeRoom).emit('quiz-partner-answered', {
      username: socket.data.username,
      questionIdx
    });

    const answerKeys = Object.keys(currentAnswers);
    if (answerKeys.length >= 2 || (roomMembers.length === 1 && answerKeys.length === 1)) {
      const q = state.questions[questionIdx];
      let isMatch = false;
      if (answerKeys.length >= 2) {
        isMatch = (currentAnswers[answerKeys[0]] === currentAnswers[answerKeys[1]]);
      }

      io.to(safeRoom).emit('quiz-round-result', {
        questionIdx,
        answers: currentAnswers,
        isMatch,
        options: q.options
      });

      setTimeout(() => {
        const nextIdx = questionIdx + 1;
        if (nextIdx < 5 && nextIdx < state.questions.length) {
          state.currentIdx = nextIdx;
          io.to(safeRoom).emit('quiz-question', {
            questionIdx: nextIdx,
            total: 5,
            question: state.questions[nextIdx].q,
            options: state.questions[nextIdx].options
          });
        } else {
          io.to(safeRoom).emit('quiz-game-over', {
            message: "Quiz Complete! You two share an adorable bond 💕"
          });
        }
      }, 3500);
    }
  });

  // Tic-Tac-Toe
  socket.on('ttt-start', ({ room }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const tttState = {
      type: 'ttt',
      board: Array(9).fill(null),
      turn: '❤️',
      winner: null
    };
    gameStates.set(safeRoom, tttState);
    io.to(safeRoom).emit('ttt-update', tttState);
  });

  socket.on('ttt-move', ({ room, index }) => {
    const safeRoom = sanitizeRoomCode(room || socket.data.room);
    const state = gameStates.get(safeRoom);
    if (!state || state.type !== 'ttt' || state.winner) return;
    if (state.board[index] !== null) return;

    state.board[index] = state.turn;

    const winningCombos = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];

    let winner = null;
    for (const [a, b, c] of winningCombos) {
      if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
        winner = state.board[a];
        break;
      }
    }

    if (!winner && state.board.every(cell => cell !== null)) {
      winner = 'Tie';
    }

    state.winner = winner;
    state.turn = state.turn === '❤️' ? '⚡' : '❤️';

    io.to(safeRoom).emit('ttt-update', {
      board: state.board,
      turn: state.turn,
      winner: state.winner,
      lastMove: { index, by: socket.data.username }
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (room && rooms.has(room)) {
      const memberSet = rooms.get(room);
      for (const m of memberSet) {
        if (m.id === socket.id) { memberSet.delete(m); break; }
      }
      if (memberSet.size === 0) {
        rooms.delete(room);
      } else {
        const list = [...memberSet];
        io.to(room).emit('room-update', { members: list, count: list.length });
        const leaveMsg = {
          id: uuidv4(),
          type: 'system',
          text: `${socket.data.username} left the room`,
          timestamp: new Date().toISOString()
        };
        saveRoomMessage(room, leaveMsg);
        io.to(room).emit('system-message', leaveMsg);
      }
    }
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

// Helpers
function getMimeType(ext) {
  const map = {
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4', '.aac': 'audio/aac',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp',
    '.pdf': 'application/pdf', '.zip': 'application/zip',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

// Start Server & ngrok tunnel
server.listen(PORT, async () => {
  console.log(`\n💖 LoveLink v3 (Jellyfin + Hindi Bollywood Cinema Edition) running at http://localhost:${PORT}`);

  const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN || '3EoWxLlty2Shl3hakxlC1DffmNT_5VVysWYR58d9Wsj5djLF1';
  if (NGROK_AUTHTOKEN) {
    try {
      const listener = await ngrok.forward({
        addr: PORT,
        authtoken: NGROK_AUTHTOKEN,
      });
      console.log(`\n======================================================`);
      console.log(`🌍 PUBLIC INTERNET URL (SHARE WITH ANYONE WORLDWIDE):`);
      console.log(`👉  ${listener.url()}`);
      console.log(`======================================================\n`);
    } catch (err) {
      console.error('❌ ngrok notice:', err.message || err);
    }
  }
});
