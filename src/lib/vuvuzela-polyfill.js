// Import the original CommonJS build; vite alias maps consumer imports to this polyfill
import vuvuzelaCjs from 'vuvuzela-original';

const actualVuvuzela = vuvuzelaCjs?.default ?? vuvuzelaCjs;
const stringify = actualVuvuzela?.stringify;
const parse = actualVuvuzela?.parse;

if (typeof stringify !== 'function' || typeof parse !== 'function') {
  throw new Error('vuvuzela polyfill: failed to load or missing expected exports (stringify, parse)');
}

const vuvuzela = { stringify, parse };

export default vuvuzela;
export { stringify, parse };
