/**
 * RPG Coverage Analysis & Prioritization Engine
 * Ported from Python V2 - full profession-to-RPG mapping with sub-profession refinement
 */

// ============================================================
// PROFESSION-TO-RPG MAPPING (130 portal professions -> 15 RPGs)
// ============================================================

const PROFESSION_TO_RPG = {
  // Arts, Design, and Creative Production
  'Artist': ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
  'Architect': ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
  'Cinematographer': ['Arts, Design, and Creative Production', 'Photo and Video Production'],
  'Photographer': ['Arts, Design, and Creative Production', 'Photo and Video Production'],
  'Videographer': ['Arts, Design, and Creative Production', 'Photo and Video Production'],
  'Interior Designer': ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
  'Lighting Designer': ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
  'Florist': ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
  'Woodworker': ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
  'Furniture Restoration/Upholstery Expert': ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],

  // Beauty and Personal Care
  'Beauty Expert': ['Beauty and Personal Care', 'Beauty Retail and Education'],
  'Hair Stylist/Barber': ['Beauty and Personal Care', 'Hair (Stylist, Color, Barber)'],
  'Makeup Artist': ['Beauty and Personal Care', 'Makeup (Artist, Educator)'],
  'Nail Technician': ['Beauty and Personal Care', 'Nails and Lash/Brow'],
  'Esthetician': ['Beauty and Personal Care', 'Skincare and Esthetics'],

  // Business, Communications, and Professional Services
  'Business Executive': ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
  'CEO/Founder': ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
  'Entrepreneur': ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
  'Financial Advisor': ['Business, Communications, and Professional Services', 'Finance and Accounting'],
  'Lawyer': ['Business, Communications, and Professional Services', 'Legal and Compliance'],
  'Paralegal': ['Business, Communications, and Professional Services', 'Legal and Compliance'],
  'Realtor': ['Business, Communications, and Professional Services', 'Real Estate (Residential, Commercial)'],
  'Operations/Logistics Expert': ['Business, Communications, and Professional Services', 'Operations and Project Management'],
  'Retail Buyer': ['Business, Communications, and Professional Services', 'Sales and Partnerships'],
  'Talent Management': ['Business, Communications, and Professional Services', 'HR and Talent'],
  'Reporter/Journalist': ['Business, Communications, and Professional Services', 'Communications and PR'],
  'Journalist': ['Business, Communications, and Professional Services', 'Communications and PR'],
  'Author': ['Business, Communications, and Professional Services', 'Communications and PR'],
  'Blogger': ['Business, Communications, and Professional Services', 'Communications and PR'],

  // Education, Training, and Child Development
  'Educator': ['Education, Training, and Child Development', 'K-12 Education'],
  'Coach': ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
  'Life Coach': ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
  'Nanny': ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
  'Pediatric Sleep Consultant': ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
  'Speech/Language Expert': ['Education, Training, and Child Development', 'Special Education and Learning Support'],

  // Entertainment, Media, and Creator Economy
  'Actor/TV Personality': ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  'Dancer': ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  'Entertainer': ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  'DJ': ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
  'Musician': ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
  'Music Producer': ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
  'Recording Artist': ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
  'TV/Media Producer': ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
  'TV/Film Commentator': ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
  'Talk Show Host': ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
  'Live Streamer/Content Creator': ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
  'Podcaster': ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
  'Gamer': ['Entertainment, Media, and Creator Economy', 'Gaming and Streaming Creators'],
  'Video Game Developer': ['Entertainment, Media, and Creator Economy', 'Gaming and Streaming Creators'],

  // Fashion and Accessories
  'Fashion Designer': ['Fashion and Accessories', 'Apparel Design and Production'],
  'Fashion Stylist': ['Fashion and Accessories', 'Styling (Wardrobe, Personal Style)'],
  'Model': ['Fashion and Accessories', 'Fashion Retail and Merchandising'],
  'Jeweler/Jewelry Expert': ['Fashion and Accessories', 'Jewelry and Watches'],

  // Food and Beverage
  'Chef': ['Food and Beverage', 'Chef and Culinary (General)'],
  'Restaurant Owner': ['Food and Beverage', 'Chef and Culinary (General)'],
  'Mixologist': ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
  'Barista': ['Food and Beverage', 'Coffee and Tea'],
  'Sommelier': ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
  'Wine Expert': ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
  'Food Scientist': ['Food and Beverage', 'Food Science and Product Testing'],
  'Nutrition Coach': ['Food and Beverage', 'Food Science and Product Testing'],
  'Baker/Pastry Chef': ['Food and Beverage', 'Baking and Pastry'],
  'BBQ/Grill Expert': ['Food and Beverage', 'BBQ and Grilling'],

  // Health and Wellness
  'Doctor': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Nurse': ['Health and Wellness', 'Nursing and Clinical Care'],
  'Physician Assistant': ['Health and Wellness', 'Nursing and Clinical Care'],
  'Therapist': ['Health and Wellness', 'Mental and Behavioral Health'],
  'Social Worker': ['Health and Wellness', 'Mental and Behavioral Health'],
  'Physical Therapist': ['Health and Wellness', 'Physical Therapy and Rehab'],
  'Occupational Therapist': ['Health and Wellness', 'Physical Therapy and Rehab'],
  'Dietician': ['Health and Wellness', 'Nutrition and Dietetics'],
  'Wellness Expert': ['Health and Wellness', 'Wellness Practitioners'],
  'Herbalist': ['Health and Wellness', 'Wellness Practitioners'],
  'Genetics Expert': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Doula': ['Health and Wellness', 'Wellness Practitioners'],
  'Pharmacist': ['Health and Wellness', 'Pharmacy and Medication'],

  // Home Improvement and Skilled Trades
  'Home Improvement Expert': ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
  'Electrician': ['Home Improvement and Skilled Trades', 'Electrical'],
  'HVAC Technician': ['Home Improvement and Skilled Trades', 'HVAC and Ventilation'],
  'DIY Creator': ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
  'Gardening/Landscaping Expert': ['Home Improvement and Skilled Trades', 'Landscaping and Outdoor Build'],
  'Plumber': ['Home Improvement and Skilled Trades', 'Plumbing'],

  // Outdoors, Agriculture, and Land
  'Farmer/Rancher': ['Outdoors, Agriculture, and Land', 'Farming and Ranching'],
  'Adventurer/Outdoors': ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
  'Boater/Fisherman': ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
  'Homesteader': ['Outdoors, Agriculture, and Land', 'Farming and Ranching'],
  'Rock Climber': ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
  'Extreme Sports': ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
  'Sustainability Expert': ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
  'Water Expert': ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
  'Survivalist/Emergency Preparedness Expert': ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
  'Firearms Trainer': ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
  'Hunter/Angler': ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],

  // Pet and Animal Care
  'Veterinarian': ['Pet and Animal Care', 'Veterinary (Vet, Vet Tech)'],
  'Veterinary Technician': ['Pet and Animal Care', 'Veterinary (Vet, Vet Tech)'],
  'Pet Expert': ['Pet and Animal Care', 'Pet Training and Behavior'],
  'Dog Trainer': ['Pet and Animal Care', 'Pet Training and Behavior'],
  'Zoologist': ['Pet and Animal Care', 'Specialty Animals'],

  // Safety, Security, and Emergency Response
  'First Responder': ['Safety, Security, and Emergency Response', 'Fire and Emergency Response'],
  'Military': ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
  'Veteran': ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
  'Security Expert': ['Safety, Security, and Emergency Response', 'Private Security and Protection'],

  // Sports, Fitness, and Performance
  'Athlete': ['Sports, Fitness, and Performance', 'Sports Coaching (Team, Youth)'],
  'Fitness Expert': ['Sports, Fitness, and Performance', 'Personal Training and Strength'],

  // Technology and Science
  'Technology Expert': ['Technology and Science', 'Consumer Tech and Smart Home'],
  'Audio Tech Expert': ['Technology and Science', 'Audio, Video, and A/V Tech'],
  'Audio/Visual Technician': ['Technology and Science', 'Audio, Video, and A/V Tech'],
  'STEM Expert': ['Technology and Science', 'Science and Lab'],
  'Engineer': ['Technology and Science', 'Hardware and Engineering'],
  'Scientist': ['Technology and Science', 'Science and Lab'],
  'Drone Operator': ['Technology and Science', 'Hardware and Engineering'],

  // Travel, Transportation, and Logistics
  'Travel Expert': ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
  'Hospitality Expert': ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
  'Aviation': ['Travel, Transportation, and Logistics', 'Aviation and Airport'],
  'Astronaut': ['Travel, Transportation, and Logistics', 'Aviation and Airport'],
  'Automotive Expert': ['Travel, Transportation, and Logistics', 'Automotive (Mechanic, Detailing)'],
  'Auto Technician': ['Travel, Transportation, and Logistics', 'Automotive (Mechanic, Detailing)'],
  'Motorcyclist': ['Travel, Transportation, and Logistics', 'Automotive (Mechanic, Detailing)'],
  'Trucking/Transportation Expert': ['Travel, Transportation, and Logistics', 'Commercial Driving and Fleet'],
  'Train Conductor': ['Travel, Transportation, and Logistics', 'Public Transit and Rail'],
  'Urban Planner': ['Travel, Transportation, and Logistics', 'Logistics and Supply Chain'],
};

