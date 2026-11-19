"""
RAG Recipe & Meal Bundle Planner Module.
Performs cross-department multi-entity retrieval to find all required ingredients
for recipes, dietary plans, and senior wellness meals.
Includes 20 Authentic Tamil Nadu Recipe Bundles with bilingual titles (English & Tamil),
high-resolution dish imagery, exact supermarket product linking (PRD IDs),
bundle pricing, stock verification, and optimized aisle walking sequence.
"""
from backend.database import get_product_by_id, search_products_sql
from backend.rag.retriever import ProductRetriever
import re

# Standard Base Recipe Portions for 4 Servings
# Maps product_id -> (base_portion_value, unit, display_name)
# For items sold in 500g, 1kg, 1L, etc., this sets the exact recipe portion
# e.g. Carrots (500g in store) -> 100g in recipe portion!
# Green Peas (500g in store) -> 100g in recipe portion!
# Sunflower Oil (1L in store) -> 60ml in recipe portion!
PORTION_TABLE = {
    # Staples (Rice, Flours, Grains)
    'PRD001': (350.0, 'g', '350g'),  # Basmati Rice
    'PRD002': (350.0, 'g', '350g'),
    'PRD003': (350.0, 'g', '350g'),  # Ponni Boiled Rice
    'PRD004': (350.0, 'g', '350g'),  # Sona Masoori
    'PRD005': (350.0, 'g', '350g'),  # Brown Rice
    'PRD009': (300.0, 'g', '300g'),  # Atta
    'PRD010': (300.0, 'g', '300g'),
    'PRD011': (300.0, 'g', '300g'),
    'PRD012': (200.0, 'g', '200g'),  # Maida
    'PRD081': (300.0, 'g', '300g'),  # Atta
    'PRD082': (350.0, 'g', '350g'),  # Idli Rice
    'PRD083': (350.0, 'g', '350g'),  # Dosa Rice
    'PRD114': (250.0, 'g', '250g'),  # Rava (Sooji)
    'PRD111': (50.0, 'g', '50g'),    # Corn Flour
    'PRD112': (100.0, 'g', '100g'),  # Rice Flour

    # Dal & Lentils
    'PRD073': (150.0, 'g', '150g'),  # Toor Dal
    'PRD071': (100.0, 'g', '100g'),  # Urad Dal
    'PRD072': (50.0, 'g', '50g'),    # Chana Dal
    'PRD119': (100.0, 'g', '100g'),  # Roasted Gram
    'PRD078': (60.0, 'g', '60g'),    # Groundnuts

    # Fresh Vegetables - 100g / 200g Adjustments!
    'PRD043': (200.0, 'g', '200g'),  # Potato (approx 2 pcs)
    'PRD044': (200.0, 'g', '200g'),  # Onion (approx 2 pcs)
    'PRD045': (200.0, 'g', '200g'),  # Tomato (approx 2 pcs)
    'PRD046': (100.0, 'g', '100g'),  # Carrot (Adjusted from 500g store pack!)
    'PRD120': (100.0, 'g', '100g'),  # French Beans (Adjusted from 250g pack!)
    'PRD047': (100.0, 'g', '100g'),  # Green Peas (Adjusted from 500g pack!)
    'PRD048': (100.0, 'g', '100g'),  # Spinach (Palak)
    'PRD086': (100.0, 'g', '100g'),  # Cabbage (Adjusted from 500g pack!)
    'PRD087': (100.0, 'g', '100g'),  # Capsicum (1 pc)
    'PRD106': (150.0, 'g', '150g'),  # Cauliflower
    'PRD084': (100.0, 'g', '100g'),  # Drumstick
    'PRD085': (150.0, 'g', '150g'),  # Brinjal
    'PRD107': (150.0, 'g', '150g'),  # Fresh Button Mushroom

    # Cooking Oils & Ghee (Adjusted from 1L / 500ml packs!)
    'PRD013': (60.0, 'ml', '60ml'),  # Sunflower Oil (Adjusted from 1L pack!)
    'PRD014': (60.0, 'ml', '60ml'),
    'PRD015': (60.0, 'ml', '60ml'),
    'PRD016': (50.0, 'ml', '50ml'),  # Coconut Oil
    'PRD017': (50.0, 'ml', '50ml'),
    'PRD018': (40.0, 'ml', '40ml'),  # Olive Oil
    'PRD019': (40.0, 'g', '40g'),    # Amul Pure Cow Ghee
    'PRD115': (50.0, 'ml', '50ml'),  # Desi Ghee
    'PRD102': (40.0, 'g', '40g'),    # Butter

    # Dairy, Poultry & Proteins
    'PRD020': (100.0, 'ml', '100ml'), # Milk (Adjusted from 500ml pack)
    'PRD021': (100.0, 'ml', '100ml'),
    'PRD022': (100.0, 'ml', '100ml'), # Almond Milk
    'PRD065': (100.0, 'g', '100g'),   # Curd (Adjusted from 400g pack)
    'PRD103': (50.0, 'ml', '50ml'),   # Fresh Cream
    'PRD105': (200.0, 'g', '200g'),   # Paneer (Full 200g pack for 4)
    'PRD108': (500.0, 'g', '500g'),   # Fresh Chicken (Full 500g pack for 4)
    'PRD109': (500.0, 'g', '500g'),   # Fresh Fish (500g pack)
    'PRD110': (4.0, 'pcs', '4 pcs'),  # Eggs (4 eggs from 12-pack)
    'PRD025': (4.0, 'pcs', '4 pcs'),

    # Aromatics, Herbs & Roots
    'PRD061': (20.0, 'g', '20g'),    # Green Chilli
    'PRD062': (30.0, 'g', '30g'),    # Ginger Garlic Paste
    'PRD063': (25.0, 'g', '25g'),    # Mint Leaves
    'PRD064': (25.0, 'g', '25g'),    # Coriander Leaves
    'PRD076': (10.0, 'g', '10g'),    # Curry Leaves
    'PRD088': (30.0, 'g', '30g'),    # Spring Onion
    'PRD089': (25.0, 'g', '25g'),    # Fresh Garlic
    'PRD122': (25.0, 'g', '25g'),    # Fresh Ginger

    # Spices & Seasonings
    'PRD066': (20.0, 'g', '20g'),    # Biryani Masala
    'PRD067': (10.0, 'g', '10g'),    # Turmeric Powder
    'PRD068': (15.0, 'g', '15g'),    # Chilli Powder
    'PRD069': (20.0, 'g', '20g'),    # Sambar Masala
    'PRD093': (15.0, 'g', '15g'),    # Garam Masala
    'PRD095': (15.0, 'g', '15g'),    # Coriander Powder
    'PRD092': (10.0, 'g', '10g'),    # Pepper Powder
    'PRD094': (10.0, 'g', '10g'),    # Cumin Seeds
    'PRD070': (10.0, 'g', '10g'),    # Mustard Seeds
    'PRD075': (10.0, 'g', '10g'),    # Fenugreek Seeds
    'PRD077': (5.0, 'g', '5g'),      # Hing (Asafoetida)
    'PRD113': (10.0, 'g', '10g'),    # Fennel Seeds
    'PRD096': (5.0, 'g', '5g'),      # Cinnamon Sticks
    'PRD097': (5.0, 'g', '5g'),      # Cloves
    'PRD098': (5.0, 'g', '5g'),      # Bay Leaf
    'PRD117': (10.0, 'g', '10g'),    # Cardamom Powder
    'PRD104': (10.0, 'g', '10g'),    # Kasuri Methi
    'PRD074': (30.0, 'g', '30g'),    # Tamarind
    'PRD121': (20.0, 'g', '20g'),    # Tata Salt (20g portion!)

    # Dry Fruits, Sugars & Condiments
    'PRD080': (1.0, 'pcs', '1 pc'),  # Lemon (1 pc from 4 pcs pack)
    'PRD099': (0.5, 'pcs', '0.5 pc'),# Coconut (half coconut)
    'PRD079': (150.0, 'g', '150g'),  # Pomegranate
    'PRD090': (25.0, 'ml', '25ml'),  # Soy Sauce
    'PRD091': (25.0, 'ml', '25ml'),  # Green Chilli Sauce
    'PRD100': (20.0, 'g', '20g'),    # Poppy Seeds
    'PRD101': (40.0, 'g', '40g'),    # Cashew Nuts
    'PRD116': (40.0, 'g', '40g'),    # Raisins
    'PRD006': (180.0, 'g', '180g'),  # Sugar
    'PRD008': (100.0, 'g', '100g'),  # Jaggery
    'PRD118': (2.0, 'g', '2g'),      # Food Colour
    'PRD123': (500.0, 'ml', '500ml'),# Water
    'PRD049': (200.0, 'g', '200g'),  # Apple
    'PRD050': (2.0, 'pcs', '2 pcs'), # Banana
    'PRD031': (100.0, 'g', '100g')   # Digestive Biscuits
}

