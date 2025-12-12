import type { Provider } from '../types/config/provider.js';

const compareProviders = (left: Provider, right: Provider): number => {
  return left.priority - right.priority;
};

export default compareProviders;
