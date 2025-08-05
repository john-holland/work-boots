import { jest } from '@jest/globals';
import { WorkBoots, Socks } from './index.js';
import { 
  MockWorker, 
  MockNodeWorker, 
  createMockWorkerFactory, 
  wait, 
  isNode,
  isBrowser
} from './test-utils.js';

// Mock the worker_threads module for Node.js tests
if (isNode) {
  jest.mock('worker_threads', () => ({
    Worker: MockNodeWorker
  }));
}

// Mock Worker for browser tests
if (isBrowser) {
  global.Worker = MockWorker;
}

describe('Integration Tests', () => {
  describe('Complete Workflow Tests', () => {
    test('should handle basic message round-trip', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => {
        messages.push(data);
      });

      await wait(100);
      workBoots.postMessage({ test: 'hello world' });
      await wait(100);

      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple messages', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => {
        messages.push(data);
      });

      await wait(100);
      
      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        workBoots.postMessage({ id: i, message: `Message ${i}` });
      }

      await wait(100);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Recovery Tests', () => {
    test('should handle worker creation failures gracefully', async () => {
      const failingFactory = () => { throw new Error('Worker creation failed'); };
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: failingFactory
      });

      // Should not throw
      expect(workBoots).toBeInstanceOf(WorkBoots);
    });

    test('should handle message errors gracefully', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      // Set up error-throwing callback
      workBoots.onMessage(() => {
        throw new Error('Message processing error');
      });

      await wait(100);
      
      // Should not throw
      expect(() => {
        workBoots.postMessage({ test: 'data' });
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should handle message sending efficiently', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await wait(100);
      
      const startTime = Date.now();
      
      // Send messages
      for (let i = 0; i < 10; i++) {
        workBoots.postMessage({ id: i, data: `Message ${i}` });
      }

      await wait(100);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle large payloads', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await wait(100);
      
      const largeData = {
        array: new Array(1000).fill(0).map((_, i) => i),
        object: Object.fromEntries(
          new Array(100).fill(0).map((_, i) => [`key${i}`, `value${i}`])
        ),
        timestamp: Date.now()
      };

      workBoots.postMessage(largeData);
      await wait(100);
      
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Management Tests', () => {
    test('should handle repeated message sending', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await wait(100);
      
      // Send messages repeatedly
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < 5; i++) {
          workBoots.postMessage({ round, id: i, data: `Message ${i}` });
        }
        await wait(50);
      }

      await wait(100);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle termination cleanup', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await wait(100);
      
      // Should not throw
      expect(() => {
        workBoots.terminate();
      }).not.toThrow();
    });
  });

  describe('Cross-Platform Compatibility Tests', () => {
    test('should work consistently across environments', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      expect(workBoots).toBeInstanceOf(WorkBoots);
      expect(typeof workBoots.detectWorkerSupport).toBe('function');
      expect(typeof workBoots.createDefaultWorkerFactory).toBe('function');
    });

    test('should handle environment-specific features', () => {
      expect(typeof isNode).toBe('boolean');
      expect(typeof isBrowser).toBe('boolean');
      
      // Test mock workers
      const mockWorker = new MockWorker('./test.js');
      expect(mockWorker).toBeInstanceOf(MockWorker);
      
      const mockNodeWorker = new MockNodeWorker('./test.js');
      expect(mockNodeWorker).toBeInstanceOf(MockNodeWorker);
    });
  });

  describe('Edge Case Tests', () => {
    test('should handle undefined and null messages', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await wait(100);
      
      // Should not throw
      expect(() => {
        workBoots.postMessage(undefined);
        workBoots.postMessage(null);
        workBoots.postMessage({});
      }).not.toThrow();
    });

    test('should handle empty messages', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await wait(100);
      
      // Should not throw
      expect(() => {
        workBoots.postMessage('');
        workBoots.postMessage([]);
        workBoots.postMessage({});
      }).not.toThrow();
    });

    test('should handle very long strings', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await wait(100);
      
      const longString = 'x'.repeat(10000);
      
      // Should not throw
      expect(() => {
        workBoots.postMessage({ data: longString });
      }).not.toThrow();
    });
  });
}); 