def parse_package_numeric(qty_str):
    """Extracts numeric capacity and unit from package quantity string (e.g. 500g -> 500, 'g')."""
    s = str(qty_str).lower().strip()
    if 'kg' in s:
        m = re.search(r'([\d\.]+)', s)
        val = float(m.group(1)) if m else 1.0
        return val * 1000.0, 'g'
    elif 'g' in s and 'kg' not in s:
        m = re.search(r'([\d\.]+)', s)
        val = float(m.group(1)) if m else 100.0
        return val, 'g'
    elif 'l' in s and 'ml' not in s:
        m = re.search(r'([\d\.]+)', s)
        val = float(m.group(1)) if m else 1.0
        return val * 1000.0, 'ml'
    elif 'ml' in s:
        m = re.search(r'([\d\.]+)', s)
        val = float(m.group(1)) if m else 100.0
        return val, 'ml'
    elif 'pc' in s:
        m = re.search(r'([\d\.]+)', s)
        val = float(m.group(1)) if m else 1.0
        return val, 'pcs'
    return 100.0, 'g'

RECIPE_TEMPLATES = {
    # ─────────────────────────────────────────────────────────────
    # 20 AUTHENTIC TAMIL RECIPE BUNDLES (RB001 - RB020)
    # ─────────────────────────────────────────────────────────────
    "biryani": {
        "bundle_id": "RB001",
        "title": "Vegetable Biryani",
        "title_tamil": "காய்கறி பிரியாணி",
        "category": "Vegetarian",
        "icon": "🍲",
        "image_url": "https://images.openai.com/static-rsc-4/aDERj8MgzxyFsUH4mN50afGW6eCkHwZ5Fct6KHTLhIoDsHqPgU1HXiMQMrpXfbfEUqdOkBTSwT6M_50yTt5By9hJNHLJz_oyHduk7Rj1BMgnj2uqEmo-JxsNZL9O7vB8gF-VHmio1pCRTm6TxLj1vG-edD1ZMTzKv8CfRLMbUE_AKBEJbQrxEWRAATJHkQGq?purpose=fullsize",
        "description": "Fragrant and wholesome Tamil Nadu style vegetable biryani packed with fresh garden vegetables, aromatic basmati rice, mint leaves, and authentic biryani masala.",
        "servings": "4 Servings",
        "prep_time": "35 mins",
        "product_ids": [
            "PRD001", "PRD046", "PRD120", "PRD047", "PRD043", "PRD044", "PRD045",
            "PRD061", "PRD062", "PRD063", "PRD064", "PRD065", "PRD066", "PRD067",
            "PRD068", "PRD013", "PRD121"
        ],
        "ingredients": ["basmati rice", "carrot", "beans", "green peas", "potato", "onion", "tomato", "green chilli", "ginger garlic paste", "mint leaves", "coriander leaves", "curd", "biryani masala", "turmeric powder", "chilli powder", "cooking oil", "salt"],
        "instructions": [
            "Wash and soak Daawat Rozana Basmati Rice (Aisle 1) for 20 minutes.",
            "Heat 3 tbsp Fortune Sunlite Sunflower Oil (Aisle 2) in a heavy-bottom pot.",
            "Sauté sliced onions, green chillies, and ginger garlic paste until golden brown.",
            "Add chopped tomatoes, mint leaves, coriander leaves, curd, biryani masala, turmeric, and chilli powder.",
            "Mix in diced carrots, beans, potatoes, and green peas (Aisle 5) with salt.",
            "Layer soaked rice with vegetables, add 1.5 cups water, cover tightly, and simmer on low flame for 15 minutes."
        ]
    },
    "chicken_biryani": {
        "bundle_id": "RB002",
        "title": "Chicken Biryani",
        "title_tamil": "சிக்கன் பிரியாணி",
        "category": "Non-Vegetarian",
        "icon": "🍗",
        "image_url": "https://images.openai.com/static-rsc-4/dZ6Q8CCV7Lktc7zHjU4pFqT2muOFmRnzFAVth74uj_LC7Gzoqw32soV_InbulkLWtNGJqezx0k6VkseC8op02X7z1ZSHLb7B5AvnZx1GaSdAeR8L-SzktkCEiJqh295SB1H7uqUu2aX9IfIFjFvoJDWEaW-PVKnkmIuROYbdDajPKLldjReP00gpzHmm-4yE?purpose=fullsize",
        "description": "Celebrated Chennai & Ambur style chicken dum biryani prepared with fresh chicken, aged basmati rice, curd, whole spices, and zesty lemon.",
        "servings": "4-5 Servings",
        "prep_time": "45 mins",
        "product_ids": [
            "PRD001", "PRD108", "PRD044", "PRD045", "PRD061", "PRD062", "PRD063",
            "PRD064", "PRD065", "PRD080", "PRD066", "PRD068", "PRD067", "PRD096",
            "PRD097", "PRD098", "PRD013", "PRD121"
        ],
        "ingredients": ["basmati rice", "chicken", "onion", "tomato", "green chilli", "ginger garlic paste", "mint leaves", "coriander leaves", "curd", "lemon", "biryani masala", "chilli powder", "turmeric powder", "cinnamon", "cloves", "bay leaf", "cooking oil", "salt"],
        "instructions": [
            "Marinate Fresh Chicken (Aisle 6) with curd, ginger garlic paste, chilli powder, turmeric, biryani masala, lemon juice, and salt for 30 minutes.",
            "In a biryani handi, heat Sunflower Oil (Aisle 2) and fry cinnamon, cloves, and bay leaf.",
            "Sauté sliced onions until golden, followed by green chillies, mint, and coriander leaves.",
            "Add marinated chicken and chopped tomatoes; cook on medium flame for 12 minutes until gravy thickens.",
            "Parboil soaked Basmati Rice (Aisle 1) to 70% doneness.",
            "Layer rice over chicken gravy, seal the lid with dum cloth/foil, and cook on low heat for 20 minutes."
        ]
    },
    "sambar": {
        "bundle_id": "RB003",
        "title": "Traditional Kalyana Veetu Sambar",
        "title_tamil": "சாம்பார்",
        "category": "Vegetarian",
        "icon": "🥘",
        "image_url": "https://images.openai.com/static-rsc-4/XKnIRQ8G6KyW73w8aixQBD8kzEViPMdqDJJ4Jncb8HOpETgIuih8Cu8uzMy0POMDRFx9zCjE52-ql8bd61u2bVbbgDnMMOhMA2tXnk1HINgOB4GyITP-g2w1u7bamx_hBs-VHZ-DgTCoSzJJ01cnmZHdM1VJJZd7kohcoZyOs4nOfr3532gVUSgIwhkjHFUV?purpose=fullsize",
        "description": "Authentic Tamil wedding-style Sambar cooked with yellow toor dal, fresh drumstick, brinjal, carrots, tamarind pulp, and aromatic tempering.",
        "servings": "4 Servings",
        "prep_time": "30 mins",
        "product_ids": [
            "PRD073", "PRD084", "PRD085", "PRD046", "PRD045", "PRD044", "PRD074",
            "PRD061", "PRD069", "PRD067", "PRD070", "PRD075", "PRD076", "PRD064",
            "PRD013", "PRD121"
        ],
        "ingredients": ["toor dal", "drumstick", "brinjal", "carrot", "tomato", "onion", "tamarind", "green chilli", "sambar powder", "turmeric powder", "mustard seeds", "fenugreek seeds", "curry leaves", "coriander leaves", "cooking oil", "salt"],
        "instructions": [
            "Pressure cook Toor Dal (Aisle 1) with turmeric powder until soft and mashable.",
            "Extract tamarind juice from Tamarind block (Aisle 4).",
            "In a pot, boil drumstick, brinjal, carrots, onions, tomatoes, and green chillies in tamarind water with sambar powder and salt.",
            "Add mashed dal and simmer for 8 minutes until vegetables are tender.",
            "Heat oil in a small pan, temper mustard seeds, fenugreek seeds, and fresh curry leaves; pour over hot sambar.",
            "Garnish with freshly chopped coriander leaves."
        ]
    },
    "tomato_rice": {
        "bundle_id": "RB004",
        "title": "Tomato Rice (Thakkali Sadam)",
        "title_tamil": "தக்காளி சாதம்",
        "category": "Vegetarian",
        "icon": "🍅",
        "image_url": "https://images.openai.com/static-rsc-4/lEveyyPsOSRJePc9khRip6DJFTwqtgJN44c4kxn4jb_isO5v_T2CtvTKbqYKi6WkPLCJysNbXmJ342WYphb_zHfL1_h8aw0nM3r3OxOMRfktwzWal8ew36j-ShCsnglII1Hids7-G9_8WEAiFcEX0UsTAlr_QUlW2brLFU7U_AevEMlGGDRdpNbjTzU6_t7Y?purpose=fullsize",
        "description": "Tangy and spicy South Indian tomato rice tempered with mustard, urad dal, curry leaves, and garam masala.",
        "servings": "3 Servings",
        "prep_time": "25 mins",
        "product_ids": [
            "PRD003", "PRD045", "PRD044", "PRD061", "PRD062", "PRD070", "PRD071",
            "PRD072", "PRD076", "PRD067", "PRD068", "PRD093", "PRD013", "PRD121"
        ],
        "ingredients": ["rice", "tomato", "onion", "green chilli", "ginger garlic paste", "mustard seeds", "urad dal", "chana dal", "curry leaves", "turmeric powder", "chilli powder", "garam masala", "cooking oil", "salt"],
        "instructions": [
            "Cook Ponni Boiled Rice (Aisle 1) and spread on a plate to cool slightly.",
            "Heat oil in a pan, temper mustard seeds, urad dal, chana dal, and curry leaves.",
            "Add chopped onions, green chillies, and ginger garlic paste; sauté until onions turn translucent.",
            "Add finely chopped tomatoes, turmeric, chilli powder, garam masala, and salt. Cook until oil separates.",
            "Gently fold in the cooked rice until every grain is coated with the tomato gravy. Serve with papad or raita."
        ]
    },
    "lemon_rice": {
        "bundle_id": "RB005",
        "title": "Lemon Rice (Elumichai Sadam)",
        "title_tamil": "எலுமிச்சை சாதம்",
        "category": "Vegetarian",
        "icon": "🍋",
        "image_url": "https://images.openai.com/static-rsc-4/2m2xRiWAEMp6CTh7RKLJoFXHQLaSCZymTs3kNgDM-BR5z3ebufBPZkgsRg1idjaA5PBmqVyyZcYZcdcJthUoxF-AVdomTTHMsCjp014fWIV13EBsZzTuMSqAgZ884yiQ10HQIXCHaHKphOOBeauRTEyFIL5MM6gy06iuBsPLuro1e9WKYkg5XghW2ERWegeN?purpose=fullsize",
        "description": "Classic Tamil variety rice with zesty fresh lemon juice, crunchy roasted peanuts, green chillies, and asafoetida tempering.",
        "servings": "3 Servings",
        "prep_time": "15 mins",
        "product_ids": [
            "PRD003", "PRD080", "PRD061", "PRD078", "PRD070", "PRD071", "PRD072",
            "PRD076", "PRD067", "PRD077", "PRD013", "PRD121"
        ],
        "ingredients": ["rice", "lemon", "green chilli", "groundnuts", "mustard seeds", "urad dal", "chana dal", "curry leaves", "turmeric powder", "asafoetida", "cooking oil", "salt"],
        "instructions": [
            "Cook Ponni Boiled Rice (Aisle 1) soft and cool to room temperature.",
            "Heat 2 tbsp oil in a kadai. Add mustard seeds, urad dal, chana dal, and roasted groundnuts (Aisle 3).",
            "Add slit green chillies, curry leaves, turmeric powder, and a generous pinch of asafoetida (Aisle 4).",
            "Turn off flame and let oil cool for 1 minute, then squeeze in fresh lemon juice (Aisle 5) and salt.",
            "Pour the tempering over cooked rice and mix gently with a spoon. Ideal for travel or lunchbox."
        ]
    },
    "curd_rice": {
        "bundle_id": "RB006",
        "title": "Curd Rice (Thayir Sadam)",
        "title_tamil": "தயிர் சாதம்",
        "category": "Vegetarian",
        "icon": "🍚",
        "image_url": "https://images.openai.com/static-rsc-4/8zvGpLFtMiqYb4AH6gwlk1eAt7F4Ix6-LkYuvTSm061ASj0c2IMKafltCkmaZeqmVEAjfIdXVDhZZwVFShxoVUN6_oxmlnubmDx3xKPL3YIs7wGExcc8mu6WM0UML9fcs20fK-I2lpYfBaPUPEYym9Ml5ANHIYybBBf6ECc4P4iGB7LRSMgqHK1SOVG2vwMN?purpose=fullsize",
        "description": "Cooling and gut-friendly South Indian comfort meal made with freshly mashed rice, thick curd, warm milk, ruby pomegranate pearls, and mustard tempering.",
        "servings": "3 Servings",
        "prep_time": "10 mins",
        "product_ids": [
            "PRD003", "PRD065", "PRD020", "PRD079", "PRD061", "PRD122", "PRD070",
            "PRD071", "PRD076", "PRD064", "PRD013", "PRD121"
        ],
        "ingredients": ["rice", "curd", "milk", "pomegranate", "green chilli", "ginger", "mustard seeds", "urad dal", "curry leaves", "coriander leaves", "cooking oil", "salt"],
        "instructions": [
            "Overcook Ponni Boiled Rice until very soft, then mash thoroughly with a potato masher.",
            "Mix in fresh thick Curd (Aisle 2) and a splash of Milk (Aisle 2) with salt.",
            "Heat 1 tsp oil; temper mustard seeds, urad dal, curry leaves, minced green chillies, and finely grated ginger (Aisle 5).",
            "Pour seasoning over the curd rice and mix well.",
            "Garnish generously with fresh pomegranate arils (Aisle 5) and chopped coriander."
        ]
    },
    "veg_fried_rice": {
        "bundle_id": "RB007",
        "title": "Vegetable Fried Rice",
        "title_tamil": "வெஜிடபிள் ஃப்ரைட் ரைஸ்",
        "category": "Vegetarian",
        "icon": "🥢",
        "image_url": "https://images.openai.com/static-rsc-4/aldWgKpTkznBqjPf-D9lllpkE7v1GIpG413CHlrXFlkHTxUTkumE2AgAnaM830ABRTNn1abOvX6H7QYV7SmGA5MQV5sCrkt4L_PHJb3HGgIjEBn7FbzQFE7OwbdrXm7daWrzB0336z8VWB8V5QC4oS2_4OI5r5jsfyjQ6qOQt8l_HtKWimV5za0qWcaEVf15?purpose=fullsize",
        "description": "Indo-Chinese street style tossed vegetable fried rice packed with colorful crunchy carrots, french beans, cabbage, capsicum, and savory soy sauce.",
        "servings": "4 Servings",
        "prep_time": "20 mins",
        "product_ids": [
            "PRD001", "PRD046", "PRD120", "PRD086", "PRD087", "PRD088", "PRD089",
            "PRD090", "PRD091", "PRD092", "PRD013", "PRD121"
        ],
        "ingredients": ["rice", "carrot", "beans", "cabbage", "capsicum", "spring onion", "garlic", "soy sauce", "green chilli sauce", "pepper powder", "cooking oil", "salt"],
        "instructions": [
            "Cook Basmati Rice (Aisle 1) al dente and spread to cool completely.",
            "In a hot wok, heat oil on high flame and sauté minced garlic (Aisle 5) for 30 seconds.",
            "Add finely chopped carrots, beans, cabbage, and capsicum (Aisle 5); toss rapidly on high heat for 3 minutes keeping vegetables crunchy.",
            "Add soy sauce, green chilli sauce (Aisle 3), salt, and black pepper powder.",
            "Add cold cooked rice and toss vigorously to combine.",
            "Garnish with chopped spring onion greens and serve hot with chilli vinegar."
        ]
    },
    "poori_masala": {
        "bundle_id": "RB008",
        "title": "Poori Masala (Kizhangu)",
        "title_tamil": "பூரி மசாலா",
        "category": "Breakfast",
        "icon": "🫓",
        "image_url": "https://images.openai.com/static-rsc-4/YJSuCeCIS34C7mrj0deLNT3UpNFHfpjazd5ZaLgePuLZ4jE4_ycBwzcv59Ag4fNbEEyrSyOwQc3_O1-OjGVf04G27GK9Fn_kKNVS98kfoo-v65iJxVrpbtiTnMTNZi2e4jqpdjHfJYiP4XfUZkGbogxtCxj3jtxndA0hYC1cmMLafMYu_sNVC1lSYLlGbXDO?purpose=fullsize",
        "description": "Fluffy golden puffed whole wheat pooris paired with yellow hotel-style potato onion masala curry.",
        "servings": "4 Servings",
        "prep_time": "25 mins",
        "product_ids": [
            "PRD009", "PRD043", "PRD044", "PRD061", "PRD122", "PRD070", "PRD071",
            "PRD072", "PRD067", "PRD076", "PRD064", "PRD013", "PRD121"
        ],
        "ingredients": ["wheat flour", "potato", "onion", "green chilli", "ginger", "mustard seeds", "urad dal", "chana dal", "turmeric powder", "curry leaves", "coriander leaves", "cooking oil", "salt"],
        "instructions": [
            "Boil Farm Fresh Potatoes (Aisle 5), peel and mash roughly with fingers.",
            "Knead Chakki Fresh Atta (Aisle 1) with water, salt, and 1 tsp oil into a firm dough; roll into small discs and deep fry in hot oil until puffed.",
            "For potato masala: heat oil, splutter mustard seeds, urad dal, and chana dal.",
            "Sauté sliced onions, slit green chillies, ginger, curry leaves, and turmeric powder.",
            "Add mashed potatoes, 1 cup water, and salt; simmer for 5 minutes until thickened.",
            "Garnish with coriander leaves and serve alongside hot puffed pooris."
        ]
    },
    "idli_sambar": {
        "bundle_id": "RB009",
        "title": "Idli Sambar Bundle",
        "title_tamil": "இட்லி சாம்பார்",
        "category": "Breakfast",
        "icon": "🥞",
        "image_url": "https://images.openai.com/static-rsc-4/tQ6JmFVh07F6m-nlL44_TusJ7G7AWTYmqFas8zzi3UbJQGBiqTG2Lyncfqs1YxbHpcxvNlwtUfBf4N5BzIynJMP07dsToNfYJHgdP8HMoDDKmmLWR2sozR6UCqIegY7Rk3yN3pEnY3yKv3RBCjBjgiO4dyP2oA8h0a68_3UYF3SsFVnl3a75ewXgNHkuVNNu?purpose=fullsize",
        "description": "Steamed fluffy idlis submerged in a bowl of hot fragrant drumstick-carrot sambar with traditional tempering.",
        "servings": "4 Servings",
        "prep_time": "30 mins",
        "product_ids": [
            "PRD082", "PRD071", "PRD075", "PRD073", "PRD046", "PRD084", "PRD044",
            "PRD045", "PRD074", "PRD069", "PRD070", "PRD076", "PRD013", "PRD121"
        ],
        "ingredients": ["idli rice", "urad dal", "fenugreek seeds", "toor dal", "carrot", "drumstick", "onion", "tomato", "tamarind", "sambar powder", "mustard seeds", "curry leaves", "cooking oil", "salt"],
        "instructions": [
            "Soak Idli Rice (Aisle 1) and Urad Dal with Fenugreek seeds for 4 hours, grind to smooth batter, and ferment overnight.",
            "Pour batter into greased idli plates and steam for 10 minutes until light and spongy.",
            "Cook Toor Dal in pressure cooker until soft.",
            "Boil drumstick, carrot, onions, and tomatoes in tamarind water with sambar powder and salt.",
            "Combine cooked dal with the vegetables, simmer 8 minutes, and temper with mustard seeds and curry leaves in oil.",
            "Dip hot idlis into a bowl of piping hot sambar (Sambar Idli) and serve."
        ]
    },
    "masala_dosa": {
        "bundle_id": "RB010",
        "title": "Crispy Masala Dosa",
        "title_tamil": "மசால் தோசை",
        "category": "Breakfast",
        "icon": "🥟",
        "image_url": "https://images.openai.com/static-rsc-4/QkSMkmk3uxFsVs6v5pWBiPSOCCPHGIWBsFVsb940v-DfJKl_rGrYQ9Le7jXajRIYRWTB9Nl3T11gXy2KM4IwqE_R87M7rvTJItsJGJU8u_J9B3-f35Sf3MELWjGdsbMRR072E36Vk7w2V9z8j6wU4euOyqTaofEPK1OqOw_Voixo3gxkoP4KvxuUA2asurPD?purpose=fullsize",
        "description": "Golden-crisp South Indian fermented crepe stuffed with spiced potato filling, served with coconut chutney.",
        "servings": "4 Servings",
        "prep_time": "25 mins",
        "product_ids": [
            "PRD083", "PRD071", "PRD075", "PRD043", "PRD044", "PRD061", "PRD122",
            "PRD070", "PRD072", "PRD076", "PRD067", "PRD013", "PRD121"
        ],
        "ingredients": ["dosa rice", "urad dal", "fenugreek seeds", "potato", "onion", "green chilli", "ginger", "mustard seeds", "chana dal", "curry leaves", "turmeric powder", "cooking oil", "salt"],
        "instructions": [
            "Prepare dosa batter by grinding soaked Dosa Rice (Aisle 1), Urad Dal, and Fenugreek seeds, then ferment.",
            "For potato filling: boil and mash potatoes (Aisle 5). In a pan, temper mustard, chana dal, curry leaves, onions, green chillies, ginger, turmeric, and salt.",
            "Heat a seasoned tawa, pour a ladle of batter, and spread in circular motion from center outwards.",
            "Drizzle oil along the edges and roast on medium flame until bottom turns golden-brown and crispy.",
            "Place 2 tablespoons of potato masala in the center, fold dosa into half, and serve hot."
        ]
    },
    "coconut_chutney": {
        "bundle_id": "RB011",
        "title": "Fresh Coconut Chutney (Thengai Chutney)",
        "title_tamil": "தேங்காய் சட்னி",
        "category": "Side Dish",
        "icon": "🥥",
        "image_url": "https://images.openai.com/static-rsc-4/HnaHRcV2UDnZp_aQBToZx9XC7FLtNap90HgYl1ttudxDu9WCYCOl-fk-Rwczg8iZPG_6zkALYJFQJc3Lv3R_SAQsIzvJaPzu4oJ2I-Ap92DRsXEB3XAkcERsicBqxJpoUfD_ZUE7QYjWyadEU8Qhgxj47EgD_xz6A2c-Y7doI3Gx5T__sdsQKSymtoTocQUm?purpose=fullsize",
        "description": "Everyday South Indian restaurant-style white coconut chutney made with fresh coconut, roasted gram, green chillies, ginger, and aromatic hing-mustard tempering.",
        "servings": "4 Servings",
        "prep_time": "10 mins",
        "product_ids": [
            "PRD099", "PRD061", "PRD119", "PRD122", "PRD070", "PRD071", "PRD076",
            "PRD077", "PRD013", "PRD121"
        ],
        "ingredients": ["coconut", "green chilli", "roasted gram", "ginger", "mustard seeds", "urad dal", "curry leaves", "asafoetida", "cooking oil", "salt"],
        "instructions": [
            "Grate Fresh Coconut (Aisle 5).",
            "In a mixer jar, add grated coconut, Roasted Gram (Aisle 1), green chillies, ginger, salt, and water.",
            "Grind into a smooth or slightly coarse paste according to preference; transfer to a serving bowl.",
            "Heat 1 tsp oil in a tadka pan, splutter mustard seeds, urad dal, curry leaves, and a dash of hing.",
            "Pour hot tadka over the chutney and stir gently. Pairs perfectly with Idli, Dosa, and Pongal."
        ]
    },
    "veg_kurma": {
        "bundle_id": "RB012",
        "title": "Tamil Nadu Mixed Vegetable Kurma",
        "title_tamil": "வெஜிடபிள் குருமா",
        "category": "Vegetarian",
        "icon": "🍲",
        "image_url": "https://images.openai.com/static-rsc-4/kDHB3QWFuZ1SO_BNwhVaoEsEJe-AxY8Pf4JgFTyZ9fx6hvp7lEsVQrFYfwAqoH83X1sstc-8m-OuO3bh2W2sajfoh2pEGLb9qinzLVpZAPh6YOwCtTmSG5DFSJ5RDRZobMrYFNzNORamL95HS0vdZvJzUzVOEVTOrGqVmhrPeWDYkosg9tJd0Xxns9WXi-WP?purpose=fullsize",
        "description": "Rich, creamy, and aromatic hotel-style white vegetable kurma made with coconut-cashew-poppy paste, mixed veggies, and whole spices.",
        "servings": "4 Servings",
        "prep_time": "30 mins",
        "product_ids": [
            "PRD046", "PRD120", "PRD043", "PRD047", "PRD044", "PRD045", "PRD099",
            "PRD100", "PRD101", "PRD062", "PRD061", "PRD093", "PRD096", "PRD097",
            "PRD013", "PRD121"
        ],
        "ingredients": ["carrot", "beans", "potato", "green peas", "onion", "tomato", "coconut", "poppy seeds", "cashew nuts", "ginger garlic paste", "green chilli", "garam masala", "cinnamon", "cloves", "cooking oil", "salt"],
        "instructions": [
            "Grind fresh coconut, soaked poppy seeds (Aisle 4), cashew nuts (Aisle 3), green chillies, and ginger garlic paste into a silky smooth paste.",
            "Heat oil in a cooker; crackle cinnamon and cloves (Aisle 4).",
            "Sauté onions and tomatoes until soft.",
            "Add chopped carrots, beans, potatoes, green peas, garam masala, and salt with 1 cup water; pressure cook for 1 whistle.",
            "Stir in the coconut-cashew paste, adjust consistency with water, and simmer gently for 5 minutes.",
            "Best accompanied with Parotta, Chapati, or Poori."
        ]
    },
    "aloo_gobi": {
        "bundle_id": "RB013",
        "title": "Aloo Gobi Masala",
        "title_tamil": "உருளைக்கிழங்கு காலிஃபிளவர் மசாலா",
        "category": "Vegetarian",
        "icon": "🥦",
        "image_url": "https://images.openai.com/static-rsc-4/GzQfduB-4cuAd0yTwCYT3HWQUWFHCiPwt4krbp0_Wdgj-r0SwUQbdb02qmqwdobh-5d1mH1l0i0wDf6IDeWpHxy9SPwy4-KKCqxvwHRijgtLwzStFJcSvmcGJIu89jcKYww7hbErkLXmfVhzYkuIRwfonA4Va2hVIx9KDdrhhZKggVNYlqZ7vNGGJN374PGM?purpose=fullsize",
        "description": "Homestyle spiced potato and cauliflower dry curry sautéed with cumin seeds, onions, tomatoes, and ground coriander.",
        "servings": "4 Servings",
        "prep_time": "25 mins",
        "product_ids": [
            "PRD043", "PRD106", "PRD044", "PRD045", "PRD062", "PRD061", "PRD067",
            "PRD068", "PRD095", "PRD093", "PRD094", "PRD013", "PRD121"
        ],
        "ingredients": ["potato", "cauliflower", "onion", "tomato", "ginger garlic paste", "green chilli", "turmeric powder", "chilli powder", "coriander powder", "garam masala", "cumin seeds", "cooking oil", "salt"],
        "instructions": [
            "Cut Cauliflower (Aisle 5) into florets and blanch in warm salted water for 5 minutes.",
            "Dice potatoes into bite-sized cubes.",
            "Heat oil in a pan, crackle cumin seeds (Aisle 4), and sauté onions, green chillies, and ginger garlic paste.",
            "Add chopped tomatoes, turmeric, chilli powder, coriander powder, garam masala, and salt.",
            "Add potato cubes and cauliflower florets; sprinkle 3 tbsp water, cover with lid, and cook on low-medium flame for 15 minutes until tender.",
            "Serve hot with rotis or steamed rice."
        ]
    },
    "paneer_butter_masala": {
        "bundle_id": "RB014",
        "title": "Restaurant-Style Paneer Butter Masala",
        "title_tamil": "பன்னீர் பட்டர் மசாலா",
        "category": "Vegetarian",
        "icon": "🧀",
        "image_url": "https://images.openai.com/static-rsc-4/ZXdxDlFxo4qdJN0STeQqz-5uu-u4EkQuoJFz_ugJ4bz6LRf5WgHUOTLHxBbhAxz3eY-Z92yFnGBcTkyQgglmJ_rScjqSlLFuzPDmEa4_RRbXWOHhHwpeVxJXumptYoFp6-D50QK1tTDDjnw1anr-PV7M-qP3C2VcH8lO2a2xhrmmcGtp57vCdsP6nvXM4nr2?purpose=fullsize",
        "description": "Rich, velvety tomato-butter gravy simmered with fresh cream, soft paneer cubes, cashews, and aromatic kasuri methi.",
        "servings": "4 Servings",
        "prep_time": "25 mins",
        "product_ids": [
            "PRD105", "PRD045", "PRD044", "PRD102", "PRD103", "PRD062", "PRD101",
            "PRD068", "PRD093", "PRD104", "PRD013", "PRD121"
        ],
        "ingredients": ["paneer", "tomato", "onion", "butter", "fresh cream", "ginger garlic paste", "cashew nuts", "chilli powder", "garam masala", "kasuri methi", "cooking oil", "salt"],
        "instructions": [
            "Boil chopped tomatoes, onions, and cashew nuts (Aisle 3) in water for 10 minutes; cool and blend into smooth makhani purée.",
            "Melt generous Amul Butter (Aisle 2) with 1 tbsp oil in a pan; add ginger garlic paste and sauté for 1 minute.",
            "Pour in the tomato-cashew purée, add chilli powder, garam masala, and salt. Cook until butter starts separating.",
            "Add cubed Paneer (Aisle 2) and simmer gently for 4 minutes so the paneer absorbs flavors without getting rubbery.",
            "Stir in Fresh Cream (Aisle 2) and crushed Kasuri Methi (Aisle 4). Serve hot with Naan, Kulcha, or Pulao."
        ]
    },
    "mushroom_pepper_fry": {
        "bundle_id": "RB015",
        "title": "South Indian Mushroom Pepper Fry",
        "title_tamil": "காளான் மிளகு வறுவல்",
        "category": "Vegetarian",
        "icon": "🍄",
        "image_url": "https://images.openai.com/static-rsc-4/jHxeTJVvnBbTEmQRe3oGOhaEHOrbkm4kRVAYODh7LF6J_w401fp-snQQ4rXQCMpiMEMlMdWn0PZYJYKfdkAn1hFnwfJxQdaPjEnLF8WMkE3rGnaGYORh5w87LswU9fNFbESqYd01YKNrf1zyijFeoLz2gpzOO96kRJvRvAx5197tcrIl3F8ZJVy6h-i4ZJqK?purpose=fullsize",
        "description": "Chettinad style spicy mushroom stir-fry packed with freshly crushed black pepper, onions, tomatoes, and aromatic curry leaves.",
        "servings": "3 Servings",
        "prep_time": "20 mins",
        "product_ids": [
            "PRD107", "PRD044", "PRD045", "PRD061", "PRD062", "PRD092", "PRD067",
            "PRD095", "PRD076", "PRD070", "PRD013", "PRD121"
        ],
        "ingredients": ["mushroom", "onion", "tomato", "green chilli", "ginger garlic paste", "pepper powder", "turmeric powder", "coriander powder", "curry leaves", "mustard seeds", "cooking oil", "salt"],
        "instructions": [
            "Clean Fresh Button Mushrooms (Aisle 5) with a damp cloth and slice into halves.",
            "Heat oil in a skillet, add mustard seeds and fresh curry leaves.",
            "Add sliced onions, green chillies, and ginger garlic paste; sauté until onions turn deep brown.",
            "Add chopped tomatoes, turmeric, coriander powder, and salt; cook until tomatoes turn soft.",
            "Add sliced mushrooms; mushrooms will release natural moisture. Sauté on medium flame until dry.",
            "Add 1.5 tablespoons of freshly ground Black Pepper Powder (Aisle 4) and toss on high flame for 2 minutes."
        ]
    },
    "chicken_65": {
        "bundle_id": "RB016",
        "title": "Chennai Restaurant-Style Chicken 65",
        "title_tamil": "சிக்கன் 65",
        "category": "Non-Vegetarian",
        "icon": "🍗",
        "image_url": "https://images.openai.com/static-rsc-4/7OBparf_7Q5rOq027bvsLqQVfzBgMI2dwS07F6pj8JHj0IN3AeNcy5TafYpfDSFXmz-0K5svTqPvHggJvXKhqxr7xF3aO4ANwAwUr6UhJdOdJ4LaXFzeXkEC_JwdhGLTfoaZpW5PyHUw41zyD95BFMznhQhb9_pv8TgsiXG6ddtSknUZ7ITKsGm3Zy-zV7Ye?purpose=fullsize",
        "description": "Iconic Chennai appetizer: crispy bite-sized fried chicken cubes marinated in spicy yogurt, cornflour, pepper, and fried curry leaves.",
        "servings": "4 Servings",
        "prep_time": "25 mins (+ 20 mins marination)",
        "product_ids": [
            "PRD108", "PRD111", "PRD112", "PRD062", "PRD065", "PRD068", "PRD092",
            "PRD067", "PRD093", "PRD080", "PRD076", "PRD013", "PRD121"
        ],
        "ingredients": ["chicken", "corn flour", "rice flour", "ginger garlic paste", "curd", "chilli powder", "pepper powder", "turmeric powder", "garam masala", "lemon", "curry leaves", "cooking oil", "salt"],
        "instructions": [
            "Cut Fresh Chicken (Aisle 6) into bite-sized boneless pieces.",
            "Marinate chicken with curd, ginger garlic paste, red chilli powder, black pepper, turmeric, garam masala, lemon juice, and salt for 20 minutes.",
            "Just before frying, coat with Corn Flour (Aisle 1) and Rice Flour for an extra crunchy crust.",
            "Heat cooking oil in a deep kadai. Drop chicken pieces in batches and deep fry on medium flame for 6-8 minutes until crisp and golden-red.",
            "In the same hot oil, flash fry fresh curry leaves for 10 seconds.",
            "Drain chicken on paper towels, toss with crispy fried curry leaves, and serve with lemon wedges."
        ]
    },
    "fish_fry": {
        "bundle_id": "RB017",
        "title": "Crispy South Indian Meen Varuval (Fish Fry)",
        "title_tamil": "மீன் வறுவல்",
        "category": "Non-Vegetarian",
        "icon": "🐟",
        "image_url": "https://images.openai.com/static-rsc-4/V1FFbtYKKE1mfOovfWiGTpYI2sl3kYR7egM-F1fjYXj1MfaxmHdTlmrj0PacUgs7RkB9TCvMervMzvo5SE5jny1lWPJWfXvOZB4d1EtjkIphAYqU2MwrXkQ1KbqusGela7nhVKuOYL0iPaD6ykIyIBjSwGciIdXz5qhUl0cZa5ace9E3rhchBph3uhJRA4WQ?purpose=fullsize",
        "description": "Coastal Tamil Nadu tawa fish fry marinated in spicy red masala with pepper, coriander, lemon juice, and crispy rice flour crust.",
        "servings": "3 Servings",
        "prep_time": "20 mins",
        "product_ids": [
            "PRD109", "PRD068", "PRD067", "PRD092", "PRD095", "PRD062", "PRD080",
            "PRD112", "PRD076", "PRD013", "PRD121"
        ],
        "ingredients": ["fish", "chilli powder", "turmeric powder", "pepper powder", "coriander powder", "ginger garlic paste", "lemon", "rice flour", "curry leaves", "cooking oil", "salt"],
        "instructions": [
            "Wash and clean fresh fish steaks (Aisle 6). Make shallow slits on both sides.",
            "In a bowl, prepare marinade paste: combine chilli powder, turmeric, black pepper, coriander powder, ginger garlic paste, lemon juice, salt, and Rice Flour (Aisle 1) with 2 tbsp water.",
            "Coat fish steaks generously with the masala and rest for 15 minutes.",
            "Heat 3 tbsp oil on a flat iron tawa; place fish steaks and shallow fry on medium heat for 4-5 minutes per side.",
            "Toss in fresh curry leaves in the oil around the fish for coastal aroma.",
            "Serve sizzling hot with sliced raw onions and lemon slices."
        ]
    },
    "egg_curry": {
        "bundle_id": "RB018",
        "title": "Andhra / Tamil Nadu Muttai Kulambu (Egg Curry)",
        "title_tamil": "முட்டை குழம்பு",
        "category": "Non-Vegetarian",
        "icon": "🥚",
        "image_url": "https://images.openai.com/static-rsc-4/gb7jue7g2zLJOxy_b-HtTMOVqUcgF-6lJ3AcNJbtcglUEuCrP_4ptH4NR-CMy4z-MmRFZbZWyHsQkZU26awd9RHguod2HWGkSwcBKMTysoZDYHATistvubH5EDSDIe1uCDe4S4hEpnOSHfbi-RWhJGJxeP4jwIfuPPNnafAqGW2d2936dHXFLjgZUVYOAx6a?purpose=fullsize",
        "description": "Flavorful boiled egg curry simmered in a coconut-onion-tomato gravy spiced with mustard seeds, curry leaves, and garam masala.",
        "servings": "4 Servings",
        "prep_time": "25 mins",
        "product_ids": [
            "PRD110", "PRD044", "PRD045", "PRD062", "PRD061", "PRD099", "PRD068",
            "PRD095", "PRD067", "PRD093", "PRD070", "PRD076", "PRD013", "PRD121"
        ],
        "ingredients": ["eggs", "onion", "tomato", "ginger garlic paste", "green chilli", "coconut", "chilli powder", "coriander powder", "turmeric powder", "garam masala", "mustard seeds", "curry leaves", "cooking oil", "salt"],
        "instructions": [
            "Boil Farm Fresh Eggs (Aisle 2) for 10 minutes, peel shells, and make vertical slits.",
            "Grind Fresh Coconut (Aisle 5) with water into a smooth paste.",
            "Heat oil in a pan, add mustard seeds and curry leaves.",
            "Sauté onions, green chillies, and ginger garlic paste until lightly browned.",
            "Add tomato purée, red chilli powder, coriander powder, turmeric, garam masala, and salt; cook until oil glazes the top.",
            "Pour in coconut paste and 1 cup water, bring to gentle boil, then add the boiled eggs.",
            "Simmer on low flame for 6 minutes so eggs absorb the spicy gravy."
        ]
    },
    "chicken_gravy": {
        "bundle_id": "RB019",
        "title": "Village Style Chicken Gravy (Kozhi Kuzhambu)",
        "title_tamil": "கிராமத்து கோழிக்குழம்பு",
        "category": "Non-Vegetarian",
        "icon": "🍗",
        "image_url": "https://images.openai.com/static-rsc-4/KDdtVHHGiMsDbTy_ff9KSNjk7VU_vTAP25DUbz_-5stcM8mCS341nJsDv7oX_tBaQmRE_VCL4RqIIpQtdRGR8vCLudeAsl2VT03ItTwo8jLCGjZIMK1rX2o_kMyxygeNjfiTtLBcK0C1kMG-ZY8O_53K-T-rgonVwZm_SHiuWK_7yrmF_OPxn1rT8jM7OZKz?purpose=fullsize",
        "description": "Authentic Tamil village chicken gravy roasted with freshly ground coconut, fennel seeds, cinnamon, cloves, and country spices.",
        "servings": "4 Servings",
        "prep_time": "40 mins",
        "product_ids": [
            "PRD108", "PRD044", "PRD045", "PRD099", "PRD062", "PRD061", "PRD068",
            "PRD095", "PRD067", "PRD093", "PRD113", "PRD096", "PRD097", "PRD076",
            "PRD064", "PRD013", "PRD121"
        ],
        "ingredients": ["chicken", "onion", "tomato", "coconut", "ginger garlic paste", "green chilli", "chilli powder", "coriander powder", "turmeric powder", "garam masala", "fennel seeds", "cinnamon", "cloves", "curry leaves", "coriander leaves", "cooking oil", "salt"],
        "instructions": [
            "Grind fresh coconut with fennel seeds (Aisle 4) into a smooth creamy paste.",
            "Heat oil in a heavy kadai; add cinnamon, cloves, and fresh curry leaves.",
            "Sauté chopped onions, green chillies, and ginger garlic paste until golden brown.",
            "Add tomatoes, chilli powder, coriander powder, turmeric, garam masala, and salt.",
            "Add Fresh Chicken pieces and sear on high heat for 5 minutes.",
            "Add 1.5 cups water, cover and cook for 15 minutes until chicken is tender.",
            "Stir in the coconut-fennel paste, simmer for 5 minutes until thick and rich, and garnish with coriander."
        ]
    },
    "rava_kesari": {
        "bundle_id": "RB020",
        "title": "Traditional Ghee Rava Kesari",
        "title_tamil": "ரவா கேசரி",
        "category": "Dessert / Sweet",
        "icon": "🍮",
        "image_url": "https://images.openai.com/static-rsc-4/UGvld4H_2Iydc1k8YKHbfk87QruwPbdMqjmyEWeJlOchSURHSBDjVw7ybdbwCI-fOr3iXXw7kE4R-p2aRf5GVPu81utfuqc7uUWKnuHUucIVZZ2hvUE_bKuuadBYFFW0uVT9UBE_nc8Dr4LXZg_Q9TgORbOHUTwskarIYZUVTrclEaQ_5pccYQJ9hVKHzhdX?purpose=fullsize",
        "description": "Mouth-melting South Indian celebration sweet made in 15 minutes with roasted semolina (sooji), pure desi ghee, sugar, cardamom, cashews, and golden raisins.",
        "servings": "4 Servings",
        "prep_time": "15 mins",
        "product_ids": [
            "PRD114", "PRD006", "PRD115", "PRD101", "PRD116", "PRD117", "PRD118", "PRD123"
        ],
        "ingredients": ["rava", "sugar", "ghee", "cashew nuts", "raisins", "cardamom powder", "food colour", "water"],
        "instructions": [
            "Heat 2 tbsp Pure Desi Ghee (Aisle 2) in a pan; fry Cashew Nuts (Aisle 3) and Raisins until golden and plump. Set aside.",
            "In the remaining ghee, roast Rava / Semolina (Aisle 1) on low flame for 4 minutes until fragrant without browning.",
            "In a separate pot, boil 2.5 cups of Water (Aisle 2) with a pinch of Food Colour (Aisle 3).",
            "Slowly pour boiling water into roasted rava, stirring continuously to prevent lumps.",
            "Cook until rava absorbs water and becomes soft (about 3 minutes).",
            "Add Refined Sugar (Aisle 1), remaining Desi Ghee, and Cardamom Powder (Aisle 4). Mix well until ghee leaves the sides.",
            "Garnish with fried cashews and raisins. Serve warm."
        ]
    },

    # ─────────────────────────────────────────────────────────────
    # COMPATIBILITY & WELLNESS BUNDLES
    # ─────────────────────────────────────────────────────────────
    "senior_breakfast": {
        "bundle_id": "RB021",
        "title": "Senior Vitality High-Calcium Breakfast",
        "title_tamil": "மூத்தோர் காலை உணவு",
        "category": "Breakfast & Wellness",
        "icon": "🥛",
        "image_url": "https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=600&q=80",
        "description": "Heart-healthy, low-sugar breakfast bundle rich in potassium, calcium and dietary fiber.",
        "servings": "2 Servings",
        "prep_time": "5 mins",
        "product_ids": ["PRD022", "PRD031", "PRD050", "PRD049"],
        "ingredients": ["almond milk", "nutrichoice digestive", "bananas", "apples"],
        "instructions": [
            "Pour chilled or warm Epigamia Almond Milk (Aisle 2) into a bowl.",
            "Slice fresh Robusta Bananas and Shimla Apples (Aisle 5).",
            "Serve alongside high-fiber NutriChoice Digestive Biscuits (Aisle 3)."
        ]
    },
    "diabetic_dinner": {
        "bundle_id": "RB022",
        "title": "Diabetic-Friendly Whole Grain Dinner",
        "title_tamil": "நீரிழிவு நோயாளிகளுக்கான இரவு உணவு",
        "category": "Special Dietary Care",
        "icon": "🥗",
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
        "description": "Low-glycemic dinner with high dietary fiber and zero trans fats.",
        "servings": "3 Servings",
        "prep_time": "20 mins",
        "product_ids": ["PRD005", "PRD011", "PRD048", "PRD046", "PRD015"],
        "ingredients": ["organic brown rice", "multigrain atta", "spinach", "carrots", "saffola gold"],
        "instructions": [
            "Prepare rotis using 6-grain Aashirvaad Multigrain Atta (Aisle 1).",
            "Steam fresh organic spinach and carrots (Aisle 5).",
            "Lightly toss in Saffola Gold Pro heart-healthy oil (Aisle 2)."
        ]
    }
}

