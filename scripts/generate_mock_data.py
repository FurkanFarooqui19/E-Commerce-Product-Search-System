import json
import random
from datetime import datetime, timedelta

RNG = random.Random(42)

CATEGORIES = [
    {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics",
        "description": "Consumer electronics",
    },
    {
        "id": 2,
        "name": "Clothing & Apparel",
        "slug": "clothing-apparel",
        "description": "Fashion",
    },
    {"id": 3, "name": "Books", "slug": "books", "description": "Books"},
    {"id": 4, "name": "Home & Kitchen", "slug": "home-kitchen", "description": "Home"},
    {
        "id": 5,
        "name": "Sports & Outdoors",
        "slug": "sports-outdoors",
        "description": "Sports",
    },
    {
        "id": 6,
        "name": "Health & Beauty",
        "slug": "health-beauty",
        "description": "Health",
    },
    {"id": 7, "name": "Toys & Games", "slug": "toys-games", "description": "Toys"},
    {"id": 8, "name": "Automotive", "slug": "automotive", "description": "Automotive"},
]

CATEGORY_COUNTS = {1: 100, 2: 80, 3: 60, 4: 80, 5: 70, 6: 50, 7: 40, 8: 30}

BRANDS_BY_CATEGORY = {
    1: ["Sony", "Samsung", "Apple", "Bose", "JBL", "Sennheiser", "Dell", "HP"],
    2: ["Nike", "Adidas", "Puma", "Levis", "H&M", "Zara"],
    3: ["Penguin", "HarperCollins", "OReilly", "Pearson", "Bloomsbury"],
    4: ["Philips", "Prestige", "Ikea", "Milton", "Borosil"],
    5: ["Decathlon", "Nike", "Adidas", "Puma", "Yonex"],
    6: ["Nivea", "Loreal", "Himalaya", "Dove", "Neutrogena"],
    7: ["Lego", "Hasbro", "Mattel", "Funskool"],
    8: ["Bosch", "Michelin", "3M", "Castrol", "Shell"],
}

PRICE_RANGES = {
    1: (500.0, 150000.0),
    2: (200.0, 15000.0),
    3: (100.0, 5000.0),
    4: (300.0, 50000.0),
    5: (500.0, 30000.0),
    6: (100.0, 10000.0),
    7: (200.0, 20000.0),
    8: (500.0, 100000.0),
}

CATEGORY_PRODUCT_TYPES = {
    1: [
        "Wireless Headphones",
        "Noise Cancelling Headphones",
        "Bluetooth Earbuds",
        "Gaming Headset",
        "Laptop",
        "Smartphone",
        "Tablet",
        "Smartwatch",
        "Bluetooth Speaker",
        "Webcam",
    ],
    2: [
        "T-Shirt",
        "Jeans",
        "Hoodie",
        "Jacket",
        "Sneakers",
        "Running Shorts",
        "Dress",
        "Kurta",
    ],
    3: [
        "Fiction Book",
        "Programming Guide",
        "Biography",
        "Cookbook",
        "Science Book",
        "History Book",
    ],
    4: [
        "Mixer Grinder",
        "Air Fryer",
        "Cookware Set",
        "Vacuum Cleaner",
        "Water Purifier",
        "Desk Lamp",
    ],
    5: [
        "Yoga Mat",
        "Dumbbell Set",
        "Football",
        "Cricket Bat",
        "Trekking Backpack",
        "Cycling Helmet",
    ],
    6: [
        "Face Wash",
        "Moisturizer",
        "Sunscreen",
        "Hair Serum",
        "Vitamin Supplement",
        "Body Lotion",
    ],
    7: [
        "Building Blocks",
        "Board Game",
        "Remote Control Car",
        "Puzzle",
        "Action Figure",
    ],
    8: ["Car Vacuum", "Tyre Inflator", "Engine Oil", "Dash Cam", "Car Cover"],
}

COMMON_COLORS = ["Black", "White", "Blue", "Red", "Grey"]


def _iso_date_within_last_year() -> str:
    dt = datetime.now() - timedelta(days=RNG.randint(1, 365))
    return dt.replace(microsecond=0).isoformat()


def _description(cat_name: str, brand: str, product_type: str, model: str) -> str:
    base = (
        f"{brand} {product_type} {model} built for everyday use in the {cat_name} category. "
        f"This product focuses on reliable performance, durable construction, and comfortable long-session usage. "
        f"It offers modern features, dependable quality, and strong value for shoppers comparing options in {cat_name}."
    )
    if (
        "Headphone" in product_type
        or "Earbud" in product_type
        or "Headset" in product_type
    ):
        base += " Designed for immersive audio with clear vocals, punchy bass, wireless connectivity, and all-day comfort."
    return base


