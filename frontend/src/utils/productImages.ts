import type { Product } from "../types";

export const FALLBACK_IMAGE = "/products/product_fallback.jpg";

/**
 * Deterministically maps a Product to a realistic, high-quality local Unsplash product image
 * in /products/ based on product title keywords, category, and ID.
 */
export function getProductImage(product?: Product | null): string {
  if (!product) return FALLBACK_IMAGE;

  const name = (product.name || "").toLowerCase();
  const categoryId = product.category_id || product.category?.id || 0;

  // ── 1. Specific Keyword Matching on Product Name ────────────────────────
  if (name.includes("noise cancelling") || name.includes("anc")) {
    return "/products/headphones_anc.jpg";
  }
  if (name.includes("headphone") || name.includes("headset")) {
    return "/products/headphones_wireless.jpg";
  }
  if (name.includes("earbud") || name.includes("airpod") || name.includes("in-ear")) {
    return "/products/earbuds_wireless.jpg";
  }
  if (name.includes("gaming laptop")) {
    return "/products/laptop_gaming.jpg";
  }
  if (name.includes("laptop") || name.includes("macbook") || name.includes("notebook")) {
    return "/products/laptop_modern.jpg";
  }
  if (name.includes("phone") || name.includes("smartphone") || name.includes("iphone") || name.includes("galaxy")) {
    return "/products/smartphone_flagship.jpg";
  }
  if (name.includes("tablet") || name.includes("ipad")) {
    return "/products/tablet_pro.jpg";
  }
  if (name.includes("watch") || name.includes("smartwatch") || name.includes("fitness tracker")) {
    return "/products/smartwatch_fitness.jpg";
  }
  if (name.includes("speaker") || name.includes("soundbar")) {
    return "/products/speaker_bluetooth.jpg";
  }
  if (name.includes("webcam") || name.includes("camera")) {
    return "/products/webcam_hd.jpg";
  }

  // Clothing & Footwear
  if (name.includes("t-shirt") || name.includes("tee") || name.includes("shirt")) {
    return "/products/tshirt_classic.jpg";
  }
  if (name.includes("hoodie") || name.includes("jacket") || name.includes("sweatshirt")) {
    return "/products/hoodie_streetwear.jpg";
  }
  if (name.includes("jean") || name.includes("denim") || name.includes("pant") || name.includes("trouser")) {
    return "/products/jeans_denim.jpg";
  }
  if (name.includes("running shoe") || name.includes("running") || name.includes("trainer")) {
    return "/products/shoes_running.jpg";
  }
  if (name.includes("shoe") || name.includes("sneaker") || name.includes("boot") || name.includes("footwear")) {
    return "/products/shoes_sneakers.jpg";
  }

  // Books
  if (name.includes("programming") || name.includes("guide") || name.includes("python") || name.includes("coding")) {
    return "/products/book_programming.jpg";
  }
  if (name.includes("cookbook") || name.includes("recipe")) {
    return "/products/book_cookbook.jpg";
  }
  if (name.includes("book") || name.includes("novel") || name.includes("fiction") || name.includes("biography")) {
    return "/products/book_fiction.jpg";
  }

  // Home & Kitchen
  if (name.includes("air fryer") || name.includes("fryer")) {
    return "/products/kitchen_airfryer.jpg";
  }
  if (name.includes("mixer") || name.includes("grinder") || name.includes("blender")) {
    return "/products/kitchen_mixer.jpg";
  }
  if (name.includes("cookware") || name.includes("pan") || name.includes("pot") || name.includes("kettle")) {
    return "/products/kitchen_cookware.jpg";
  }

  // Sports & Fitness
  if (name.includes("yoga") || name.includes("mat")) {
    return "/products/fitness_yogamat.jpg";
  }
  if (name.includes("dumbbell") || name.includes("weight") || name.includes("gym")) {
    return "/products/fitness_dumbbells.jpg";
  }
  if (name.includes("football") || name.includes("ball") || name.includes("bat") || name.includes("cricket")) {
    return "/products/sports_football.jpg";
  }

  // Beauty & Skincare
  if (name.includes("face wash") || name.includes("cleanser") || name.includes("serum")) {
    return "/products/beauty_facewash.jpg";
  }
  if (name.includes("moisturizer") || name.includes("cream") || name.includes("sunscreen") || name.includes("lotion")) {
    return "/products/beauty_moisturizer.jpg";
  }

  // Toys & Games
  if (name.includes("lego") || name.includes("block") || name.includes("building")) {
    return "/products/toys_lego.jpg";
  }
  if (name.includes("board game") || name.includes("puzzle") || name.includes("card")) {
    return "/products/toys_boardgame.jpg";
  }

  // Automotive
  if (name.includes("dash cam") || name.includes("camera") || name.includes("dash")) {
    return "/products/auto_dashcam.jpg";
  }
  if (name.includes("inflator") || name.includes("tyre") || name.includes("vacuum") || name.includes("oil")) {
    return "/products/auto_inflator.jpg";
  }

  // ── 2. Fallback by Category ID / Name ──────────────────────────────────
  const categoryImageMap: Record<number, string[]> = {
    1: ["/products/headphones_wireless.jpg", "/products/laptop_modern.jpg", "/products/smartphone_flagship.jpg", "/products/smartwatch_fitness.jpg"],
    2: ["/products/tshirt_classic.jpg", "/products/hoodie_streetwear.jpg", "/products/jeans_denim.jpg", "/products/shoes_sneakers.jpg"],
    3: ["/products/book_programming.jpg", "/products/book_fiction.jpg", "/products/book_cookbook.jpg"],
    4: ["/products/kitchen_airfryer.jpg", "/products/kitchen_mixer.jpg", "/products/kitchen_cookware.jpg"],
    5: ["/products/fitness_yogamat.jpg", "/products/fitness_dumbbells.jpg", "/products/sports_football.jpg"],
    6: ["/products/beauty_facewash.jpg", "/products/beauty_moisturizer.jpg"],
    7: ["/products/toys_lego.jpg", "/products/toys_boardgame.jpg"],
    8: ["/products/auto_dashcam.jpg", "/products/auto_inflator.jpg"],
  };

  const pool = categoryImageMap[categoryId];
  if (pool && pool.length > 0) {
    const hash = Math.abs(product.id || 0) % pool.length;
    return pool[hash];
  }

  return FALLBACK_IMAGE;
}