# Aliases for fast backward compatibility
RECIPE_ALIASES = {
    "veg_biryani": "biryani",
    "vegetable_biryani": "biryani",
    "rb001": "biryani",
    "rb002": "chicken_biryani",
    "rb003": "sambar",
    "rb004": "tomato_rice",
    "rb005": "lemon_rice",
    "rb006": "curd_rice",
    "rb007": "veg_fried_rice",
    "rb008": "poori_masala",
    "rb009": "idli_sambar",
    "rb010": "masala_dosa",
    "rb011": "coconut_chutney",
    "rb012": "veg_kurma",
    "rb013": "aloo_gobi",
    "rb014": "paneer_butter_masala",
    "rb015": "mushroom_pepper_fry",
    "rb016": "chicken_65",
    "rb017": "fish_fry",
    "rb018": "egg_curry",
    "rb019": "chicken_gravy",
    "rb020": "rava_kesari"
}


class RecipeBundlePlanner:
    def __init__(self):
        self.retriever = ProductRetriever()

    def generate_bundle(self, recipe_key="biryani", custom_query=None, servings=None, pricing_mode="portion"):
        """
        Retrieves matching supermarket products for the requested meal,
        calculates serving-adjusted recipe portion quantities (e.g. 100g instead of 500g),
        scales costs according to target servings, and orders items by aisle sequence.
        """
        key_lower = (recipe_key or "").lower().strip()

        # Check aliases
        if key_lower in RECIPE_ALIASES:
            key_lower = RECIPE_ALIASES[key_lower]

        template = RECIPE_TEMPLATES.get(key_lower)

        if not template:
            # Try bundle_id match
            for k, t in RECIPE_TEMPLATES.items():
                if t.get("bundle_id", "").lower() == key_lower:
                    template = t
                    break

        if not template:
            # Word match in title or title_tamil
            for k, t in RECIPE_TEMPLATES.items():
                if any(word in key_lower for word in t["title"].lower().split() if len(word) > 3):
                    template = t
                    break
                if t.get("title_tamil") and t["title_tamil"] in key_lower:
                    template = t
                    break

        if not template:
            template = RECIPE_TEMPLATES["biryani"]

        # Parse base servings from template (e.g. "4 Servings" -> 4)
        base_match = re.search(r'\d+', str(template.get("servings", "4")))
        base_servings = int(base_match.group(0)) if base_match else 4
        
        # User requested target servings (e.g. 2, 4, 6)
        try:
            target_servings = int(servings) if servings and int(servings) > 0 else base_servings
        except (ValueError, TypeError):
            target_servings = base_servings

        scale_factor = float(target_servings) / float(base_servings)

        retrieved_items = []
        seen_ids = set()
        retail_raw_total = 0.0
        retail_discount = 0.0
        portion_raw_total = 0.0
        portion_discount = 0.0

        # Method 1: Direct link via canonical product_ids (Guaranteed 100% exact match)
        product_ids_to_fetch = template.get("product_ids", [])
        if not product_ids_to_fetch and "ingredients" in template:
            # Fallback to retriever if product_ids empty
            for ing in template["ingredients"]:
                res = self.retriever.retrieve(ing, top_k=1)
                if res["results"]:
                    pid = res["results"][0].get("product_id")
                    if pid and pid not in product_ids_to_fetch:
                        product_ids_to_fetch.append(pid)

        for pid in product_ids_to_fetch:
            if pid not in seen_ids:
                prod = get_product_by_id(pid)
                if prod:
                    seen_ids.add(pid)
                    retail_price = float(prod["price"])
                    retail_raw_total += retail_price

                    # Parse store package quantity (e.g. 500g -> 500.0, 'g')
                    store_val, store_unit = parse_package_numeric(prod["quantity"])

                    # Lookup base recipe portion (for base servings)
                    base_val, unit, _ = PORTION_TABLE.get(pid, (100.0, store_unit, "100g"))
                    
                    # Scale portion by servings factor
                    portion_val = round(base_val * scale_factor, 1)

                    # Calculate pro-rated recipe portion price
                    unit_ratio = portion_val / store_val if store_val > 0 else 1.0
                    item_portion_price = round(retail_price * unit_ratio, 2)
                    portion_raw_total += item_portion_price

                    # Determine portion display string (e.g. "100g", "200ml", "4 pcs")
                    if unit == 'pcs':
                        portion_qty_str = f"{int(portion_val)} pcs" if portion_val == int(portion_val) else f"{portion_val:.1f} pcs"
                    elif portion_val >= 1000 and unit == 'g':
                        portion_qty_str = f"{portion_val/1000:.2f} kg"
                    elif portion_val >= 1000 and unit == 'ml':
                        portion_qty_str = f"{portion_val/1000:.2f} L"
                    else:
                        portion_qty_str = f"{int(portion_val)}{unit}" if portion_val == int(portion_val) else f"{portion_val:.1f}{unit}"

                    # Discounts
                    offer = str(prod.get("discount_offer", ""))
                    for pct, frac in [("15%", 0.15), ("12%", 0.12), ("10%", 0.10), ("8%", 0.08), ("5%", 0.05)]:
                        if pct in offer:
                            retail_discount += retail_price * frac
                            portion_discount += item_portion_price * frac
                            break

                    item_data = dict(prod)
                    item_data["store_package_qty"] = prod["quantity"]
                    item_data["store_package_price"] = retail_price
                    item_data["portion_qty"] = portion_qty_str
                    item_data["portion_price"] = item_portion_price
                    item_data["is_portion_adjusted"] = (portion_val < store_val)
                    item_data["portion_savings"] = max(0.0, round(retail_price - item_portion_price, 2))
                    item_data["adjustment_note"] = f"Recipe portion {portion_qty_str} (store pack: {prod['quantity']})"

                    # Default visible price & quantity based on pricing_mode
                    if pricing_mode == "portion":
                        item_data["price"] = item_portion_price
                        item_data["quantity"] = portion_qty_str
                    else:
                        item_data["price"] = retail_price
                        item_data["quantity"] = prod["quantity"]

                    retrieved_items.append(item_data)

        # Sort items by aisle sequence for optimal forward walking path in store
        def extract_aisle_num(item):
            aisle_str = str(item.get("aisle_number", "Aisle 9"))
            num = "".join(filter(str.isdigit, aisle_str))
            return int(num) if num else 9

        sorted_items = sorted(retrieved_items, key=extract_aisle_num)

        # Build sequential walking path through supermarket
        aisle_sequence = []
        for it in sorted_items:
            aisle_tag = f"{it['aisle_number']} ({it['shelf_location']}) — {it['product_name']}"
            if aisle_tag not in aisle_sequence:
                aisle_sequence.append(aisle_tag)

        # Final totals
        portion_final_total = max(0.0, round(portion_raw_total - portion_discount, 2))
        retail_final_total = max(0.0, round(retail_raw_total - retail_discount, 2))
        active_bundle_price = portion_final_total if pricing_mode == "portion" else retail_final_total
        active_raw_total = portion_raw_total if pricing_mode == "portion" else retail_raw_total
        active_savings = portion_discount if pricing_mode == "portion" else retail_discount

        cost_per_serving = round(portion_final_total / target_servings, 2) if target_servings > 0 else 0.0
        budget_saved_vs_retail = max(0.0, round(retail_final_total - portion_final_total, 2))

        return {
            "bundle_id": template.get("bundle_id", "RB001"),
            "recipe_key": key_lower,
            "recipe_title": template["title"],
            "recipe_title_tamil": template.get("title_tamil", ""),
            "category": template.get("category", ""),
            "icon": template.get("icon", "🍲"),
            "image_url": template.get("image_url", ""),
            "description": template["description"],
            "servings": target_servings,
            "base_servings": base_servings,
            "servings_label": f"{target_servings} Servings",
            "prep_time": template["prep_time"],
            "instructions": template["instructions"],
            "bundle_items_count": len(sorted_items),
            "items": sorted_items,
            
            # Pricing breakdowns
            "pricing_mode": pricing_mode,
            "raw_total": round(active_raw_total, 2),
            "promotional_savings": round(active_savings, 2),
            "bundle_price": round(active_bundle_price, 2),
            
            # Serving & Portion budget metrics
            "serving_adjusted_price": round(portion_final_total, 2),
            "retail_package_price": round(retail_final_total, 2),
            "cost_per_serving": cost_per_serving,
            "budget_saved_vs_retail": budget_saved_vs_retail,
            
            "optimal_walking_itinerary": aisle_sequence,
            "success": True,
        }

    def get_available_recipes(self):
        """Returns list of all featured 20 recipe bundles with affordable serving-adjusted pricing."""
        recipes_list = []
        
        # Primary 20 Tamil recipes in order
        primary_keys = [
            "biryani", "chicken_biryani", "sambar", "tomato_rice", "lemon_rice",
            "curd_rice", "veg_fried_rice", "poori_masala", "idli_sambar", "masala_dosa",
            "coconut_chutney", "veg_kurma", "aloo_gobi", "paneer_butter_masala", "mushroom_pepper_fry",
            "chicken_65", "fish_fry", "egg_curry", "chicken_gravy", "rava_kesari",
            "senior_breakfast", "diabetic_dinner"
        ]

        for k in primary_keys:
            if k in RECIPE_TEMPLATES:
                t = RECIPE_TEMPLATES[k]
                pids = t.get("product_ids", [])
                
                # Compute serving-adjusted budget price for default 4 servings
                portion_total = 0.0
                retail_total = 0.0
                for pid in pids:
                    prod = get_product_by_id(pid)
                    if prod:
                        r_price = float(prod["price"])
                        retail_total += r_price
                        store_val, store_unit = parse_package_numeric(prod["quantity"])
                        base_val, _, _ = PORTION_TABLE.get(pid, (100.0, store_unit, "100g"))
                        p_ratio = base_val / store_val if store_val > 0 else 1.0
                        portion_total += round(r_price * p_ratio, 2)

                recipes_list.append({
                    "id": k,
                    "bundle_id": t.get("bundle_id", "RB001"),
                    "title": t["title"],
                    "title_tamil": t.get("title_tamil", ""),
                    "category": t.get("category", "General"),
                    "icon": t.get("icon", "🍲"),
                    "image_url": t.get("image_url", ""),
                    "items_count": len(pids),
                    "est_price": round(portion_total, 2), # Affordable portion price!
                    "retail_price": round(retail_total, 2),
                    "servings": 4
                })

        return recipes_list

    def get_all_bundles_dataset(self):
        """
        Returns complete tabular and JSON dataset for all 20 bundles
        as requested for direct database export/upload.
        """
        dataset = []
        for r in self.get_available_recipes():
            bundle = self.generate_bundle(r["id"])
            for it in bundle["items"]:
                dataset.append({
                    "bundle_id": bundle["bundle_id"],
                    "bundle_name": bundle["recipe_title"],
                    "bundle_name_tamil": bundle["recipe_title_tamil"],
                    "category": bundle["category"],
                    "recipe_image": bundle["image_url"],
                    "product_id": it["product_id"],
                    "product_name": it["product_name"],
                    "brand": it["brand"],
                    "quantity": it["quantity"],
                    "product_price": it["price"],
                    "aisle_number": it["aisle_number"],
                    "shelf_location": it["shelf_location"],
                    "total_bundle_price": bundle["bundle_price"]
                })
        return dataset
