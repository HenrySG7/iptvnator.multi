import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
    viewChildren,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    type RecordingStartMetadata,
    type RecordingStoppedEvent,
    type ResolvedPortalPlayback,
    VideoPlayer,
} from '@iptvnator/shared/interfaces';
import type { PlaybackFallbackRequest } from '@iptvnator/playback/util';
import { SettingsStore } from '@iptvnator/services';
import type { PlayerTimelineSegment } from '../player-controls';
import { WebPlayerViewComponent } from '../web-player-view/web-player-view.component';
import { assignMultiviewSlot, emptyMultiviewSlots } from './multiview-state';

export type MultiviewLayout = 1 | 2 | 4;

interface MultiviewSlot {
    readonly playback: ResolvedPortalPlayback;
    readonly sessionKey: string;
    readonly playerOverride: VideoPlayer | null;
    readonly timelineSegments: readonly PlayerTimelineSegment[] | null;
    readonly recordingMetadata: RecordingStartMetadata | null;
}

@Component({
    selector: 'app-multiview-player',
    templateUrl: './multiview-player.component.html',
    styleUrl: './multiview-player.component.scss',
    imports: [MatIconModule, MatTooltipModule, WebPlayerViewComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'multiview-player' },
})
export class MultiviewPlayerComponent {
    readonly playback = input.required<ResolvedPortalPlayback>();
    readonly playbackSessionKey = input.required<string>();
    readonly volume = input(1);
    readonly playerOverride = input<VideoPlayer | null>(null);
    readonly timelineSegments = input<readonly PlayerTimelineSegment[] | null>(
        null
    );
    readonly recordingMetadata = input<RecordingStartMetadata | null>(null);
    readonly externalFallbackRequested = output<PlaybackFallbackRequest>();
    readonly recordingStopped = output<RecordingStoppedEvent>();
    private readonly settingsStore = inject(SettingsStore);
    readonly effectivePlayer = computed(() => {
        const player = this.playerOverride() ?? this.settingsStore.player?.() ?? null;
        return player === VideoPlayer.EmbeddedMpv ? VideoPlayer.VideoJs : player;
    });

    readonly layout = signal<MultiviewLayout>(1);
    readonly activeIndex = signal(0);
    readonly slots = signal<Array<MultiviewSlot | null>>(
        emptyMultiviewSlots<MultiviewSlot>()
    );
    readonly visibleIndexes = computed(() =>
        Array.from({ length: this.layout() }, (_, index) => index)
    );
    readonly gridClass = computed(() => `multiview-grid--${this.layout()}`);
    private readonly panes = viewChildren<ElementRef<HTMLElement>>('pane');
    private sequence = 0;

    constructor(private readonly host: ElementRef<HTMLElement>) {
        effect(() => {
            const playback = this.playback();
            const index = untracked(() =>
                this.layout() === 1 ? 0 : this.activeIndex()
            );
            const current = untracked(() => this.slots()[index]);
            if (current?.playback.streamUrl === playback.streamUrl) {
                return;
            }
            this.sequence += 1;
            this.slots.update((slots) =>
                assignMultiviewSlot(slots, index, {
                    playback,
                    sessionKey: `${this.playbackSessionKey()}:multiview:${index}:${this.sequence}`,
                    playerOverride: this.effectivePlayer(),
                    timelineSegments: this.timelineSegments(),
                    recordingMetadata: this.recordingMetadata(),
                })
            );
        });

        effect((cleanup) => {
            const active = this.activeIndex();
            this.slots();
            const applyMute = () => {
                this.host.nativeElement
                    .querySelectorAll<HTMLVideoElement>('[data-multiview-pane] video')
                    .forEach((video) => {
                        const pane = video.closest<HTMLElement>('[data-multiview-pane]');
                        video.muted = Number(pane?.dataset['multiviewPane']) !== active;
                    });
            };
            queueMicrotask(applyMute);
            const observer = new MutationObserver(applyMute);
            observer.observe(this.host.nativeElement, { childList: true, subtree: true });
            cleanup(() => observer.disconnect());
        });
    }

    setLayout(layout: MultiviewLayout): void {
        this.layout.set(layout);
        if (this.activeIndex() >= layout) {
            this.activeIndex.set(0);
        }
    }

    select(index: number): void {
        this.activeIndex.set(index);
    }

    close(index: number, event: Event): void {
        event.stopPropagation();
        this.slots.update((slots) => {
            const next = [...slots];
            next[index] = null;
            return next;
        });
        if (this.activeIndex() === index) {
            this.activeIndex.set(0);
        }
    }

    async fullscreen(index: number, event: Event): Promise<void> {
        event.stopPropagation();
        const pane = this.panes()[index]?.nativeElement;
        if (pane?.requestFullscreen) {
            await pane.requestFullscreen();
        }
    }
}
