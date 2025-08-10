const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { BskyAgent } = require('@atproto/api');
const WebSocket = require('ws');
const https = require('https');
const cbor = require('cbor');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));
app.use('/locales', express.static('locales'));

// API endpoint to get available locales
app.get('/api/locales', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const localesDir = path.join(__dirname, 'locales');
    const files = fs.readdirSync(localesDir);
    const locales = files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    res.json(locales);
  } catch (error) {
    console.error('Error reading locales:', error);
    res.json(['en']); // Fallback to English only
  }
});

// Bluesky Firehose connection
let firehoseConnection = null;
let isConnected = false;
let isPaused = false;
let stats = {
  eventsPerSecond: 0,
  bytesPerSecond: 0,
  totalEvents: 0,
  totalBytes: 0,
  startTime: null
};

// Event tracking for stats
let eventCount = 0;
let byteCount = 0;
let lastStatsUpdate = Date.now();

async function connectToFirehose() {
  if (firehoseConnection) {
    firehoseConnection.close();
  }

  try {
    console.log('Attempting to connect to Bluesky Firehose...');
    
    // Try JetStream first (JSON events) as mentioned in the documentation
    const jetstreamUrl = 'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';
    const firehoseUrl = 'wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos';
    
    // Try JetStream first, then fallback to main firehose
    let currentUrl = jetstreamUrl;
    let isJetStream = true;
    
    function tryConnect(url, isJetStreamMode) {
      console.log(`Attempting to connect to: ${url}`);
      
      firehoseConnection = new WebSocket(url, {
        headers: {
          'User-Agent': 'bsky-firehose-viewer/1.0.0'
        }
      });
      
      firehoseConnection.on('open', () => {
        console.log(`Connected to ${isJetStreamMode ? 'JetStream' : 'Bluesky Firehose'}`);
        isConnected = true;
        stats.startTime = Date.now();
        io.emit('status', { connected: true, message: `Connected to ${isJetStreamMode ? 'JetStream' : 'Bluesky Firehose'}` });
      });

      firehoseConnection.on('message', async (data) => {
        if (isPaused) return;
        
        try {
          let event;
          if (isJetStreamMode) {
            // JetStream sends JSON data
            try {
              event = JSON.parse(data.toString());
            } catch (jsonError) {
              event = {
                type: 'jetstream_event',
                data: data.toString(),
                raw: data.toString()
              };
            }
          } else {
            // Main firehose sends CBOR-encoded data
            try {
              const decoded = await cbor.decodeFirst(data);
              event = {
                type: 'firehose_event',
                data: decoded,
                raw: data.toString('base64')
              };
            } catch (cborError) {
              try {
                event = JSON.parse(data.toString());
              } catch (jsonError) {
                event = {
                  type: 'firehose_event',
                  data: data.toString('hex').substring(0, 100) + '...',
                  raw: data.toString('base64')
                };
              }
            }
          }
          
          eventCount++;
          byteCount += data.length;
          
          // Emit event to connected clients
          io.emit('firehose-event', {
            timestamp: new Date().toISOString(),
            event: event,
            raw: data.toString()
          });
        } catch (error) {
          console.error('Error parsing event:', error);
        }
      });

      firehoseConnection.on('close', () => {
        console.log(`Disconnected from ${isJetStreamMode ? 'JetStream' : 'Bluesky Firehose'}`);
        isConnected = false;
        io.emit('status', { connected: false, message: `Disconnected from ${isJetStreamMode ? 'JetStream' : 'Bluesky Firehose'}` });
      });

      firehoseConnection.on('error', (error) => {
        console.error(`${isJetStreamMode ? 'JetStream' : 'Firehose'} connection error:`, error);
        isConnected = false;
        io.emit('status', { connected: false, message: 'Connection error' });
        
        // Try fallback if JetStream fails
        if (isJetStreamMode) {
          console.log('Trying fallback to main firehose...');
          setTimeout(() => tryConnect(firehoseUrl, false), 1000);
        }
      });
    }
    
    // Start with JetStream
    tryConnect(currentUrl, isJetStream);
    
  } catch (error) {
    console.error('Failed to connect to Bluesky Firehose:', error);
    isConnected = false;
    io.emit('status', { connected: false, message: 'Failed to connect to Bluesky Firehose' });
  }
}

// Update stats every second
setInterval(() => {
  const now = Date.now();
  const timeDiff = (now - lastStatsUpdate) / 1000;
  
  stats.eventsPerSecond = Math.round(eventCount / timeDiff);
  stats.bytesPerSecond = Math.round(byteCount / timeDiff);
  stats.totalEvents += eventCount;
  stats.totalBytes += byteCount;
  
  eventCount = 0;
  byteCount = 0;
  lastStatsUpdate = now;
  
  io.emit('stats', stats);
}, 1000);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send current status
  socket.emit('status', { 
    connected: isConnected, 
    paused: isPaused,
    message: isConnected ? 'Connected' : 'Disconnected'
  });
  
  socket.emit('stats', stats);

  socket.on('start', async () => {
    if (!isConnected) {
      await connectToFirehose();
    }
    isPaused = false;
    io.emit('status', { connected: isConnected, paused: false, message: 'Started' });
  });

  socket.on('stop', () => {
    if (firehoseConnection) {
      firehoseConnection.close();
    }
    isConnected = false;
    isPaused = false;
    io.emit('status', { connected: false, paused: false, message: 'Stopped' });
  });

  socket.on('pause', () => {
    isPaused = true;
    io.emit('status', { connected: isConnected, paused: true, message: 'Paused' });
  });

  socket.on('resume', () => {
    isPaused = false;
    io.emit('status', { connected: isConnected, paused: false, message: 'Resumed' });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