def _specifications(category_id: int, product_type: str) -> list[dict[str, str]]:
    specs = [
        {"spec_key": "color", "spec_value": RNG.choice(COMMON_COLORS)},
        {"spec_key": "warranty", "spec_value": RNG.choice(["1 Year", "2 Years"])},
        {
            "spec_key": "material",
            "spec_value": RNG.choice(["Premium", "Alloy", "Polymer"]),
        },
        {"spec_key": "model_year", "spec_value": str(RNG.randint(2021, 2026))},
    ]

    if category_id == 1:
        specs.extend(
            [
                {
                    "spec_key": "connectivity",
                    "spec_value": RNG.choice(
                        ["Bluetooth 5.2", "Bluetooth 5.3", "Wired USB-C"]
                    ),
                },
                {
                    "spec_key": "battery_life",
                    "spec_value": f"{RNG.randint(18, 50)} hours",
                },
                {
                    "spec_key": "audio_profile",
                    "spec_value": RNG.choice(["Balanced", "Bass Boost", "Studio"]),
                },
                {"spec_key": "device_type", "spec_value": product_type},
            ]
        )
    else:
        specs.extend(
            [
                {"spec_key": "weight", "spec_value": f"{RNG.randint(120, 1800)}g"},
                {
                    "spec_key": "size",
                    "spec_value": RNG.choice(["S", "M", "L", "XL", "One Size"]),
                },
            ]
        )
    return specs


def generate_products() -> list[dict]:
    products: list[dict] = []
    pid = 1

    for cat in CATEGORIES:
        cat_id = cat["id"]
        cat_name = cat["name"]
        count = CATEGORY_COUNTS[cat_id]
        brands = BRANDS_BY_CATEGORY[cat_id]
        product_types = CATEGORY_PRODUCT_TYPES[cat_id]
        price_min, price_max = PRICE_RANGES[cat_id]

        for i in range(count):
            brand = RNG.choice(brands)
            product_type = product_types[i % len(product_types)]
            model = f"{RNG.choice(['X', 'Pro', 'Max', 'Lite'])}-{RNG.randint(100, 999)}"
            name = f"{brand} {product_type} {model}"

            products.append(
                {
                    "id": pid,
                    "category_id": cat_id,
                    "name": name,
                    "description": _description(cat_name, brand, product_type, model),
                    "brand": brand,
                    "price": round(RNG.uniform(price_min, price_max), 2),
                    "stock": RNG.randint(0, 120),
                    "rating": round(RNG.uniform(1.0, 5.0), 1),
                    "image_url": f"https://example.com/images/prod_{pid}.jpg",
                    "is_active": True,
                    "created_at": _iso_date_within_last_year(),
                    "specifications": _specifications(cat_id, product_type),
                }
            )
            pid += 1

    return products


def _make_judgments(
    products: list[dict], desired_terms: tuple[str, ...], max_items: int = 6
) -> list[dict]:
    wanted = [
        p
        for p in products
        if any(
            term.lower() in (p["name"] + " " + p["description"]).lower()
            for term in desired_terms
        )
    ]
    if not wanted:
        return []

    picks = wanted[: max_items * 2] if len(wanted) > max_items * 2 else wanted
    RNG.shuffle(picks)
    picks = picks[:max_items]

    judgments = []
    for idx, p in enumerate(picks):
        relevance = 3 if idx < 2 else (2 if idx < 4 else 1)
        judgments.append({"product_id": p["id"], "relevance": relevance})
    return judgments


def _meets_constraints(
    product: dict,
    *,
    category_id: int | None,
    min_price: float | None,
    max_price: float | None,
) -> bool:
    if category_id is not None and product["category_id"] != category_id:
        return False
    price = float(product["price"])
    if min_price is not None and price < min_price:
        return False
    if max_price is not None and price > max_price:
        return False
    return True


def _contains_any_term(product: dict, desired_terms: tuple[str, ...]) -> bool:
    hay = (product["name"] + " " + product["description"]).lower()
    return any(term.lower() in hay for term in desired_terms)


