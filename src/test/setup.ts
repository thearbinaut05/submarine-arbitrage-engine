import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.ethereum for all tests
const mockEthereumProvider = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  send: vi.fn().mockResolvedValue([]),
  isConnected: vi.fn().mockReturnValue(true),
  chainId: '0x1',
};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ethereum', {
  writable: true,
  value: mockEthereumProvider,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  readyState = MockWebSocket.OPEN;
  send = vi.fn();
  close = vi.fn();
  onmessage: ((event: any) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

global.WebSocket = MockWebSocket as any;

// Mock console errors to not fail tests
const originalError = console.error;
console.error = vi.fn((...args) => {
  // Filter out React testing library warnings
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalError.call(console, ...args);
});

// Suppress specific warnings
vi.spyOn(console, 'warn').mockImplementation((...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('useLayoutEffect does nothing on the server') ||
      args[0].includes('componentWillMount'))
  ) {
    return;
  }
});

