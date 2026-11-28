"""Shape features used to rank compact marker proposals before the close review."""


def marker_features(gray, boxes, np):
    from PIL import Image

    side = 32
    offsets = np.arange(30) // 8
    cells = (offsets[:, None] * 4 + offsets) * 8
    features = []
    for x0, y0, x1, y1 in boxes:
        x, y = (x0 + x1) / 2, (y0 + y1) / 2
        half = 0.60 * max(x1 - x0, y1 - y0)
        bounds = (max(0, x - half), max(0, y - half), min(gray.width, x + half), min(gray.height, y + half))
        if bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
            features.append(np.zeros(128))
            continue
        patch = gray.resize((side, side), Image.Resampling.BILINEAR, box=bounds)
        pixels = np.asarray(patch, dtype=np.float32)
        dx = pixels[1:-1, 2:] - pixels[1:-1, :-2]
        dy = pixels[2:, 1:-1] - pixels[:-2, 1:-1]
        magnitude = np.hypot(dx, dy)
        angles = np.remainder(np.arctan2(dy, dx), np.pi) * (8 / np.pi)
        orientation = angles.astype(int)
        fraction = angles - orientation
        low = np.bincount((cells + orientation % 8).ravel(),
                          weights=(magnitude * (1 - fraction)).ravel(), minlength=128)
        high = np.bincount((cells + (orientation + 1) % 8).ravel(),
                           weights=(magnitude * fraction).ravel(), minlength=128)
        histogram = low + high
        features.append(histogram / max(1, np.linalg.norm(histogram)))
    return np.asarray(features)
