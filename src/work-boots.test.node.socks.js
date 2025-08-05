import { Socks } from './work-boots.js';

// In Node.js worker threads, we have access to parentPort instead of self
const socks = new Socks(typeof parentPort !== 'undefined' ? parentPort : undefined);

socks.onMessage(({ data }) => {
  console.log(`Node.js worker received: ${JSON.stringify(data)}`);
  
  // Echo back the data with some processing
  const response = {
    processed: true,
    original: data,
    timestamp: Date.now(),
    worker: 'node'
  };
  
  socks.postMessage(response);
});

socks.ready();
export { socks }; 