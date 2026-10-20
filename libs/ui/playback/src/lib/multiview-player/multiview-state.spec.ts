import { assignMultiviewSlot, emptyMultiviewSlots } from './multiview-state';

describe('multiview state', () => {
    const playback = (streamUrl: string) => ({
        streamUrl,
        title: streamUrl,
        isLive: true,
    });
    type TestSlot = {
        playback: ReturnType<typeof playback>;
        sessionKey: string;
    };

    it('starts with four empty panel positions', () => {
        expect(emptyMultiviewSlots()).toEqual([null, null, null, null]);
    });

    it('assigns a channel only to the selected panel', () => {
        const original = emptyMultiviewSlots<TestSlot>();
        const next = assignMultiviewSlot(original, 2, {
            playback: playback('https://example.test/live/2'),
            sessionKey: 'panel-2',
        });

        expect(original).toEqual([null, null, null, null]);
        expect(next[2]?.playback.streamUrl).toBe('https://example.test/live/2');
        expect(next.filter(Boolean)).toHaveLength(1);
    });

    it('replaces the selected panel without disturbing the others', () => {
        const first = assignMultiviewSlot(emptyMultiviewSlots<TestSlot>(), 0, {
            playback: playback('https://example.test/live/1'),
            sessionKey: 'panel-0',
        });
        const second = assignMultiviewSlot(first, 1, {
            playback: playback('https://example.test/live/2'),
            sessionKey: 'panel-1',
        });

        expect(second[0]).toBe(first[0]);
        expect(second[1]?.sessionKey).toBe('panel-1');
    });
});