// Sub-profession refinement mapping
const SUB_PROFESSION_TO_SUB_RPG = {
  'Medical Professions - Dentistry': ['Health and Wellness', 'Dental and Oral Health'],
  'Dentistry': ['Health and Wellness', 'Dental and Oral Health'],
  'Medical Professions - Optometrist': ['Health and Wellness', 'Vision and Eye Care'],
  'Optometrist': ['Health and Wellness', 'Vision and Eye Care'],
  'Medical Professions - Nurse Practitioner': ['Health and Wellness', 'Nursing and Clinical Care'],
  'Nurse Practitioner': ['Health and Wellness', 'Nursing and Clinical Care'],
  'Medical Professions - Dermatologist': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions - Cardiologist': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions - Pediatrician': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Home Improvement Expert - Carpenter': ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
  'Carpenter': ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
  'Home Improvement Expert - Home Organizer': ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],
  'Home Improvement Expert - Painter': ['Home Improvement and Skilled Trades', 'Painting and Finishing'],
  'Home Improvement Expert - Flooring': ['Home Improvement and Skilled Trades', 'Flooring and Tile'],
  'Chef - Baker': ['Food and Beverage', 'Baking and Pastry'],
  'Baker': ['Food and Beverage', 'Baking and Pastry'],
  'Chef - BBQ': ['Food and Beverage', 'BBQ and Grilling'],
  'Chef - Pastry': ['Food and Beverage', 'Baking and Pastry'],
  'Gardening/Landscaping Expert - Horticulturist': ['Outdoors, Agriculture, and Land', 'Gardening and Horticulture'],
  'Fitness Expert - Yoga': ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
  'Fitness Expert - Pilates': ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
  'Technology Expert - Gaming': ['Technology and Science', 'Gaming Tech (Hardware, PC build)'],
  'Gamer - PC': ['Technology and Science', 'Gaming Tech (Hardware, PC build)'],
};

