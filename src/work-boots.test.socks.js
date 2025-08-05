import { Socks } from './work-boots.js';

// Handle self reference properly in test environment
const workerSelf = typeof self !== 'undefined' ? self : undefined;
const socks = new Socks(workerSelf);

socks.onMessage(({ data }) => {
  console.log(`data: ${JSON.stringify(data)}`);
  socks.postMessage({ elite: data.elite });
});

socks.ready();
export { socks };
