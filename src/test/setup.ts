/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock ResizeObserver for Recharts compatibility
if (typeof window !== "undefined") {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-ignore
  global.ResizeObserver = ResizeObserverMock;
  
  // Mock window.scrollTo
  window.scrollTo = vi.fn();
}

// Mock high-performance timing if needed
if (!global.performance) {
  // @ts-ignore
  global.performance = {};
}
if (!global.performance.now) {
  global.performance.now = () => Date.now();
}

// Mock Canvas getContext for chart elements
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  });
}
