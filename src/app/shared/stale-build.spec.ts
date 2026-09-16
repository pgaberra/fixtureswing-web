import { afterEach, describe, expect, it } from 'vitest';
import {
  clearStaleBuildReload,
  isRecoveringFromStaleBuild,
  isStaleBuildError,
  RELOADED_KEY,
} from './stale-build';

describe('stale build detection', () => {
  afterEach(() => sessionStorage.clear());

  it('recognises the chunk-load errors each browser throws', () => {
    expect(isStaleBuildError(new Error('Failed to fetch dynamically imported module: /c.js'))).toBe(
      true,
    );
    expect(isStaleBuildError('Importing a module script failed.')).toBe(true);
    expect(isStaleBuildError(new Error('ChunkLoadError: Loading chunk 7 failed'))).toBe(true);
    expect(isStaleBuildError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('only counts as recovering once a reload has been attempted', () => {
    const error = new Error('Failed to fetch dynamically imported module');
    expect(isRecoveringFromStaleBuild(error)).toBe(false);
    sessionStorage.setItem(RELOADED_KEY, '1');
    expect(isRecoveringFromStaleBuild(error)).toBe(true);
    clearStaleBuildReload();
    expect(isRecoveringFromStaleBuild(error)).toBe(false);
  });
});
