"""把收款码图片处理成插件用的方形图：自动按内容边界裁掉多余白边/色块，再缩放到统一尺寸。

用法：
    python scripts/make-qr.py <输入图片> <输出路径> [目标边长]

- 自动裁边：从四边向内找"与边缘背景色明显不同"的内容边界
- 缩放：保持正方形，用 LANCZOS 重采样
- 输出：PNG（无损，二维码不能有压缩伪影）
"""
import sys
from PIL import Image, ImageChops

def content_bbox(img):
    """返回与四角背景色不同的内容外接框。"""
    rgb = img.convert("RGB")
    w, h = rgb.size
    # 取四角像素的中位数作为背景色基准
    corners = [rgb.getpixel(p) for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]]
    bg = tuple(sorted(c[i] for c in corners)[len(corners) // 2] for i in range(3))
    # 与背景色差超过阈值的区域算内容
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).convert("L")
    mask = diff.point(lambda v: 255 if v > 24 else 0)
    return mask.getbbox()

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    src, dst = sys.argv[1], sys.argv[2]
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 480

    img = Image.open(src)
    print(f"输入: {src}  尺寸 {img.size}  模式 {img.mode}")

    bbox = content_bbox(img)
    if bbox:
        img = img.crop(bbox)
        print(f"按内容裁边 -> {img.size}  (bbox={bbox})")
    else:
        print("未找到内容边界，保持原样")

    # 裁成正方形（以中心为准）
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    print(f"裁为方形 -> {img.size}")

    img = img.resize((size, size), Image.LANCZOS)
    img.save(dst, "PNG", optimize=True)
    print(f"已输出: {dst}  {size}x{size}")

    # 提示：二维码需要足够对比度，检查一下尺寸是否够大
    if side < 240:
        print(f"⚠️ 原图二维码区域只有 {side}px，放大到 {size}px 可能影响扫描，建议提供更大的原图")
    return 0

if __name__ == "__main__":
    sys.exit(main())
