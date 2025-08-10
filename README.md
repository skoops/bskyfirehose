# Bluesky Firehose Viewer

A modern web application for viewing the Bluesky Firehose stream in real-time.

## Features

- **Live Stream**: Display all Bluesky posts in real-time
- **Controls**: Start, Stop, Pause and Resume the firehose
- **Filtering**: Boolean operators (AND, OR, NOT) for filtering events
- **Status Display**: Metadata such as events/second, kilobytes/second and current timestamp
- **Modern UI**: Responsive design with dark theme
- **Auto-Scroll**: Automatic scrolling to new events
- **Keyboard Shortcuts**: Quick access via keyboard combinations
- **Multi-language Support**: English, German, Spanish and more

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

3. **Development mode (with auto-reload):**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3000
   ```

## Usage

### Basic Controls

- **Start**: Start firehose connection
- **Pause**: Pause stream (connection remains active)
- **Resume**: Resume paused stream
- **Stop**: End firehose connection

### Filtering

Use boolean operators to filter events:

- `cat AND dog` - Shows only events that contain both "cat" and "dog"
- `cat OR dog` - Shows events that contain "cat" or "dog"
- `cat NOT dog` - Shows events that contain "cat" but not "dog"
- `cat AND dog OR bird` - Combined operators

### Keyboard Shortcuts

- `Ctrl/Cmd + Enter`: Start/Stop
- `Ctrl/Cmd + Space`: Pause/Resume
- `Ctrl/Cmd + K`: Clear log
- `Ctrl/Cmd + F`: Filter focus

### Status Display

The status bar at the bottom shows:

- **Connection Status**: Current connection status to the firehose
- **Events/Second**: Number of received events per second
- **KB/Second**: Amount of data transferred per second
- **Timestamp**: Current time

## Technical Details

### Backend (Node.js)

- **Express.js**: Web server
- **Socket.IO**: Real-time communication
- **@atproto/api**: Bluesky API client
- **ws**: WebSocket connection to firehose

### Frontend

- **Vanilla JavaScript**: No frameworks
- **Socket.IO Client**: Real-time updates
- **CSS3**: Modern styling with Flexbox and Grid
- **Responsive Design**: Works on desktop and mobile
- **Internationalization**: Multi-language support with JSON-based translations

### Bluesky Firehose

The application connects to the Bluesky Firehose via:
```
wss://bsky.social/xrpc/com.atproto.sync.subscribeRepos
```

This endpoint provides all repository updates in real-time.

## Project Structure

```
bsky-firehose-viewer/
├── server.js          # Main server with Socket.IO
├── package.json       # Dependencies
├── README.md         # This file
├── LICENSE           # MIT License
├── locales/          # Translation files
│   ├── en.json      # English translations
│   ├── de.json      # German translations
│   └── es.json      # Spanish translations
└── public/           # Frontend files
    ├── index.html    # Main HTML
    ├── styles.css    # CSS styles
    ├── script.js     # Frontend JavaScript
    └── i18n.js       # Internationalization module
```

## Development

### Local Development

1. Clone repository
2. Run `npm install`
3. Start `npm run dev`
4. Changes are automatically reloaded

### Deployment

The application can be deployed on various platforms:

- **Heroku**: `git push heroku main`
- **Vercel**: Connect with GitHub repository
- **Docker**: Create Dockerfile

## Troubleshooting

### Connection Issues

- Check your internet connection
- Make sure port 3000 is available
- Check firewall settings

### Performance Issues

- The application automatically limits to 1000 log entries
- Use filters to reduce the display
- Disable auto-scroll on slow devices

### Bluesky API Issues

- The firehose can occasionally be unstable
- The application automatically tries to restore the connection
- Check the status in the status bar

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please create a pull request or open an issue.

## Support

For problems or questions:
1. Check the troubleshooting section
2. Open an issue on GitHub
3. Contact the maintainer
