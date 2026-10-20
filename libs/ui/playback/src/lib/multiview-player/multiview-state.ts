export function emptyMultiviewSlots<T>(): Array<T | null> {
    return [null, null, null, null];
}

export function assignMultiviewSlot<T>(
    slots: readonly (T | null)[],
    index: number,
    slot: T
): Array<T | null> {
    const next = [...slots];
    next[index] = slot;
    return next;
}
