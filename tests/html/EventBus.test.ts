// @ts-expect-error - browser core is plain JavaScript
import { EventBus } from '../../html/js/core/EventBus.js';

describe('EventBus', () => {
  test('delivers payloads to a subscriber in order', () => {
    const bus = new EventBus();
    const seen: number[] = [];
    bus.on('x', (p: number) => seen.push(p));
    bus.emit('x', 1);
    bus.emit('x', 2);
    expect(seen).toEqual([1, 2]);
  });

  test('fans out to multiple handlers of the same type', () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on('x', (p: string) => seen.push(`a:${p}`));
    bus.on('x', (p: string) => seen.push(`b:${p}`));
    bus.emit('x', 'p');
    expect(seen).toEqual(['a:p', 'b:p']);
  });

  test('off() and the returned unsubscribe both stop delivery', () => {
    const bus = new EventBus();
    let viaReturn = 0;
    const unsub = bus.on('x', () => { viaReturn++; });
    unsub();
    bus.emit('x');
    expect(viaReturn).toBe(0);

    let viaOff = 0;
    const handler = () => { viaOff++; };
    bus.on('y', handler);
    bus.off('y', handler);
    bus.emit('y');
    expect(viaOff).toBe(0);
  });

  test('emitting with no subscribers is a no-op', () => {
    const bus = new EventBus();
    expect(() => bus.emit('none', 1)).not.toThrow();
  });

  test('a handler unsubscribing during emit does not skip later handlers', () => {
    const bus = new EventBus();
    const calls: string[] = [];
    const off1 = bus.on('x', () => {
      calls.push('1');
      off1();
    });
    bus.on('x', () => calls.push('2'));
    bus.emit('x');
    expect(calls).toEqual(['1', '2']);
  });
});
