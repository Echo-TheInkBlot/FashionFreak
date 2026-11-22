import type { Category, ProductStatus } from "../inventory/types";

export interface SeedProduct {
  sku: string;
  name: string;
  description: string;
  category: Category;
  size: string;
  color: string;
  tags: string[];
  price: number;          // dollars
  quantity: number;
  status: ProductStatus;
  oneOfAKind: boolean;
  daysAgoAdded: number;
  soldDaysAgo?: number;   // only for status "sold"
  aiNotes: string;
}

// Placeholder inventory for the demo. Names and prices are invented.
export const SEED_PRODUCTS: SeedProduct[] = [
  // Dresses
  { sku: "FF-LV7DRS", name: "Wet Look Vinyl Mini Dress", category: "dresses", size: "S", color: "red", price: 58, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 1,
    description: "Glossy cherry-red vinyl mini with a sweetheart neckline and back zip. Loud, shiny, a little dangerous.", tags: ["vinyl","party","y2k"], aiNotes: "short red glossy vinyl mini dress, sweetheart neckline, back zipper, shiny wet-look finish" },
  { sku: "FF-MRGMXI", name: "Marigold Crochet Maxi", category: "dresses", size: "M", color: "orange", price: 68, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 2,
    description: "Hand-crocheted 70s maxi in marigold and rust with open-knit sleeves. Wear it over a slip or don't.", tags: ["70s","crochet","handmade"], aiNotes: "long orange and rust crochet maxi dress, open knit bell sleeves, fringe hem" },
  { sku: "FF-SWRLSL", name: "Swirl Print Slip Dress", category: "dresses", size: "1X-3X", color: "purple", price: 46, quantity: 3, status: "available", oneOfAKind: false, daysAgoAdded: 5,
    description: "Bias-cut satin slip in a violet-and-pink psychedelic swirl. Adjustable straps, slinky drape.", tags: ["satin","psychedelic","slip"], aiNotes: "satin slip dress with purple pink orange psychedelic swirl print, thin straps, midi length" },
  { sku: "FF-PCHMSH", name: "See-Through Swirl Mesh Dress", category: "dresses", size: "S/M", color: "pink", price: 54, quantity: 2, status: "available", oneOfAKind: false, daysAgoAdded: 9,
    description: "Sheer stretch mesh with a melting rainbow print. Layer it or let it do the talking.", tags: ["mesh","sheer","festival"], aiNotes: "sheer stretch mesh bodycon dress, rainbow melting swirl print, long sleeves" },
  { sku: "FF-VLVKMN", name: "Midnight Velvet Witch Dress", category: "dresses", size: "2X", color: "black", price: 84, quantity: 0, status: "sold", oneOfAKind: true, daysAgoAdded: 20, soldDaysAgo: 1,
    description: "Black crushed velvet maxi with bell sleeves and a lace-up bodice. Full-moon approved.", tags: ["goth","velvet","witchy"], aiNotes: "black crushed velvet maxi dress, long bell sleeves, lace up corset bodice" },

  // Tops
  { sku: "FF-CHRCRS", name: "Forbidden Cherry Corset Top", category: "tops", size: "M", color: "red", price: 52, quantity: 2, status: "available", oneOfAKind: false, daysAgoAdded: 1,
    description: "Boned corset top in cherry-print cotton with lace-up back. Pairs great with flares and bad decisions.", tags: ["corset","cherry","lace-up"], aiNotes: "white corset top with red cherry print, boning, lace up back, sweetheart neckline" },
  { sku: "FF-IRDMSH", name: "Iridescent Mesh Long Sleeve", category: "tops", size: "S", color: "multi", price: 34, quantity: 4, status: "available", oneOfAKind: false, daysAgoAdded: 3,
    description: "Holographic mesh top that shifts from pink to teal in the light.", tags: ["mesh","holographic","rave"], aiNotes: "iridescent holographic mesh long sleeve top, pink teal shimmer, fitted" },
  { sku: "FF-TDHLTR", name: "Tie-Dye Halter Top", category: "tops", size: "XS-6X", color: "multi", price: 28, quantity: 6, status: "available", oneOfAKind: false, daysAgoAdded: 12,
    description: "Hand-dyed spiral halter in sunset colors. Ties at the neck and the back.", tags: ["tie-dye","halter","handmade"], aiNotes: "spiral tie-dye halter crop top, orange pink yellow, ties at neck and back" },
  { sku: "FF-BLCHTE", name: "Bleach-Splatter Band Tee", category: "tops", size: "L", color: "black", price: 32, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 4,
    description: "Faded black vintage tee, hand bleach-splattered and cropped. No band was harmed.", tags: ["vintage","band tee","distressed"], aiNotes: "faded black cropped t-shirt with white bleach splatter, distressed hem" },
  { sku: "FF-LVLCMI", name: "Lava Lamp Mesh Cami", category: "tops", size: "XS", color: "orange", price: 26, quantity: 0, status: "sold", oneOfAKind: true, daysAgoAdded: 14, soldDaysAgo: 2,
    description: "Orange and magenta lava-lamp print cami with a cowl neck.", tags: ["cami","print"], aiNotes: "orange magenta blob print mesh camisole, cowl neck, thin straps" },

  // Denim
  { sku: "FF-PTCHFL", name: "Patchwork Bell-Bottom Jeans", category: "denim", size: "28", color: "blue", price: 72, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 2,
    description: "Vintage Levi's reworked with paisley and velvet patches and a huge flare.", tags: ["vintage","patchwork","flares"], aiNotes: "medium wash bell bottom jeans with paisley and velvet patchwork panels, wide flare" },
  { sku: "FF-LWRSKN", name: "Low-Rise Lace-Up Jeans", category: "denim", size: "26", color: "blue", price: 48, quantity: 3, status: "available", oneOfAKind: false, daysAgoAdded: 8,
    description: "Super low-rise, lace-up fly, light acid wash. Very 2003, very on purpose.", tags: ["y2k","low-rise","acid wash"], aiNotes: "light acid wash low rise jeans with lace up front fly, bootcut" },
  { sku: "FF-DSTSHR", name: "Destroyed Daisy Dukes", category: "denim", size: "2X", color: "blue", price: 36, quantity: 2, status: "available", oneOfAKind: false, daysAgoAdded: 15,
    description: "High-waisted cutoffs with shredded hems and hand-painted daisies on the back pockets.", tags: ["shorts","hand-painted","festival"], aiNotes: "high waisted denim cutoff shorts, frayed hem, painted white daisies on back pockets" },
  { sku: "FF-PNKOVR", name: "Hot Pink Denim Overalls", category: "denim", size: "M", color: "pink", price: 64, quantity: 0, status: "sold", oneOfAKind: true, daysAgoAdded: 30, soldDaysAgo: 6,
    description: "Overdyed hot pink vintage overalls with brass buckles.", tags: ["overalls","vintage"], aiNotes: "hot pink dyed denim overalls, brass buckles, relaxed fit" },

  // Jackets
  { sku: "FF-FRZFUR", name: "Bad Influence Faux Fur Coat", category: "jackets", size: "M", color: "brown", price: 96, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 1,
    description: "Knee-length leopard faux fur with a shawl collar. Mob wife meets Woodstock.", tags: ["faux fur","leopard","statement"], aiNotes: "knee length leopard print faux fur coat, shawl collar, hook closures" },
  { sku: "FF-SDFRNG", name: "Suede Fringe Jacket", category: "jackets", size: "L", color: "tan", price: 110, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 6,
    description: "70s tan suede with long fringe on the sleeves and yoke. Broken in exactly right.", tags: ["70s","suede","fringe","vintage"], aiNotes: "tan brown suede jacket with long fringe on sleeves and back yoke, western cut" },
  { sku: "FF-VNLBMB", name: "Vinyl Moto Bomber", category: "jackets", size: "4X", color: "purple", price: 78, quantity: 2, status: "available", oneOfAKind: false, daysAgoAdded: 10,
    description: "Glossy violet vinyl bomber with ribbed cuffs and a chunky silver zip.", tags: ["vinyl","bomber"], aiNotes: "shiny purple vinyl bomber jacket, black ribbed cuffs and hem, silver zipper" },
  { sku: "FF-PSYDNM", name: "Painted Psych Denim Jacket", category: "jackets", size: "M", color: "blue", price: 88, quantity: 0, status: "sold", oneOfAKind: true, daysAgoAdded: 18, soldDaysAgo: 0,
    description: "Vintage trucker jacket hand-painted with a melting mushroom scene by a local artist.", tags: ["hand-painted","local artist","vintage"], aiNotes: "blue denim trucker jacket with hand painted psychedelic mushrooms on back" },

  // Accessories
  { sku: "FF-LPSBAG", name: "Kiss Me Lip Clutch", category: "accessories", size: "One size", color: "red", price: 30, quantity: 5, status: "available", oneOfAKind: false, daysAgoAdded: 3,
    description: "Patent red clutch shaped like a pair of lips, with a detachable chain strap.", tags: ["bag","lips","novelty"], aiNotes: "red patent leather clutch bag shaped like lips, gold chain strap" },
  { sku: "FF-HRTSHD", name: "Heart-Shaped Sunnies", category: "accessories", size: "One size", color: "pink", price: 18, quantity: 8, status: "available", oneOfAKind: false, daysAgoAdded: 7,
    description: "Pink heart frames with gradient lenses. Look at everything through them.", tags: ["sunglasses","heart"], aiNotes: "pink plastic heart shaped sunglasses with gradient lenses" },
  { sku: "FF-VLVCHK", name: "Velvet Choker Trio", category: "accessories", size: "One size", color: "black", price: 16, quantity: 10, status: "available", oneOfAKind: false, daysAgoAdded: 21,
    description: "Three stretch velvet chokers: black, plum and hot pink.", tags: ["choker","velvet"], aiNotes: "three velvet ribbon choker necklaces, black purple pink" },
  { sku: "FF-FZYBKT", name: "Glitter Devil Horns Headband", category: "accessories", size: "One size", color: "red", price: 14, quantity: 1, status: "available", oneOfAKind: false, daysAgoAdded: 11,
    description: "Red glitter devil horns on a black headband. Costume or Tuesday, your call.", tags: ["costume","devil","rave"], aiNotes: "red glitter devil horns on thin black headband" },

  // Jewelry
  { sku: "FF-MDNRNG", name: "Mood Ring Stack", category: "jewelry", size: "7", color: "multi", price: 22, quantity: 6, status: "available", oneOfAKind: false, daysAgoAdded: 4,
    description: "Set of three adjustable mood rings. Tells everyone how you really feel.", tags: ["rings","mood","70s"], aiNotes: "three silver mood rings with color changing oval stones" },
  { sku: "FF-CRSTLB", name: "Crystal Body Chain", category: "jewelry", size: "One size", color: "silver", price: 38, quantity: 2, status: "available", oneOfAKind: false, daysAgoAdded: 2,
    description: "Rhinestone body chain that drapes across the back and waist. Festival-approved.", tags: ["body chain","rhinestone"], aiNotes: "silver rhinestone body chain harness, draping waist and back strands" },
  { sku: "FF-MSHERR", name: "Glass Mushroom Earrings", category: "jewelry", size: "One size", color: "red", price: 26, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 1,
    description: "Lampwork glass toadstools on gold hooks, made by a Wichita glass artist.", tags: ["handmade","mushroom","local artist"], aiNotes: "small red and white spotted glass mushroom dangle earrings, gold hooks" },
  { sku: "FF-PCSGNL", name: "Peace Sign Pendant", category: "jewelry", size: "One size", color: "gold", price: 20, quantity: 0, status: "sold", oneOfAKind: false, daysAgoAdded: 25, soldDaysAgo: 1,
    description: "Chunky 70s brass peace sign on a long chain.", tags: ["vintage","peace","70s"], aiNotes: "large brass gold peace sign pendant on long chain" },

  // Vintage
  { sku: "FF-70JMPS", name: "Tie-Dye Flare Jumpsuit", category: "vintage", size: "M", color: "multi", price: 74, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 3,
    description: "Genuine 1970s polyester jumpsuit in a wild orange-and-purple dye with a big collar.", tags: ["70s","jumpsuit","polyester"], aiNotes: "1970s orange purple tie dye polyester jumpsuit, large pointed collar, flared legs" },
  { sku: "FF-SQNHLT", name: "Backless Sequin Halter", category: "vintage", size: "S", color: "gold", price: 78, quantity: 1, status: "available", oneOfAKind: true, daysAgoAdded: 5,
    description: "Disco-era gold sequin halter that's completely backless. Built for mirror balls.", tags: ["disco","sequin","backless"], aiNotes: "gold sequin backless halter top, disco era, tie neck" },

  // Shoes
  { sku: "FF-PLTBTS", name: "Black Buckle Platform Boots", category: "shoes", size: "9", color: "black", price: 92, quantity: 2, status: "available", oneOfAKind: false, daysAgoAdded: 6,
    description: "Knee-high black vegan leather boots with five buckles and a 4-inch platform. Stomp accordingly.", tags: ["goth","boots","platform"], aiNotes: "black knee high platform boots with multiple silver buckle straps, chunky sole" },
  { sku: "FF-GLTCLG", name: "Glitter Jelly Platforms", category: "shoes", size: "7", color: "purple", price: 40, quantity: 4, status: "available", oneOfAKind: false, daysAgoAdded: 2,
    description: "Purple glitter jelly sandals with a chunky platform sole.", tags: ["jelly","glitter","platform","y2k"], aiNotes: "translucent purple glitter jelly platform sandals, buckle strap" },
];
