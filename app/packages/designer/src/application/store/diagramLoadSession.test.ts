import { describe, it, expect } from 'vitest';
import { beginDiagramLoad, endDiagramLoad } from './diagramLoadSession';

describe('diagramLoadSession', () => {
  it('keeps the overlay visible until nested loads finish', () => {
    let state = {
      diagramLoadCount: 0,
      isLoading: false as boolean | string,
    };

    const get = () => state;
    const set = (partial: Partial<typeof state>) => {
      state = { ...state, ...partial };
    };

    beginDiagramLoad(get, set, 'Loading sandbox...');
    beginDiagramLoad(get, set, 'Arranging diagram...');

    endDiagramLoad(get, set);
    expect(state.isLoading).toBe('Arranging diagram...');
    expect(state.diagramLoadCount).toBe(1);

    endDiagramLoad(get, set);
    expect(state.isLoading).toBe(false);
    expect(state.diagramLoadCount).toBe(0);
  });
});
