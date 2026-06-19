/** @jest-environment jsdom */

// @ts-expect-error - browser service is plain JavaScript
import { AudioService } from '../../html/js/service/AudioService.js';
// @ts-expect-error - browser core is plain JavaScript
import { EventBus } from '../../html/js/core/EventBus.js';
// @ts-expect-error - browser core is plain JavaScript
import { Events } from '../../html/js/core/events.js';

class FakeAudioContext {
  static rejectResume = false;
  static created = 0;
  static closed = 0;
  static started = 0;

  state = 'suspended';
  currentTime = 0;
  destination = {};

  constructor() {
    FakeAudioContext.created++;
  }

  async resume(): Promise<void> {
    if (FakeAudioContext.rejectResume) throw new Error('Audio unavailable');
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.state = 'closed';
    FakeAudioContext.closed++;
  }

  createOscillator() {
    return {
      type: 'sine',
      connect() {},
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      start() {
        FakeAudioContext.started++;
      },
      stop() {},
    };
  }

  createGain() {
    return {
      connect() {},
      gain: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
        linearRampToValueAtTime() {},
      },
    };
  }
}

function newService() {
  const bus = new EventBus();
  const service = new AudioService(bus, { audioContextClass: FakeAudioContext });
  return { bus, service };
}

beforeEach(() => {
  FakeAudioContext.rejectResume = false;
  FakeAudioContext.created = 0;
  FakeAudioContext.closed = 0;
  FakeAudioContext.started = 0;
});

describe('AudioService', () => {
  test('plays a known tone, creating and starting an oscillator', async () => {
    const { service } = newService();
    await service.play('move');
    expect(FakeAudioContext.created).toBe(1);
    expect(FakeAudioContext.started).toBe(1);
  });

  test('ignores unknown sound types without touching the context', async () => {
    const { service } = newService();
    await service.play('nope');
    expect(FakeAudioContext.created).toBe(0);
  });

  test('plays in response to a sound:play event after start()', async () => {
    const { bus, service } = newService();
    service.start();
    bus.emit(Events.SOUND_PLAY, 'capture');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(FakeAudioContext.started).toBe(1);
  });

  test('closes the context when activation fails', async () => {
    const { service } = newService();
    FakeAudioContext.rejectResume = true;
    await service.play('promote');
    expect(FakeAudioContext.created).toBe(1);
    expect(FakeAudioContext.closed).toBe(1);
    expect(FakeAudioContext.started).toBe(0);
  });

  test('reuses a running context across plays', async () => {
    const { service } = newService();
    await service.play('move');
    await service.play('capture');
    expect(FakeAudioContext.created).toBe(1);
    expect(FakeAudioContext.started).toBe(2);
  });
});