// ============================================================
// RETAIL DEMAND WEIGHTS
// ============================================================

const RETAIL_DEMAND = {
  'Technology and Science': 41.5,
  'Home Improvement and Skilled Trades': 40.0,
  'Health and Wellness': 39.5,
  'Food and Beverage': 36.0,
  'Pet and Animal Care': 33.0,
  'Beauty and Personal Care': 31.5,
  'Outdoors, Agriculture, and Land': 31.0,
  'Sports, Fitness, and Performance': 27.0,
  'Fashion and Accessories': 21.0,
  'Arts, Design, and Creative Production': 21.0,
  'Travel, Transportation, and Logistics': 19.0,
  'Entertainment, Media, and Creator Economy': 17.0,
  'Education, Training, and Child Development': 15.0,
  'Safety, Security, and Emergency Response': 15.0,
  'Business, Communications, and Professional Services': 9.0,
};

const HARD_TO_FILL = {
  'Health and Wellness': 1.5,
  'Home Improvement and Skilled Trades': 1.5,
  'Pet and Animal Care': 1.3,
  'Safety, Security, and Emergency Response': 1.3,
  'Technology and Science': 1.1,
};

// ============================================================
// SAM'S CLUB SUB-RPG DEMAND
// ============================================================

const SAMS_CLUB_SUB_RPG_DEMAND = {
  'Health and Wellness|Physicians (MD, DO)': 10,
  'Health and Wellness|Pharmacy and Medication': 9,
  'Health and Wellness|Nutrition and Dietetics': 8,
  'Health and Wellness|Nursing and Clinical Care': 7,
  'Health and Wellness|Dental and Oral Health': 6,
  'Health and Wellness|Vision and Eye Care': 6,
  'Health and Wellness|Wellness Practitioners': 5,
  'Health and Wellness|Physical Therapy and Rehab': 5,
  'Health and Wellness|Mental and Behavioral Health': 4,

  'Home Improvement and Skilled Trades|General Contractors and Remodel': 8,
  'Home Improvement and Skilled Trades|Electrical': 8,
  'Home Improvement and Skilled Trades|Plumbing': 8,
  'Home Improvement and Skilled Trades|HVAC and Ventilation': 7,
  'Home Improvement and Skilled Trades|Appliance Repair and Installation': 7,
  'Home Improvement and Skilled Trades|Handyman and Home Maintenance': 6,
  'Home Improvement and Skilled Trades|Home Cleaning and Organization': 5,
  'Home Improvement and Skilled Trades|Carpentry and Woodwork': 5,
  'Home Improvement and Skilled Trades|Painting and Finishing': 4,
  'Home Improvement and Skilled Trades|Flooring and Tile': 4,
  'Home Improvement and Skilled Trades|Landscaping and Outdoor Build': 5,

  'Technology and Science|Consumer Tech and Smart Home': 9,
  'Technology and Science|Audio, Video, and A/V Tech': 8,
  'Technology and Science|Gaming Tech (Hardware, PC build)': 7,
  'Technology and Science|IT Support and Systems': 5,
  'Technology and Science|Hardware and Engineering': 6,
  'Technology and Science|Software and Developer': 4,

  'Food and Beverage|Chef and Culinary (General)': 9,
  'Food and Beverage|BBQ and Grilling': 8,
  'Food and Beverage|Baking and Pastry': 7,
  'Food and Beverage|Mixology and Bar (Cocktails)': 7,
  'Food and Beverage|Coffee and Tea': 6,
  'Food and Beverage|Food Science and Product Testing': 5,

  'Pet and Animal Care|Veterinary (Vet, Vet Tech)': 10,
  'Pet and Animal Care|Pet Training and Behavior': 7,
  'Pet and Animal Care|Pet Grooming': 6,
  'Pet and Animal Care|Animal Care and Rescue': 4,

  'Beauty and Personal Care|Skincare and Esthetics': 8,
  'Beauty and Personal Care|Hair (Stylist, Color, Barber)': 7,
  'Beauty and Personal Care|Makeup (Artist, Educator)': 7,
  'Beauty and Personal Care|Beauty Retail and Education': 5,

  'Outdoors, Agriculture, and Land|Farming and Ranching': 8,
  'Outdoors, Agriculture, and Land|Gardening and Horticulture': 7,
  'Outdoors, Agriculture, and Land|Landscaping and Outdoor Build': 6,
  'Outdoors, Agriculture, and Land|Hunting, Fishing, and Sporting Outdoors': 7,
  'Outdoors, Agriculture, and Land|Camping, Hiking, Survival': 5,

  'Sports, Fitness, and Performance|Personal Training and Strength': 8,
  'Sports, Fitness, and Performance|Sports Coaching (Team, Youth)': 5,
  'Sports, Fitness, and Performance|Yoga, Pilates, Mobility': 6,
  'Sports, Fitness, and Performance|Recovery and Bodywork': 5,
  'Sports, Fitness, and Performance|Endurance and Outdoor Fitness': 5,

  'Safety, Security, and Emergency Response|Fire and Emergency Response': 7,
  'Safety, Security, and Emergency Response|Workplace Safety and Compliance (EHS)': 5,
  'Safety, Security, and Emergency Response|Emergency Management and Preparedness': 5,
  'Safety, Security, and Emergency Response|Law Enforcement and Public Safety': 6,

  'Travel, Transportation, and Logistics|Automotive (Mechanic, Detailing)': 8,
  'Travel, Transportation, and Logistics|Travel and Hospitality': 4,

  'Fashion and Accessories|Styling (Wardrobe, Personal Style)': 5,
  'Fashion and Accessories|Jewelry and Watches': 4,

  'Education, Training, and Child Development|Early Childhood and Parenting Education': 7,
  'Education, Training, and Child Development|K-12 Education': 4,
};

