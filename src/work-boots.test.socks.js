import { Socks } from './work-boots.js';

const socks = new Socks(self);

socks.onMessage(({ data }) => {
  console.log(`data: ${JSON.stringify(data)}`);
  socks.postMessage({ elite: data.elite });
});

socks.ready();
export { socks };
