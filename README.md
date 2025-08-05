# Work Boots

A lightweight message proxy for web workers and worker threads that provides a unified API for background processing across different JavaScript environments.

## Features

- **Cross-Platform Support**: Works in both browser (Web Workers) and Node.js (Worker Threads) environments
- **Browserify Integration**: Full compatibility with Browserify for universal module support
- **Automatic Fallback**: Gracefully falls back to local execution when workers aren't supported
- **Unified API**: Same interface regardless of the underlying worker implementation
- **Message Queuing**: Handles messages sent before the worker is ready
- **Error Recovery**: Robust error handling and recovery mechanisms
- **Performance Optimized**: Efficient message passing and memory management

## Installation

```bash
npm install workboots
```

## Quick Start

### Browser Environment (with Browserify)

```javascript
// Using Browserify bundle
const { WorkBoots } = require('workboots/dist/work-boots.browser.js');

const workBoots = new WorkBoots({
  socksFile: './worker-universal.js'
});

workBoots.onMessage(({ data }) => {
  console.log('Received:', data);
});

await workBoots.ready();
workBoots.postMessage({ message: 'Hello from browser!' });
```

### Node.js Environment

```javascript
// Using ES modules
import { WorkBoots } from 'workboots';

const workBoots = new WorkBoots({
  socksFile: './worker-universal.js'
});

workBoots.onMessage(({ data }) => {
  console.log('Received:', data);
});

await workBoots.ready();
workBoots.postMessage({ message: 'Hello from Node.js!' });
```

### Universal Worker File

```javascript
// worker-universal.js - Works in both browser and Node.js
import { Socks } from 'workboots';

const socks = new Socks(typeof self !== 'undefined' ? self : undefined);

socks.onMessage(({ data }) => {
  console.log('Worker received:', data);
  
  const result = {
    processed: true,
    original: data,
    timestamp: Date.now(),
    worker: typeof window !== 'undefined' ? 'browser' : 'node'
  };
  
  socks.postMessage(result);
});

socks.ready();
export { socks };
```

## Browserify Integration

### Why Browserify?

Browserify provides **full cross-platform compatibility** by:

1. **Unified Module System**: Handles `require()` vs `import` differences
2. **Path Resolution**: Consistent file paths across environments
3. **Dependency Management**: Bundles all dependencies into a single file
4. **Testing Compatibility**: Resolves Jest and testing environment issues

### Build Process

```bash
# Build browser bundle
npm run build:browser

# Build Node.js version
npm run build:node

# Build worker bundle
npm run build:worker

# Build all versions
npm run build
```

### Usage with Browserify

#### Browser Bundle
```html
<!DOCTYPE html>
<html>
<head>
    <title>Work Boots Browserify Example</title>
</head>
<body>
    <script src="dist/work-boots.browser.js"></script>
    <script>
        const { WorkBoots } = window.WorkBoots;
        
        const workBoots = new WorkBoots({
            socksFile: './worker-universal.js'
        });

        workBoots.onMessage(({ data }) => {
            console.log('Browser received:', data);
        });

        workBoots.ready().then(() => {
            workBoots.postMessage({ browser: true });
        });
    </script>
</body>
</html>
```

#### Node.js with Browserify
```javascript
const { WorkBoots } = require('workboots/dist/work-boots.browser.js');

const workBoots = new WorkBoots({
    socksFile: './worker-universal.js'
});

workBoots.onMessage(({ data }) => {
    console.log('Node.js received:', data);
});

workBoots.ready().then(() => {
    workBoots.postMessage({ node: true });
});
```

## API Reference

### WorkBoots

The main class for creating worker proxies.

#### Constructor

```javascript
new WorkBoots({ socksFile, instantiateWorker })
```

- `socksFile` (string, required): Path to the worker file
- `instantiateWorker` (function, optional): Custom worker factory function

#### Methods

- `ready()`: Returns a promise that resolves when the worker is ready
- `postMessage(data, origin, transfer)`: Send a message to the worker
- `onMessage(callback)`: Set up message handling
- `terminate()`: Clean up the worker

### Socks

The worker-side interface for handling messages.

#### Constructor

```javascript
new Socks(self)
```

- `self` (object, optional): The worker context (self in browser, parentPort in Node.js)

#### Methods

- `ready()`: Signal that the worker is ready
- `postMessage(data, origin, transfer)`: Send a message to the main thread
- `onMessage(callback)`: Set up message handling
- `terminate()`: Clean up the worker
- `onTerminate(callback)`: Set up termination callback

## Advanced Usage

### Custom Worker Factory

```javascript
const customFactory = (socksFile) => {
    // Your custom worker creation logic
    return new CustomWorker(socksFile);
};

const workBoots = new WorkBoots({
    socksFile: './worker.js',
    instantiateWorker: customFactory
});
```

### Error Handling

```javascript
const workBoots = new WorkBoots({
    socksFile: './worker.js'
});

workBoots.onMessage(({ data }) => {
    try {
        console.log('Processing:', data);
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

try {
    await workBoots.ready();
} catch (error) {
    console.error('Worker initialization failed:', error);
    // Fallback to local processing
}
```

### Message Queuing

```javascript
const workBoots = new WorkBoots({
    socksFile: './worker.js'
});

// Messages sent before ready() are queued
workBoots.postMessage({ queued: 1 });
workBoots.postMessage({ queued: 2 });

workBoots.onMessage(({ data }) => {
    console.log('Received:', data);
});

// Queued messages are sent after ready
await workBoots.ready();
```

### Multiple Workers

```javascript
const workers = [];
const workerCount = 3;

for (let i = 0; i < workerCount; i++) {
    const workBoots = new WorkBoots({
        socksFile: './worker.js'
    });

    workBoots.onMessage(({ data }) => {
        console.log(`Worker ${i} received:`, data);
    });

    await workBoots.ready();
    workers.push(workBoots);
}

// Send messages to all workers
workers.forEach((worker, index) => {
    worker.postMessage({ workerId: index });
});
```

## Browserify Configuration

### package.json
```json
{
  "browserify": {
    "transform": [
      ["babelify", { "presets": ["@babel/preset-env"] }]
    ],
    "standalone": "WorkBoots"
  }
}
```

### Build Scripts
```json
{
  "scripts": {
    "build:browser": "browserify src/index.js -o dist/work-boots.browser.js -s WorkBoots",
    "build:node": "cp src/index.js dist/work-boots.js",
    "build:worker": "browserify src/work-boots.js -o dist/work-boots.worker.js -s WorkBoots"
  }
}
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run browser-specific tests
npm run test:browser
```

## Performance Considerations

- **Message Size**: Large messages may impact performance. Consider chunking large data.
- **Message Frequency**: High-frequency messaging may cause queuing. Implement rate limiting if needed.
- **Memory Management**: Always call `terminate()` when done to clean up resources.
- **Transferable Objects**: Use transferable objects (ArrayBuffer, etc.) for large data to avoid copying.

## Browser Compatibility

- Modern browsers with Web Worker support
- Node.js 12+ with Worker Threads support
- Automatic fallback to local execution when workers aren't available
- Full Browserify compatibility for universal module support

## License

MIT