// Bio keyword patterns for RPG inference
const RPG_KEYWORDS = {
  'Arts, Design, and Creative Production': /\b(graphic design|brand design|packaging design|ux design|ui design|product design|photography|videograph|editor|animation|motion graphics|vfx|interior design|staging|set design|ceramics|woodwork|textile|craft|artisan|muralist|illustrat|calligraph|print design|web design|creative direct)\b/i,
  'Beauty and Personal Care': /\b(hair styl|colorist|barber|makeup|mua|beauty|skincare|esthetician|nail tech|lash|brow|cosmetic|dermatolog|facial|salon|spa profess)\b/i,
  'Business, Communications, and Professional Services': /\b(entrepreneur|founder|ceo|coo|cfo|cmo|startup|small business|marketing|brand strat|digital market|seo|social media market|sales|business develop|partnership|account manag|project manag|operations|program manag|recruit|human resource|talent|accounting|cpa|bookkeep|financial plan|attorney|legal|compliance|contract|real estate|realtor|broker|property|public relation|communi|spokesperson)\b/i,
  'Education, Training, and Child Development': /\b(teacher|professor|educator|principal|counselor|academic|early childhood|child develop|parenting|special education|learning disabil|corporate train|instructional design|coaching certif)\b/i,
  'Entertainment, Media, and Creator Economy': /\b(actor|actress|voice actor|performer|host|present|influencer|content creator|ugc|youtube|tiktok creator|stream|esport|gaming content|musician|producer|dj|recording|podcast|audio host|narrator)\b/i,
  'Fashion and Accessories': /\b(fashion|stylist|personal shopper|wardrobe|apparel design|pattern mak|streetwear|sneaker|jewelry|watch|accessori|merchandis|fashion retail)\b/i,
  'Food and Beverage': /\b(chef|culinar|cook|restaurant|bak|pastry|bbq|grill|pitmaster|smok|mixolog|bartend|cocktail|barista|coffee|tea somm|food safety|restaurant ops|food scien|sensory|recipe develop)\b/i,
  'Health and Wellness': /\b(physician|doctor|md|do |surgeon|cardiolog|dermatolog|pediatric|nurse|rn |np |pa-c|clinical|pharmacist|pharm tech|medication|therapist|counselor|psycholog|mental health|physical therap|occupational therap|athletic train|rehab|dietitian|nutrition|registered diet|dentist|dental|hygienist|orthodont|optometrist|optician|eye care|public health|health edu|community health|massage therap|yoga therap|holistic|acupunctur|chiropr|naturopath)\b/i,
  'Home Improvement and Skilled Trades': /\b(general contract|remodel|renovation|plumb|pipefitt|electric|wiring|hvac|ventilat|heating.*cooling|carpent|cabinet|paint|drywall|floor|tile sett|roof|siding|mason|concrete|handyman|home maint|home repair|clean|organiz|appliance repair|install)\b/i,
  'Outdoors, Agriculture, and Land': /\b(farm|ranch|agricultur|livestock|garden|horticultur|landscap|hardscap|hunt|fish|outdoor sport|camp|hik|survival|wilderness|conservation|environmental|ecolog|wildlife)\b/i,
  'Pet and Animal Care': /\b(veterinar|vet tech|animal|pet groom|dog train|pet train|animal behav|shelter|rescue|animal care|equine|equestrian|horse|exotic animal|livestock care)\b/i,
  'Safety, Security, and Emergency Response': /\b(firefight|emt|paramedic|emergency respond|police|law enforce|corrections|investigat|security officer|bodyguard|protect|safety manag|osha|workplace safe|emergency manag|disaster prep|incident manag|cyber secur|information secur)\b/i,
  'Sports, Fitness, and Performance': /\b(personal train|strength coach|certified train|sports coach|team coach|youth coach|runner|cyclist|triathlon|marathon|endurance|yoga instruct|pilates|mobility coach|recovery special|sports massage|sports medicine|athletic train)\b/i,
  'Technology and Science': /\b(smart home|iot|consumer tech|device review|it support|sysadmin|helpdesk|software|developer|engineer|programmer|coding|hardware|electronics|circuit|audio engineer|a\/v tech|sound design|pc build|gaming hardware|custom rig|data analy|machine learn|artificial intellig|ai |lab tech|research|stem|biotech|nanotec)\b/i,
  'Travel, Transportation, and Logistics': /\b(travel advis|hotel|concierge|hospitality|pilot|flight attend|aviation|mechanic|auto repair|detailing|cdl|fleet|truck driv|logistics|supply chain|warehouse|transit|rail)\b/i,
};

