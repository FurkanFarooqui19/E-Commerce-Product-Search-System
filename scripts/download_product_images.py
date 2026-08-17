import os
import urllib.request
import time

IMAGE_TARGET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "products"))
os.makedirs(IMAGE_TARGET_DIR, exist_ok=True)

IMAGE_MAP = {
    "headphones_wireless.jpg": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    "headphones_anc.jpg": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80",
    "earbuds_wireless.jpg": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
    "laptop_modern.jpg": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80",
    "laptop_gaming.jpg": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80",
    "smartphone_flagship.jpg": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
    "tablet_pro.jpg": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80",
    "smartwatch_fitness.jpg": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    "speaker_bluetooth.jpg": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80",
    "webcam_hd.jpg": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
    "tshirt_classic.jpg": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
    "hoodie_streetwear.jpg": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80",
    "jeans_denim.jpg": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80",
    "shoes_running.jpg": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    "shoes_sneakers.jpg": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80",
    "book_programming.jpg": "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    "book_fiction.jpg": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    "book_cookbook.jpg": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80",
    "kitchen_airfryer.jpg": "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=600&q=80",
    "kitchen_mixer.jpg": "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80",
    "kitchen_cookware.jpg": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
    "fitness_yogamat.jpg": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=600&q=80",
    "fitness_dumbbells.jpg": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80",
    "sports_football.jpg": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80",
    "beauty_facewash.jpg": "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80",
    "beauty_moisturizer.jpg": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80",
    "toys_lego.jpg": "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=600&q=80",
    "toys_boardgame.jpg": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=600&q=80",
    "auto_dashcam.jpg": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
    "auto_inflator.jpg": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80",
    "product_fallback.jpg": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
}

def main():
    print(f"Downloading {len(IMAGE_MAP)} Unsplash product images into {IMAGE_TARGET_DIR}...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    for filename, url in IMAGE_MAP.items():
        target_path = os.path.join(IMAGE_TARGET_DIR, filename)
        if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
            print(f"  [OK: Exists] {filename}")
            continue
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
                with open(target_path, "wb") as f:
                    f.write(data)
                print(f"  [Downloaded] {filename} ({len(data)} bytes)")
            time.sleep(0.1)
        except Exception as e:
            print(f"  [Error] {filename}: {e}")

    print("Product image download complete!")

if __name__ == "__main__":
    main()
