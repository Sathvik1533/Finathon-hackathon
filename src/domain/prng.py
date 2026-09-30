"""Deterministic 32-bit PRNG (Mulberry32) for reproducible synthetic financial data generation.
Guarantees byte-identical outputs across runs given the same initial seed.
"""


class Mulberry32:
    def __init__(self, seed: int):
        self._state = seed & 0xFFFFFFFF

    def next_int(self) -> int:
        """Returns pseudo-random 32-bit unsigned integer."""
        self._state = (self._state + 0x6D2B79F5) & 0xFFFFFFFF
        t = self._state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return (t ^ (t >> 14)) & 0xFFFFFFFF

    def random(self) -> float:
        """Returns float in [0.0, 1.0)."""
        return self.next_int() / 4294967296.0

    def randint(self, a: int, b: int) -> int:
        """Inclusive range [a, b]."""
        return a + int(self.random() * (b - a + 1))

    def choice(self, seq: list):
        idx = int(self.random() * len(seq))
        return seq[idx]

    def sample_distribution(self, items: list, weights: list[float]):
        """Weighted choice."""
        total = sum(weights)
        r = self.random() * total
        upto = 0.0
        for item, w in zip(items, weights):
            if upto + w >= r:
                return item
            upto += w
        return items[-1]