const ALL_RPGS = [
  'Arts, Design, and Creative Production',
  'Beauty and Personal Care',
  'Business, Communications, and Professional Services',
  'Education, Training, and Child Development',
  'Entertainment, Media, and Creator Economy',
  'Fashion and Accessories',
  'Food and Beverage',
  'Health and Wellness',
  'Home Improvement and Skilled Trades',
  'Outdoors, Agriculture, and Land',
  'Pet and Animal Care',
  'Safety, Security, and Emergency Response',
  'Sports, Fitness, and Performance',
  'Technology and Science',
  'Travel, Transportation, and Logistics',
];

// ============================================================
// LOCATION ANALYSIS (for market tracking)
// ============================================================

const MARKET_PATTERNS = {
  'Chicago': {
    cities: ['chicago'],
    states: ['IL'],
    zips: /^(606|607|608)/,
  },
  'Los Angeles': {
    cities: ['los angeles', 'la', 'hollywood', 'beverly hills', 'santa monica', 'burbank', 'pasadena', 'glendale', 'long beach', 'culver city', 'west hollywood'],
    states: ['CA'],
    zips: /^(900|901|902|903|904|905|906|907|908|910|911|912|913|914|916|917|918)/,
  },
  'New York': {
    cities: ['new york', 'nyc', 'brooklyn', 'manhattan', 'queens', 'bronx', 'staten island'],
    states: ['NY'],
    zips: /^(100|101|102|103|104|110|111|112|113|114|116)/,
  },
  'Bentonville': {
    cities: ['bentonville', 'rogers', 'fayetteville', 'springdale', 'bella vista', 'lowell'],
    states: ['AR'],
    zips: /^(727)/,
  },
};

