/**
 * Test utilities for work-boots
 * Provides mock workers and helper functions for testing
 */

// Mock Worker for browser environment
export class MockWorker {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
    this.onmessage = null;
    this.onerror = null;
    this.terminated = false;
    
    // Simulate worker initialization
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: 'socks loaded' });
      }
    }, 10);
  }

  postMessage(data, transfer) {
    if (this.terminated) return;
    
    // Simulate message processing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { echo: data } });
      }
    }, 10);
  }

  terminate() {
    this.terminated = true;
  }

  addEventListener(event, callback) {
    if (event === 'message') {
      this.onmessage = callback;
    }
  }

  removeEventListener(event, callback) {
    if (event === 'message') {
      this.onmessage = null;
    }
  }
}

// Mock Worker for Node.js environment
export class MockNodeWorker {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
    this.listeners = new Map();
    this.terminated = false;
    
    // Simulate worker initialization
    setTimeout(() => {
      this.emit('message', { data: 'socks loaded' });
    }, 10);
  }

  postMessage(data, transfer) {
    if (this.terminated) return;
    
    // Simulate message processing
    setTimeout(() => {
      this.emit('message', { data: { echo: data } });
    }, 10);
  }

  terminate() {
    this.terminated = true;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  removeListener(event, callback) {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
}

// Environment detection
export const isNode = Boolean(typeof process !== 'undefined' && process.versions && process.versions.node);
export const isBrowser = Boolean(typeof window !== 'undefined' && typeof document !== 'undefined');

// Test helper functions
export function createMockWorkerFactory() {
  if (isBrowser) {
    return (scriptUrl) => new MockWorker(scriptUrl);
  } else if (isNode) {
    return (scriptUrl) => new MockNodeWorker(scriptUrl);
  }
  return () => { throw new Error('No worker support available'); };
}

export function wait(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createTestSocks() {
  return {
    onMessage: jest.fn(),
    postMessage: jest.fn(),
    ready: jest.fn(),
    terminate: jest.fn()
  };
}

// Test data generators
export function generateTestData(size = 1000) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    data: Array.from({ length: size }, (_, i) => i),
    metadata: {
      source: 'test',
      version: '1.0.0'
    }
  };
}

export function generateLargeTransferableData(size = 10000) {
  return {
    buffer: new ArrayBuffer(size),
    array: new Uint8Array(size),
    message: 'Large transferable data'
  };
} 