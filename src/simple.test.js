import { jest } from '@jest/globals';
import { WorkBoots, Socks } from './work-boots.js';
import { MockWorker, MockNodeWorker, isNode, isBrowser } from './test-utils.js';

describe('Simple Tests', () => {
  test('should create WorkBoots instance', () => {
    const workBoots = new WorkBoots({ socksFile: './nonexistent.js' });
    expect(workBoots).toBeInstanceOf(WorkBoots);
  });

  test('should create Socks instance', () => {
    const socks = new Socks();
    expect(socks).toBeInstanceOf(Socks);
  });

  test('should detect environment correctly', () => {
    expect(typeof isNode).toBe('boolean');
    expect(typeof isBrowser).toBe('boolean');
  });

  test('should handle basic Socks functionality', () => {
    const socks = new Socks();
    const mockBoots = {
      onMessageLocal: jest.fn()
    };

    socks.enterBoots(mockBoots);
    socks.ready();
    socks.postMessage({ test: 'data' });

    expect(mockBoots.onMessageLocal).toHaveBeenCalled();
  });

  test('should handle MockWorker', () => {
    const mockWorker = new MockWorker('./test.js');
    expect(mockWorker).toBeInstanceOf(MockWorker);
  });

  test('should handle MockNodeWorker', () => {
    const mockWorker = new MockNodeWorker('./test.js');
    expect(mockWorker).toBeInstanceOf(MockNodeWorker);
  });

  test('should handle WorkBoots with failing worker factory', async () => {
    const failingFactory = () => { throw new Error('Worker creation failed'); };
    const workBoots = new WorkBoots({ 
      socksFile: './nonexistent.js',
      instantiateWorker: failingFactory
    });

    // Should not throw
    expect(workBoots).toBeInstanceOf(WorkBoots);
  });
}); 