function classifyMarket(expert) {
  const city = (expert.city || '').toLowerCase().trim();
  const state = (expert.state || '').toUpperCase().trim();
  const zip = (expert.zipCode || expert.zip || '').toString().trim();

  const markets = [];
  for (const [market, patterns] of Object.entries(MARKET_PATTERNS)) {
    if (patterns.cities.some(c => city.includes(c))) {
      markets.push(market);
    } else if (zip && patterns.zips && patterns.zips.test(zip)) {
      markets.push(market);
    }
  }
  return markets;
}

// ============================================================
// EXPERT ANALYSIS FUNCTIONS
// ============================================================

function getExpertText(expert) {
  const fields = [
    expert.description || '',
    expert.short_description || '',
    expert.jobTitle || '',
    expert.areasOfExpertise || '',
    expert.best_known_for || '',
    expert.company || '',
  ];

  const kp = expert.keyPoints || [];
  if (Array.isArray(kp)) {
    for (const item of kp) {
      if (typeof item === 'object' && item.keyPoint) fields.push(item.keyPoint);
      else if (typeof item === 'string') fields.push(item);
    }
  }
  return fields.join(' ');
}

function getSubRpgFromSubProfession(profEntry) {
  const subProf = profEntry.subProfession;
  if (!subProf || !subProf.name) return null;

  const subName = subProf.name;
  if (SUB_PROFESSION_TO_SUB_RPG[subName]) return SUB_PROFESSION_TO_SUB_RPG[subName];

  for (const [key, mapping] of Object.entries(SUB_PROFESSION_TO_SUB_RPG)) {
    if (subName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(subName.toLowerCase())) {
      return mapping;
    }
  }
  return null;
}