def _build_constraint_valid_judgments(
    products: list[dict],
    *,
    category_name: str | None,
    min_price: float | None,
    max_price: float | None,
    desired_terms: tuple[str, ...],
) -> list[dict]:
    category_id = None
    if category_name is not None:
        category_id = next(
            (c["id"] for c in CATEGORIES if c["name"] == category_name), None
        )

    constrained = [
        p
        for p in products
        if _meets_constraints(
            p,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
        )
    ]
    constrained.sort(key=lambda p: p["id"])

    positives = [p for p in constrained if _contains_any_term(p, desired_terms)]
    negatives_in_constraints = [
        p for p in constrained if not _contains_any_term(p, desired_terms)
    ]
    violating_constraints = [
        p
        for p in products
        if not _meets_constraints(
            p,
            category_id=category_id,
            min_price=min_price,
            max_price=max_price,
        )
    ]
    violating_constraints.sort(key=lambda p: p["id"])

    selected_positive = positives[:6]
    if len(selected_positive) < 6:
        selected_positive.extend(positives[6:6])

    judgments: list[dict] = []
    for idx, product in enumerate(selected_positive):
        if idx < 2:
            rel = 3
        elif idx < 4:
            rel = 2
        else:
            rel = 1
        judgments.append({"product_id": product["id"], "relevance": rel})

    used_ids = {j["product_id"] for j in judgments}

    # Add explicit non-relevant examples. First from in-constraint but off-intent,
    # then from constraint-violating products.
    for product in negatives_in_constraints:
        if product["id"] not in used_ids:
            judgments.append({"product_id": product["id"], "relevance": 0})
            used_ids.add(product["id"])
        if sum(1 for j in judgments if j["relevance"] == 0) >= 2:
            break

    for product in violating_constraints:
        if product["id"] not in used_ids:
            judgments.append({"product_id": product["id"], "relevance": 0})
            used_ids.add(product["id"])
        if sum(1 for j in judgments if j["relevance"] == 0) >= 3:
            break

    # Guarantee at least one relevant and one non-relevant label per query.
    if not any(j["relevance"] >= 1 for j in judgments) and constrained:
        judgments.append({"product_id": constrained[0]["id"], "relevance": 1})
    if not any(j["relevance"] == 0 for j in judgments):
        fallback_pool = violating_constraints + negatives_in_constraints + constrained
        for product in fallback_pool:
            if product["id"] not in used_ids:
                judgments.append({"product_id": product["id"], "relevance": 0})
                break

    return judgments


def generate_queries(products: list[dict]) -> list[dict]:
    query_templates = [
        {
            "query_text": "wireless headphones",
            "category": None,
            "min_price": None,
            "max_price": None,
            "notes": "Should prioritize headphone and earbud products",
            "desired_terms": ("headphone", "earbud", "headset"),
        },
        {
            "query_text": "wireless headphones under 30000",
            "category": "Electronics",
            "min_price": None,
            "max_price": 30000.0,
            "notes": "Price-constrained headphone search",
            "desired_terms": ("headphone", "earbud", "headset"),
        },
        {
            "query_text": "electronics under 3000",
            "category": "Electronics",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained electronics",
            "desired_terms": (
                "electronics",
                "speaker",
                "webcam",
                "headphone",
                "earbud",
            ),
        },
        {
            "query_text": "clothing under 3000",
            "category": "Clothing & Apparel",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained clothing",
            "desired_terms": ("t-shirt", "jeans", "hoodie", "jacket", "dress", "kurta"),
        },
        {
            "query_text": "noise cancelling headphones",
            "category": None,
            "min_price": None,
            "max_price": None,
            "notes": "ANC-focused headphone intent",
            "desired_terms": ("noise cancelling", "headphone", "earbud"),
        },
        {
            "query_text": "books under 3000",
            "category": "Books",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained books",
            "desired_terms": (
                "book",
                "guide",
                "biography",
                "cookbook",
                "history",
                "science",
            ),
        },
        {
            "query_text": "home under 3000",
            "category": "Home & Kitchen",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained home products",
            "desired_terms": (
                "mixer",
                "air fryer",
                "cookware",
                "vacuum",
                "lamp",
                "purifier",
            ),
        },
        {
            "query_text": "sports under 3000",
            "category": "Sports & Outdoors",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained sports products",
            "desired_terms": (
                "yoga",
                "dumbbell",
                "football",
                "cricket",
                "helmet",
                "backpack",
            ),
        },
        {
            "query_text": "health under 3000",
            "category": "Health & Beauty",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained health products",
            "desired_terms": (
                "face wash",
                "moisturizer",
                "sunscreen",
                "serum",
                "vitamin",
                "lotion",
            ),
        },
        {
            "query_text": "toys under 3000",
            "category": "Toys & Games",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained toys",
            "desired_terms": (
                "blocks",
                "board game",
                "puzzle",
                "action figure",
                "remote control",
            ),
        },
        {
            "query_text": "automotive under 3000",
            "category": "Automotive",
            "min_price": None,
            "max_price": 3000.0,
            "notes": "Category and price constrained automotive products",
            "desired_terms": ("car", "tyre", "engine", "dash", "cover", "vacuum"),
        },
    ]

    queries: list[dict] = []
    qid = 1
    for tpl in query_templates:
        judgments = _build_constraint_valid_judgments(
            products,
            category_name=tpl["category"],
            min_price=tpl["min_price"],
            max_price=tpl["max_price"],
            desired_terms=tpl["desired_terms"],
        )
        queries.append(
            {
                "id": qid,
                "query_text": tpl["query_text"],
                "category": tpl["category"],
                "min_price": tpl["min_price"],
                "max_price": tpl["max_price"],
                "notes": tpl["notes"],
                "judgments": judgments,
            }
        )
        qid += 1

    return queries


if __name__ == "__main__":
    products = generate_products()
    queries = generate_queries(products)

    with open("app/data/seed_products.json", "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2)

    with open("app/data/eval_queries.json", "w", encoding="utf-8") as f:
        json.dump(queries, f, indent=2)

    print("Seed JSON files generated successfully.")
