from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


def remove_edge_background(im: Image.Image, tolerance: int = 30) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    def is_background(r: int, g: int, b: int) -> bool:
        return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance

    visited: set[tuple[int, int]] = set()
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_background(*px[x, y][:3]):
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_background(*px[x, y][:3]):
                q.append((x, y))

    while q:
        x, y = q.popleft()
        if (x, y) in visited:
            continue
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        r, g, b, _a = px[x, y]
        if not is_background(r, g, b):
            continue
        visited.add((x, y))
        px[x, y] = (r, g, b, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or r < 235 or g < 235 or b < 235:
                continue
            transparent_neighbors = sum(
                1
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0
            )
            if transparent_neighbors >= 2:
                px[x, y] = (r, g, b, 0)

    return im


def save_resized(im: Image.Image, path: Path, size: int) -> None:
    resized = im.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path, format="PNG", optimize=True)


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    src = root / "assets" / "icon.png"
    public = root / "web" / "public"

    base = remove_edge_background(Image.open(src))
    save_resized(base, public / "icon.png", 512)
    save_resized(base, public / "icon-512.png", 512)
    save_resized(base, public / "icon-192.png", 192)
    save_resized(base, public / "apple-touch-icon.png", 180)
    save_resized(base, public / "favicon-32.png", 32)

    transparent = sum(1 for p in base.getdata() if p[3] == 0)
    print(f"OK: {transparent} transparent pixels of {base.size[0] * base.size[1]}")


if __name__ == "__main__":
    main()
