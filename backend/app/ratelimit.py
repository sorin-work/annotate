"""In-memory sliding window rate limiting.

Good enough for a single API process, which is how annotate is deployed. With
several workers each one keeps its own counts, so the effective limit is
multiplied by the number of workers.
"""

import math
import time
from collections import deque
from collections.abc import Callable
from threading import Lock


class SlidingWindowLimiter:
    def __init__(
        self, max_hits: int, window_seconds: float, clock: Callable[[], float] = time.monotonic
    ):
        self.max_hits = max_hits
        self.window = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def _recent(self, key: str, now: float) -> deque[float]:
        hits = self._hits.get(key)
        if hits is None:
            return deque()
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if not hits:
            del self._hits[key]
        return hits

    def retry_after(self, key: str) -> int | None:
        """Seconds until ``key`` may try again, or None if it is not limited."""
        with self._lock:
            now = self._clock()
            hits = self._recent(key, now)
            if len(hits) < self.max_hits:
                return None
            return max(1, math.ceil(hits[0] + self.window - now))

    def hit(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            self._recent(key, now)
            self._hits.setdefault(key, deque()).append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)