function assignRpgs(expert, maxRpgs = 2) {
  const assignments = [];
  const seenRpgs = new Set();

  const profs = (expert.professions || []).sort((a, b) => (a.order || 99) - (b.order || 99));

  // Process ALL professions (not just top 2) for sub-RPG counting
  for (const profEntry of profs) {
    if (assignments.length >= maxRpgs) break;

    const profName = profEntry.profession?.name || '';
    const subRpgOverride = getSubRpgFromSubProfession(profEntry);

    const mapping = PROFESSION_TO_RPG[profName];
    if (mapping) {
      const [rpgName, defaultSubRpg] = mapping;
      let actualSubRpg = defaultSubRpg;

      if (subRpgOverride && subRpgOverride[0] === rpgName) {
        actualSubRpg = subRpgOverride[1];
      }

      if (!seenRpgs.has(rpgName)) {
        assignments.push({ rpg: rpgName, subRpg: actualSubRpg, source: 'profession' });
        seenRpgs.add(rpgName);
      }

      if (subRpgOverride && subRpgOverride[0] !== rpgName && !seenRpgs.has(subRpgOverride[0]) && assignments.length < maxRpgs) {
        assignments.push({ rpg: subRpgOverride[0], subRpg: subRpgOverride[1], source: 'profession' });
        seenRpgs.add(subRpgOverride[0]);
      }
    }
  }

  // Bio keyword fallback
  if (assignments.length < maxRpgs) {
    const text = getExpertText(expert);
    if (text.trim()) {
      const scores = {};
      for (const [rpg, pattern] of Object.entries(RPG_KEYWORDS)) {
        if (!seenRpgs.has(rpg)) {
          const matches = text.match(new RegExp(pattern, 'gi'));
          if (matches) scores[rpg] = matches.length;
        }
      }

      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      for (const [rpg, score] of sorted) {
        if (assignments.length >= maxRpgs) break;
        if (score >= 1) {
          assignments.push({ rpg, subRpg: 'Bio-inferred', source: 'bio_keyword' });
          seenRpgs.add(rpg);
        }
      }
    }
  }

  return assignments.slice(0, maxRpgs);
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

export function runAnalysis(experts, salesOverrides = []) {
  const rpgCounts = {};
  const rpgSubCounts = {};
  const rpgSource = {};
  const marketCounts = { Chicago: 0, 'Los Angeles': 0, 'New York': 0, Bentonville: 0 };
  const bipocCount = { total: 0, percentage: 0 };
  let unassignedCount = 0;

  // Initialize
  for (const rpg of ALL_RPGS) {
    rpgCounts[rpg] = 0;
    rpgSubCounts[rpg] = {};
    rpgSource[rpg] = { profession: 0, bio_keyword: 0 };
  }

  // Process each expert
  for (const expert of experts) {
    // Market classification
    const markets = classifyMarket(expert);
    for (const m of markets) {
      if (marketCounts[m] !== undefined) marketCounts[m]++;
    }

    // BIPOC tracking (check demographic fields)
    const ethnicity = (expert.ethnicity || expert.race || '').toLowerCase();
    if (ethnicity && !ethnicity.includes('white') && !ethnicity.includes('caucasian') && ethnicity !== 'prefer not to say' && ethnicity !== '') {
      bipocCount.total++;
    }

    // RPG assignment
    const assignments = assignRpgs(expert);
    if (assignments.length === 0) {
      unassignedCount++;
      continue;
    }

    for (const { rpg, subRpg, source } of assignments) {
      rpgCounts[rpg] = (rpgCounts[rpg] || 0) + 1;
      if (!rpgSubCounts[rpg]) rpgSubCounts[rpg] = {};
      rpgSubCounts[rpg][subRpg] = (rpgSubCounts[rpg][subRpg] || 0) + 1;
      if (rpgSource[rpg]) rpgSource[rpg][source]++;
    }
  }

  bipocCount.percentage = experts.length > 0 ? Math.round((bipocCount.total / experts.length) * 100) : 0;

  // ============================================================
  // SUB-RPG PRIORITIZATION
  // ============================================================

  const subRpgPriorities = [];

  // Apply sales overrides as demand boosts
  const demandBoosts = {};
  for (const override of salesOverrides) {
    if (!override || !override.trim()) continue;
    const term = override.toLowerCase().trim();

    // Search through sub-RPG demand keys for matches
    for (const key of Object.keys(SAMS_CLUB_SUB_RPG_DEMAND)) {
      if (key.toLowerCase().includes(term)) {
        demandBoosts[key] = (demandBoosts[key] || 0) + 5; // Boost by 5 demand points
      }
    }

    // Also search profession names
    for (const [profName, [rpg, subRpg]] of Object.entries(PROFESSION_TO_RPG)) {
      if (profName.toLowerCase().includes(term) || subRpg.toLowerCase().includes(term)) {
        const key = `${rpg}|${subRpg}`;
        demandBoosts[key] = (demandBoosts[key] || 0) + 5;
      }
    }
  }

  for (const [key, baseDemand] of Object.entries(SAMS_CLUB_SUB_RPG_DEMAND)) {
    const [rpg, subRpg] = key.split('|');
    const subs = rpgSubCounts[rpg] || {};
    const currentCount = subs[subRpg] || 0;

    const htf = HARD_TO_FILL[rpg] || 1.0;
    const boost = demandBoosts[key] || 0;
    const effectiveDemand = baseDemand + boost;

    let gapMult;
    if (currentCount < 3) gapMult = 5.0;
    else if (currentCount < 10) gapMult = 4.0;
    else if (currentCount < 20) gapMult = 3.0;
    else if (currentCount < 40) gapMult = 2.0;
    else if (currentCount < 75) gapMult = 1.5;
    else gapMult = 1.0;

    const score = effectiveDemand * gapMult * htf;

    // Calculate recruitment target
    let target;
    if (baseDemand >= 8) target = 25;
    else if (baseDemand >= 6) target = 15;
    else target = 10;

    const gap = Math.max(0, target - currentCount);

    let urgency;
    if (currentCount === 0) urgency = 'CRITICAL';
    else if (currentCount < 5) urgency = 'HIGH';
    else if (currentCount < target * 0.5) urgency = 'MEDIUM';
    else urgency = 'LOW';

    subRpgPriorities.push({
      rpg,
      subRpg,
      currentCount,
      target,
      gap,
      demand: effectiveDemand,
      baseDemand,
      boosted: boost > 0,
      score: Math.round(score * 10) / 10,
      gapMult,
      htf,
      urgency,
    });
  }

  subRpgPriorities.sort((a, b) => b.score - a.score);

  // ============================================================
  // RPG-LEVEL PRIORITIES
  // ============================================================

  const rpgPriorities = ALL_RPGS.map(rpg => {
    const count = rpgCounts[rpg] || 0;
    const demand = RETAIL_DEMAND[rpg] || 5;
    const htf = HARD_TO_FILL[rpg] || 1.0;

    let gapMult;
    if (count < 10) gapMult = 5.0;
    else if (count < 25) gapMult = 4.0 - (count - 10) * (1.0 / 15);
    else if (count < 50) gapMult = 3.0 - (count - 25) * (0.5 / 25);
    else if (count < 100) gapMult = 2.5 - (count - 50) * (1.0 / 50);
    else if (count < 200) gapMult = 1.5 - (count - 100) * (0.5 / 100);
    else gapMult = 1.0;

    if (count > 300) gapMult *= 0.5;
    else if (count > 200) gapMult *= 0.7;

    const score = demand * gapMult * htf;

    return {
      rpg,
      count,
      demand,
      htf,
      score: Math.round(score * 10) / 10,
      subGroups: Object.entries(rpgSubCounts[rpg] || {})
        .map(([name, cnt]) => ({ name, count: cnt }))
        .sort((a, b) => b.count - a.count),
    };
  }).sort((a, b) => b.score - a.score);

  return {
    metadata: {
      totalExperts: experts.length,
      analysisDate: new Date().toISOString(),
      unassigned: unassignedCount,
      salesOverrides,
    },
    rpgPriorities,
    subRpgPriorities,
    topTen: subRpgPriorities.slice(0, 10),
    markets: marketCounts,
    bipoc: bipocCount,
  };
}
