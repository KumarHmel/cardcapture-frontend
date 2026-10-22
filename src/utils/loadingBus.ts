type Listener = (isLoading: boolean) => void;

class LoadingBus {
    private listeners: Set<Listener> = new Set();
    private pendingCount = 0;

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        // Emit current state immediately
        listener(this.pendingCount > 0);
        return () => this.listeners.delete(listener);
    }

    start(): void {
        this.pendingCount += 1;
        this.emit();
    }

    stop(): void {
        this.pendingCount = Math.max(0, this.pendingCount - 1);
        this.emit();
    }

    private emit(): void {
        const isLoading = this.pendingCount > 0;
        this.listeners.forEach((l) => l(isLoading));
    }
}

export const loadingBus = new LoadingBus();


