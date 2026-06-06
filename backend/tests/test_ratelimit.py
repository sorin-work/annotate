from app.ratelimit import SlidingWindowLimiter


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_limits_after_max_hits_and_recovers():
    clock = FakeClock()
    limiter = SlidingWindowLimiter(3, 60, clock=clock)
    for _ in range(3):
        assert limiter.retry_after("a") is None
        limiter.hit("a")
        clock.now += 10

    assert limiter.retry_after("a") == 30
    assert limiter.retry_after("b") is None

    clock.now += 30
    assert limiter.retry_after("a") is None


def test_reset_forgets_a_key():
    limiter = SlidingWindowLimiter(1, 60, clock=FakeClock())
    limiter.hit("a")
    assert limiter.retry_after("a") == 60
    limiter.reset("a")
    assert limiter.retry_after("a") is None
