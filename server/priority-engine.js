/**
 * RPG Coverage Analysis & Prioritization Engine - V4.1
 *
 * Architecture changes from V3:
 *   1. Dual-count analysis: mapped (pitchable) + core (specialist identity) counts
 *   2. Recalibrated demand weights from TDC-09 business judgment
 *   3. Core-based urgency labels and gap multipliers
 *   4. Bentonville geographic priority multiplier
 *   5. Unique expert count per RPG (deduplicated humans)
 *   6. Inflation ratio detection (mapped/core)
 *
 * Previous V3 architecture retained:
 *   - One-to-MANY mapping: each profession maps to an array of [RPG, subRPG] pairs
 *   - No artificial limits: experts count in EVERY sub-RPG they could be pitched for
 *   - Bio inference is separated out as a "scrub candidates" output, not used for counting
 *   - Self-validation layer compares computed counts against direct profession-to-subRPG lookups
 *
 * Exports: runAnalysis (main), validateCounts, getScrubCandidates
 */

// ============================================================
// PROFESSION-TO-RPG MAPPING (one-to-MANY)
// Each profession maps to an array of [RPG, subRPG] pairs.
// An expert with this profession counts in ALL listed sub-RPGs.
// ============================================================

const PROFESSION_TO_RPG = {
  // ============================================================
  // FOOD & BEVERAGE CLUSTER
  // ============================================================

  'Chef': [
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Food and Beverage', 'BBQ and Grilling'],
    ['Food and Beverage', 'Baking and Pastry'],
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Food and Beverage', 'Coffee and Tea'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
  ],
  'Mixologist': [
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Food and Beverage', 'Coffee and Tea'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
  ],
  'Sommelier': [
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
  ],
  'Wine Expert': [
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
  ],
  'Barista': [
    ['Food and Beverage', 'Coffee and Tea'],
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Food Scientist': [
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Technology and Science', 'Science and Lab'],
  ],
  'Baker/Pastry Chef': [
    ['Food and Beverage', 'Baking and Pastry'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
  ],
  'BBQ/Grill Expert': [
    ['Food and Beverage', 'BBQ and Grilling'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Home Improvement and Skilled Trades', 'Landscaping and Outdoor Build'],
  ],
  'Restaurant Owner': [
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Food and Beverage', 'Food Science and Product Testing'],
  ],
  'Hospitality Expert': [
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Food and Beverage', 'Coffee and Tea'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
  ],
  'Herbalist': [
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Food and Beverage', 'Coffee and Tea'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Outdoors, Agriculture, and Land', 'Gardening and Horticulture'],
  ],

  // ============================================================
  // BEAUTY & PERSONAL CARE CLUSTER
  // ============================================================

  'Beauty Expert': [
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Beauty and Personal Care', 'Skincare and Esthetics'],
    ['Beauty and Personal Care', 'Makeup (Artist, Educator)'],
    ['Beauty and Personal Care', 'Hair (Stylist, Color, Barber)'],
    ['Beauty and Personal Care', 'Nails and Lash/Brow'],
    ['Health and Wellness', 'Wellness Practitioners'],
  ],
  'Esthetician': [
    ['Beauty and Personal Care', 'Skincare and Esthetics'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Beauty and Personal Care', 'Nails and Lash/Brow'],
    ['Health and Wellness', 'Wellness Practitioners'],
  ],
  'Hair Stylist/Barber': [
    ['Beauty and Personal Care', 'Hair (Stylist, Color, Barber)'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
  ],
  'Makeup Artist': [
    ['Beauty and Personal Care', 'Makeup (Artist, Educator)'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Beauty and Personal Care', 'Skincare and Esthetics'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  ],
  'Nail Technician': [
    ['Beauty and Personal Care', 'Nails and Lash/Brow'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
  ],

  // ============================================================
  // HEALTH & MEDICAL CLUSTER
  // ============================================================

  'Doctor': [
    ['Health and Wellness', 'Physicians (MD, DO)'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Health and Wellness', 'Mental and Behavioral Health'],
    ['Technology and Science', 'Science and Lab'],
  ],
  'Medical Professions': [
    ['Health and Wellness', 'Physicians (MD, DO)'],
    ['Health and Wellness', 'Nursing and Clinical Care'],
    ['Health and Wellness', 'Pharmacy and Medication'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Physical Therapy and Rehab'],
    ['Health and Wellness', 'Dental and Oral Health'],
    ['Health and Wellness', 'Vision and Eye Care'],
    ['Health and Wellness', 'Mental and Behavioral Health'],
  ],
  'Nurse': [
    ['Health and Wellness', 'Nursing and Clinical Care'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Physicians (MD, DO)'],
    ['Health and Wellness', 'Mental and Behavioral Health'],
  ],
  'Pharmacist': [
    ['Health and Wellness', 'Pharmacy and Medication'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Beauty and Personal Care', 'Skincare and Esthetics'],
  ],
  'Dentist': [
    ['Health and Wellness', 'Dental and Oral Health'],
    ['Health and Wellness', 'Physicians (MD, DO)'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Beauty and Personal Care', 'Skincare and Esthetics'],
  ],
  'Physician Assistant': [
    ['Health and Wellness', 'Physicians (MD, DO)'],
    ['Health and Wellness', 'Nursing and Clinical Care'],
    ['Health and Wellness', 'Wellness Practitioners'],
  ],
  'Nutrition Coach': [
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Health and Wellness', 'Wellness Practitioners'],
  ],
  'Dietician': [
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
  ],
  'Physical Therapist': [
    ['Health and Wellness', 'Physical Therapy and Rehab'],
    ['Sports, Fitness, and Performance', 'Recovery and Bodywork'],
    ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
    ['Health and Wellness', 'Wellness Practitioners'],
  ],
  'Occupational Therapist': [
    ['Health and Wellness', 'Physical Therapy and Rehab'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Mental and Behavioral Health'],
    ['Education, Training, and Child Development', 'Special Education and Learning Support'],
    ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
    ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],
  ],
  'Therapist': [
    ['Health and Wellness', 'Mental and Behavioral Health'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
  ],
  'Speech/Language Expert': [
    ['Health and Wellness', 'Mental and Behavioral Health'],
    ['Education, Training, and Child Development', 'Special Education and Learning Support'],
    ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
    ['Health and Wellness', 'Physical Therapy and Rehab'],
  ],
  'Wellness Expert': [
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Health and Wellness', 'Mental and Behavioral Health'],
    ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
    ['Sports, Fitness, and Performance', 'Recovery and Bodywork'],
    ['Beauty and Personal Care', 'Skincare and Esthetics'],
  ],
  'Genetics Expert': [
    ['Technology and Science', 'Science and Lab'],
    ['Health and Wellness', 'Physicians (MD, DO)'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
  ],
  'Doula': [
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
    ['Health and Wellness', 'Nursing and Clinical Care'],
  ],
  'Pediatric Sleep Consultant': [
    ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Mental and Behavioral Health'],
  ],
  'Water Expert': [
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Home Improvement and Skilled Trades', 'Plumbing'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Technology and Science', 'Science and Lab'],
  ],

  // ============================================================
  // SPORTS, FITNESS, AND PERFORMANCE CLUSTER
  // ============================================================

  'Fitness Expert': [
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
    ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
    ['Sports, Fitness, and Performance', 'Recovery and Bodywork'],
    ['Sports, Fitness, and Performance', 'Sports Coaching (Team, Youth)'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Athlete': [
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Sports, Fitness, and Performance', 'Sports Coaching (Team, Youth)'],
    ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
    ['Sports, Fitness, and Performance', 'Recovery and Bodywork'],
    ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
    ['Health and Wellness', 'Nutrition and Dietetics'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Fashion and Accessories', 'Apparel Design and Production'],
  ],
  'Coach': [
    ['Sports, Fitness, and Performance', 'Sports Coaching (Team, Youth)'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
    ['Education, Training, and Child Development', 'K-12 Education'],
    ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
  ],
  'Extreme Sports': [
    ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Sports, Fitness, and Performance', 'Recovery and Bodywork'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
  ],
  'Rock Climber': [
    ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
  ],
  'Dancer': [
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
    ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Health and Wellness', 'Wellness Practitioners'],
  ],
  'Motorcyclist': [
    ['Travel, Transportation, and Logistics', 'Automotive (Mechanic, Detailing)'],
    ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
  ],

  // ============================================================
  // TECHNOLOGY CLUSTER
  // ============================================================

  'Technology Expert': [
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Technology and Science', 'Gaming Tech (Hardware, PC build)'],
    ['Technology and Science', 'IT Support and Systems'],
    ['Technology and Science', 'Hardware and Engineering'],
    ['Technology and Science', 'Software and Developer'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
  ],
  'Audio Tech Expert': [
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
  ],
  'Audio/Visual Technician': [
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
  ],
  'Gamer': [
    ['Entertainment, Media, and Creator Economy', 'Gaming and Streaming Creators'],
    ['Technology and Science', 'Gaming Tech (Hardware, PC build)'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
  ],
  'Video Game Developer': [
    ['Technology and Science', 'Software and Developer'],
    ['Entertainment, Media, and Creator Economy', 'Gaming and Streaming Creators'],
    ['Technology and Science', 'Gaming Tech (Hardware, PC build)'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Lighting Designer': [
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
    ['Home Improvement and Skilled Trades', 'Electrical'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
    ['Arts, Design, and Creative Production', 'Photo and Video Production'],
  ],
  'Engineer': [
    ['Technology and Science', 'Hardware and Engineering'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'Software and Developer'],
    ['Technology and Science', 'IT Support and Systems'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Technology and Science', 'Science and Lab'],
  ],
  'STEM Expert': [
    ['Technology and Science', 'Science and Lab'],
    ['Technology and Science', 'Hardware and Engineering'],
    ['Technology and Science', 'Software and Developer'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Education, Training, and Child Development', 'K-12 Education'],
    ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
  ],
  'Scientist': [
    ['Technology and Science', 'Science and Lab'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Food and Beverage', 'Food Science and Product Testing'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Technology and Science', 'Hardware and Engineering'],
  ],
  'Drone Operator': [
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Arts, Design, and Creative Production', 'Photo and Video Production'],
    ['Technology and Science', 'Hardware and Engineering'],
    ['Outdoors, Agriculture, and Land', 'Farming and Ranching'],
    ['Travel, Transportation, and Logistics', 'Aviation and Airport'],
  ],

  // ============================================================
  // HOME IMPROVEMENT & SKILLED TRADES CLUSTER
  // ============================================================

  'Home Improvement Expert': [
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
    ['Home Improvement and Skilled Trades', 'Painting and Finishing'],
    ['Home Improvement and Skilled Trades', 'Flooring and Tile'],
    ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
    ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],
    ['Home Improvement and Skilled Trades', 'Landscaping and Outdoor Build'],
    ['Home Improvement and Skilled Trades', 'Electrical'],
    ['Home Improvement and Skilled Trades', 'Plumbing'],
    ['Home Improvement and Skilled Trades', 'HVAC and Ventilation'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Electrician': [
    ['Home Improvement and Skilled Trades', 'Electrical'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
  ],
  'Plumber': [
    ['Home Improvement and Skilled Trades', 'Plumbing'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
  ],
  'HVAC Technician': [
    ['Home Improvement and Skilled Trades', 'HVAC and Ventilation'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Woodworker': [
    ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
  ],
  'Appliance Repair Technician': [
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Painter/Finishing Specialist': [
    ['Home Improvement and Skilled Trades', 'Painting and Finishing'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
  ],
  'Furniture Restoration/Upholstery Expert': [
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
  ],
  'Interior Designer': [
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Painting and Finishing'],
    ['Home Improvement and Skilled Trades', 'Flooring and Tile'],
    ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Gardening/Landscaping Expert': [
    ['Outdoors, Agriculture, and Land', 'Gardening and Horticulture'],
    ['Home Improvement and Skilled Trades', 'Landscaping and Outdoor Build'],
    ['Outdoors, Agriculture, and Land', 'Landscaping and Outdoor Build'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
  ],
  'Florist': [
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Outdoors, Agriculture, and Land', 'Gardening and Horticulture'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
  ],
  'DIY Creator': [
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Painting and Finishing'],
    ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
    ['Home Improvement and Skilled Trades', 'Flooring and Tile'],
    ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Homesteader': [
    ['Outdoors, Agriculture, and Land', 'Farming and Ranching'],
    ['Outdoors, Agriculture, and Land', 'Gardening and Horticulture'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
  ],

  // ============================================================
  // OUTDOORS, AGRICULTURE, AND LAND CLUSTER
  // ============================================================

  'Farmer/Rancher': [
    ['Outdoors, Agriculture, and Land', 'Farming and Ranching'],
    ['Outdoors, Agriculture, and Land', 'Gardening and Horticulture'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Home Improvement and Skilled Trades', 'Landscaping and Outdoor Build'],
    ['Travel, Transportation, and Logistics', 'Logistics and Supply Chain'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Adventurer/Outdoors': [
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
  ],
  'Survivalist/Emergency Preparedness Expert': [
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
    ['Safety, Security, and Emergency Response', 'Fire and Emergency Response'],
    ['Home Improvement and Skilled Trades', 'Handyman and Home Maintenance'],
  ],
  'Boater/Fisherman': [
    ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Hunter/Angler': [
    ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Food and Beverage', 'BBQ and Grilling'],
  ],
  'Sustainability Expert': [
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'HVAC and Ventilation'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
  ],
  'Firearms Trainer': [
    ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
    ['Safety, Security, and Emergency Response', 'Private Security and Protection'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
    ['Sports, Fitness, and Performance', 'Sports Coaching (Team, Youth)'],
    ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
  ],
  'Zoologist': [
    ['Pet and Animal Care', 'Specialty Animals'],
    ['Pet and Animal Care', 'Animal Care and Rescue'],
    ['Pet and Animal Care', 'Veterinary (Vet, Vet Tech)'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Technology and Science', 'Science and Lab'],
    ['Education, Training, and Child Development', 'K-12 Education'],
  ],

  // ============================================================
  // PET AND ANIMAL CARE CLUSTER
  // ============================================================

  'Veterinarian': [
    ['Pet and Animal Care', 'Veterinary (Vet, Vet Tech)'],
    ['Pet and Animal Care', 'Animal Care and Rescue'],
    ['Pet and Animal Care', 'Pet Training and Behavior'],
    ['Pet and Animal Care', 'Pet Grooming'],
    ['Pet and Animal Care', 'Specialty Animals'],
    ['Outdoors, Agriculture, and Land', 'Farming and Ranching'],
    ['Health and Wellness', 'Physicians (MD, DO)'],
  ],
  'Veterinary Technician': [
    ['Pet and Animal Care', 'Veterinary (Vet, Vet Tech)'],
    ['Pet and Animal Care', 'Animal Care and Rescue'],
    ['Pet and Animal Care', 'Pet Grooming'],
    ['Pet and Animal Care', 'Pet Training and Behavior'],
  ],
  'Dog Trainer': [
    ['Pet and Animal Care', 'Pet Training and Behavior'],
    ['Pet and Animal Care', 'Animal Care and Rescue'],
    ['Pet and Animal Care', 'Pet Grooming'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
  ],
  'Pet Expert': [
    ['Pet and Animal Care', 'Animal Care and Rescue'],
    ['Pet and Animal Care', 'Veterinary (Vet, Vet Tech)'],
    ['Pet and Animal Care', 'Pet Training and Behavior'],
    ['Pet and Animal Care', 'Pet Grooming'],
    ['Pet and Animal Care', 'Specialty Animals'],
  ],
  'Pet Groomer': [
    ['Pet and Animal Care', 'Pet Grooming'],
    ['Pet and Animal Care', 'Animal Care and Rescue'],
    ['Pet and Animal Care', 'Pet Training and Behavior'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
  ],

  // ============================================================
  // SAFETY, SECURITY, AND EMERGENCY RESPONSE CLUSTER
  // ============================================================

  'First Responder': [
    ['Safety, Security, and Emergency Response', 'Fire and Emergency Response'],
    ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Health and Wellness', 'Nursing and Clinical Care'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
  ],
  'Security Expert': [
    ['Safety, Security, and Emergency Response', 'Private Security and Protection'],
    ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'IT Support and Systems'],
  ],
  'Military': [
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Safety, Security, and Emergency Response', 'Fire and Emergency Response'],
    ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
    ['Safety, Security, and Emergency Response', 'Private Security and Protection'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
  ],
  'Veteran': [
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Safety, Security, and Emergency Response', 'Fire and Emergency Response'],
    ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
    ['Safety, Security, and Emergency Response', 'Private Security and Protection'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Outdoors, Agriculture, and Land', 'Hunting, Fishing, and Sporting Outdoors'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],

  // ============================================================
  // ENTERTAINMENT, MEDIA, AND CREATOR ECONOMY CLUSTER
  // ============================================================

  'Actor/TV Personality': [
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
  ],
  'Entertainer': [
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
  ],
  'Music Producer': [
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
  ],
  'Musician': [
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
    ['Education, Training, and Child Development', 'K-12 Education'],
  ],
  'Recording Artist': [
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  ],
  'DJ': [
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  ],
  'Talk Show Host': [
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  ],
  'TV/Film Commentator': [
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  ],
  'TV/Media Producer': [
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
    ['Arts, Design, and Creative Production', 'Photo and Video Production'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
  ],
  'Live Streamer/Content Creator': [
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Entertainment, Media, and Creator Economy', 'Gaming and Streaming Creators'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
  ],
  'Podcaster': [
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Blogger': [
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
  ],
  'Reporter/Journalist': [
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
  ],
  'Journalist': [
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
  ],
  'Author': [
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Entertainment, Media, and Creator Economy', 'Podcasting and Audio Content'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Education, Training, and Child Development', 'K-12 Education'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
  ],

  // ============================================================
  // FASHION AND ACCESSORIES CLUSTER
  // ============================================================

  'Fashion Designer': [
    ['Fashion and Accessories', 'Apparel Design and Production'],
    ['Fashion and Accessories', 'Styling (Wardrobe, Personal Style)'],
    ['Fashion and Accessories', 'Fashion Retail and Merchandising'],
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
  ],
  'Fashion Stylist': [
    ['Fashion and Accessories', 'Styling (Wardrobe, Personal Style)'],
    ['Fashion and Accessories', 'Apparel Design and Production'],
    ['Fashion and Accessories', 'Fashion Retail and Merchandising'],
    ['Fashion and Accessories', 'Jewelry and Watches'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Beauty and Personal Care', 'Makeup (Artist, Educator)'],
  ],
  'Jeweler/Jewelry Expert': [
    ['Fashion and Accessories', 'Jewelry and Watches'],
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Fashion and Accessories', 'Styling (Wardrobe, Personal Style)'],
    ['Fashion and Accessories', 'Fashion Retail and Merchandising'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
  ],
  'Model': [
    ['Fashion and Accessories', 'Styling (Wardrobe, Personal Style)'],
    ['Fashion and Accessories', 'Apparel Design and Production'],
    ['Fashion and Accessories', 'Fashion Retail and Merchandising'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Beauty and Personal Care', 'Skincare and Esthetics'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
  ],

  // ============================================================
  // ARTS, DESIGN, AND CREATIVE PRODUCTION CLUSTER
  // ============================================================

  'Artist': [
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
    ['Arts, Design, and Creative Production', 'Photo and Video Production'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Education, Training, and Child Development', 'K-12 Education'],
  ],
  'Photographer': [
    ['Arts, Design, and Creative Production', 'Photo and Video Production'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Arts, Design, and Creative Production', 'Makers and Crafts (Artisan)'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
  ],
  'Videographer': [
    ['Arts, Design, and Creative Production', 'Photo and Video Production'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
  ],
  'Cinematographer': [
    ['Arts, Design, and Creative Production', 'Photo and Video Production'],
    ['Technology and Science', 'Audio, Video, and A/V Tech'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
  ],
  'Architect': [
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Home Improvement and Skilled Trades', 'Landscaping and Outdoor Build'],
    ['Technology and Science', 'Software and Developer'],
    ['Business, Communications, and Professional Services', 'Real Estate (Residential, Commercial)'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
  ],

  // ============================================================
  // BUSINESS, COMMUNICATIONS, AND PROFESSIONAL SERVICES CLUSTER
  // ============================================================

  'Entrepreneur': [
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Business, Communications, and Professional Services', 'Sales and Partnerships'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Business, Communications, and Professional Services', 'Finance and Accounting'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
  ],
  'CEO/Founder': [
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Business, Communications, and Professional Services', 'Sales and Partnerships'],
    ['Business, Communications, and Professional Services', 'Finance and Accounting'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
  ],
  'Business Executive': [
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Business, Communications, and Professional Services', 'Sales and Partnerships'],
    ['Business, Communications, and Professional Services', 'Finance and Accounting'],
    ['Business, Communications, and Professional Services', 'HR and Talent'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
  ],
  'Business/Office Expert': [
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Business, Communications, and Professional Services', 'HR and Talent'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'IT Support and Systems'],
  ],
  'Financial Advisor': [
    ['Business, Communications, and Professional Services', 'Finance and Accounting'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Business, Communications, and Professional Services', 'Real Estate (Residential, Commercial)'],
  ],
  'Lawyer': [
    ['Business, Communications, and Professional Services', 'Legal and Compliance'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Business, Communications, and Professional Services', 'Real Estate (Residential, Commercial)'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
  ],
  'Paralegal': [
    ['Business, Communications, and Professional Services', 'Legal and Compliance'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
  ],
  'Realtor': [
    ['Business, Communications, and Professional Services', 'Real Estate (Residential, Commercial)'],
    ['Business, Communications, and Professional Services', 'Sales and Partnerships'],
    ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
    ['Business, Communications, and Professional Services', 'Finance and Accounting'],
  ],
  'Operations/Logistics Expert': [
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Travel, Transportation, and Logistics', 'Logistics and Supply Chain'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Technology and Science', 'IT Support and Systems'],
  ],
  'Retail Buyer': [
    ['Fashion and Accessories', 'Fashion Retail and Merchandising'],
    ['Business, Communications, and Professional Services', 'Sales and Partnerships'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Food and Beverage', 'Food Science and Product Testing'],
  ],
  'Talent Management': [
    ['Business, Communications, and Professional Services', 'HR and Talent'],
    ['Entertainment, Media, and Creator Economy', 'Acting and Performance'],
    ['Business, Communications, and Professional Services', 'Sales and Partnerships'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
  ],
  'Advocate': [
    ['Business, Communications, and Professional Services', 'Communications and PR'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Safety, Security, and Emergency Response', 'Law Enforcement and Public Safety'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Education, Training, and Child Development', 'K-12 Education'],
  ],
  'Event Planner': [
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Business, Communications, and Professional Services', 'Communications and PR'],
    ['Entertainment, Media, and Creator Economy', 'On-Camera Host and Presenter'],
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
  ],
  'Venue Owner': [
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Business, Communications, and Professional Services', 'Operations and Project Management'],
    ['Entertainment, Media, and Creator Economy', 'Music (Producer, Artist, DJ)'],
    ['Food and Beverage', 'Mixology and Bar (Cocktails)'],
  ],
  'Lifestyle Expert': [
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
    ['Beauty and Personal Care', 'Beauty Retail and Education'],
    ['Fashion and Accessories', 'Styling (Wardrobe, Personal Style)'],
    ['Food and Beverage', 'Chef and Culinary (General)'],
    ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  'Urban Planner': [
    ['Business, Communications, and Professional Services', 'Real Estate (Residential, Commercial)'],
    ['Outdoors, Agriculture, and Land', 'Environmental and Conservation'],
    ['Home Improvement and Skilled Trades', 'Landscaping and Outdoor Build'],
    ['Travel, Transportation, and Logistics', 'Public Transit and Rail'],
    ['Arts, Design, and Creative Production', 'Interior and Spatial Design'],
  ],

  // ============================================================
  // EDUCATION, TRAINING, AND CHILD DEVELOPMENT CLUSTER
  // ============================================================

  'Educator': [
    ['Education, Training, and Child Development', 'K-12 Education'],
    ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
    ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
    ['Education, Training, and Child Development', 'Special Education and Learning Support'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
  ],
  // NOTE: Coach is duplicated in Sports cluster above - only keep one
  'Life Coach': [
    ['Education, Training, and Child Development', 'Corporate Training and Coaching'],
    ['Health and Wellness', 'Mental and Behavioral Health'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Business, Communications, and Professional Services', 'Entrepreneurship and Small Business'],
    ['Sports, Fitness, and Performance', 'Sports Coaching (Team, Youth)'],
  ],
  'Nanny': [
    ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
    ['Education, Training, and Child Development', 'K-12 Education'],
    ['Health and Wellness', 'Wellness Practitioners'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
  ],
  'Social Worker': [
    ['Health and Wellness', 'Mental and Behavioral Health'],
    ['Education, Training, and Child Development', 'Early Childhood and Parenting Education'],
    ['Education, Training, and Child Development', 'Special Education and Learning Support'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Business, Communications, and Professional Services', 'HR and Talent'],
  ],

  // ============================================================
  // TRAVEL, TRANSPORTATION, AND LOGISTICS CLUSTER
  // ============================================================

  'Travel Expert': [
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Outdoors, Agriculture, and Land', 'Camping, Hiking, Survival'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Entertainment, Media, and Creator Economy', 'Influencer and Creator (Lifestyle)'],
  ],
  'Aviation': [
    ['Travel, Transportation, and Logistics', 'Aviation and Airport'],
    ['Technology and Science', 'Hardware and Engineering'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
  ],
  'Astronaut': [
    ['Travel, Transportation, and Logistics', 'Aviation and Airport'],
    ['Technology and Science', 'Science and Lab'],
    ['Technology and Science', 'Hardware and Engineering'],
    ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
    ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
    ['Education, Training, and Child Development', 'K-12 Education'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
  ],
  'Automotive Expert': [
    ['Travel, Transportation, and Logistics', 'Automotive (Mechanic, Detailing)'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'Hardware and Engineering'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
  ],
  'Auto Technician': [
    ['Travel, Transportation, and Logistics', 'Automotive (Mechanic, Detailing)'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Technology and Science', 'Hardware and Engineering'],
    ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
  ],
  'Trucking/Transportation Expert': [
    ['Travel, Transportation, and Logistics', 'Commercial Driving and Fleet'],
    ['Travel, Transportation, and Logistics', 'Logistics and Supply Chain'],
    ['Technology and Science', 'Consumer Tech and Smart Home'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
  ],
  'Train Conductor': [
    ['Travel, Transportation, and Logistics', 'Public Transit and Rail'],
    ['Travel, Transportation, and Logistics', 'Travel and Hospitality'],
    ['Safety, Security, and Emergency Response', 'Workplace Safety and Compliance (EHS)'],
  ],
};

// ============================================================
// SUB-PROFESSION OVERRIDES
// When an expert has a sub-profession that matches here, it ADDS
// the specific sub-RPG routing ON TOP of all default mappings.
// A baker-chef is still a chef (gets all Chef defaults + Baking).
// ============================================================

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
  'Medical Professions - Psychiatrist': ['Health and Wellness', 'Mental and Behavioral Health'],
  'Psychiatrist': ['Health and Wellness', 'Mental and Behavioral Health'],
  'Medical Professions - Emergency Medicine': ['Safety, Security, and Emergency Response', 'Emergency Management and Preparedness'],
  'Medical Professions - Ophthalmologist': ['Health and Wellness', 'Vision and Eye Care'],
  'Ophthalmologist': ['Health and Wellness', 'Vision and Eye Care'],
  'Home Improvement Expert - Carpenter': ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
  'Carpenter': ['Home Improvement and Skilled Trades', 'Carpentry and Woodwork'],
  'Home Improvement Expert - Home Organizer': ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],
  'Home Improvement Expert - Painter': ['Home Improvement and Skilled Trades', 'Painting and Finishing'],
  'Home Improvement Expert - Flooring': ['Home Improvement and Skilled Trades', 'Flooring and Tile'],
  'Home Improvement Expert - Appliance Repair': ['Home Improvement and Skilled Trades', 'Appliance Repair and Installation'],
  'Home Improvement Expert - Roofer': ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
  'Home Improvement Expert - Mason': ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
  'Chef - Baker': ['Food and Beverage', 'Baking and Pastry'],
  'Baker': ['Food and Beverage', 'Baking and Pastry'],
  'Chef - BBQ': ['Food and Beverage', 'BBQ and Grilling'],
  'Chef - Pastry': ['Food and Beverage', 'Baking and Pastry'],
  'Gardening/Landscaping Expert - Horticulturist': ['Outdoors, Agriculture, and Land', 'Gardening and Horticulture'],
  'Fitness Expert - Yoga': ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
  'Fitness Expert - Pilates': ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
  'Fitness Expert - Recovery': ['Sports, Fitness, and Performance', 'Recovery and Bodywork'],
  'Fitness Expert - Endurance': ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],
  'Fitness Expert - CrossFit': ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
  'Fitness Expert - Sports Medicine': ['Sports, Fitness, and Performance', 'Recovery and Bodywork'],
  'Technology Expert - Gaming': ['Technology and Science', 'Gaming Tech (Hardware, PC build)'],
  'Gamer - PC': ['Technology and Science', 'Gaming Tech (Hardware, PC build)'],

  // === NEW sub-profession routing entries (sub-profession fix 2026-03-18) ===

  // Home Improvement sub-professions (exact names from Portal)
  'General Contractor': ['Home Improvement and Skilled Trades', 'General Contractors and Remodel'],
  'Home Cleaning': ['Home Improvement and Skilled Trades', 'Home Cleaning and Organization'],

  // Medical sub-professions with different name endings than existing mappings
  'Medical Professions - Veterinary': ['Pet and Animal Care', 'Veterinary (Vet, Vet Tech)'],
  'Medical Professions - Dermatology': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions - OBGYN': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions - Pediatrics': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions - Sleep Specialist': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions - Psychology/Psychiatry': ['Health and Wellness', 'Mental and Behavioral Health'],
  'Medical Professions - Dietitian': ['Health and Wellness', 'Nutrition and Dietetics'],
  'Medical Professions - Chiropractic': ['Health and Wellness', 'Physical Therapy and Rehab'],
  'Medical Professions - Naturopathy': ['Health and Wellness', 'Wellness Practitioners'],
  'Medical Professions - Podiatry': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Medical Professions - Nutrition': ['Health and Wellness', 'Nutrition and Dietetics'],

  // Doctor sub-professions
  'Doctor - General Practitioner': ['Health and Wellness', 'Physicians (MD, DO)'],
  'Doctor - Specialist': ['Health and Wellness', 'Physicians (MD, DO)'],

  // Fitness sub-professions with different name endings
  'Fitness Expert - Yoga/Yogi': ['Sports, Fitness, and Performance', 'Yoga, Pilates, Mobility'],
  'Fitness Expert - Strength/Conditioning': ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
  'Fitness Expert - Weightlifting': ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
  'Fitness Expert - Runner': ['Sports, Fitness, and Performance', 'Endurance and Outdoor Fitness'],

  // Chef sub-professions
  'Chef - Sous Chef': ['Food and Beverage', 'Chef and Culinary (General)'],

  // First Responder sub-professions
  'First Responder - EMT': ['Safety, Security, and Emergency Response', 'Fire and Emergency Response'],

  // Beauty sub-professions
  'Cosmetologist': ['Beauty and Personal Care', 'Beauty Retail and Education'],

  // Fashion sub-professions
  'Wardrobe Stylist': ['Fashion and Accessories', 'Styling (Wardrobe, Personal Style)'],

  // Coach sub-professions
  'Coach - Personal Trainer': ['Sports, Fitness, and Performance', 'Personal Training and Strength'],
  'Coach - Sports Coach': ['Sports, Fitness, and Performance', 'Sports Coaching (Team, Youth)'],

  // Wellness sub-professions
  'Behavioral Health Professional': ['Health and Wellness', 'Mental and Behavioral Health'],

  // Scientist sub-professions (routing only, parent is already core)
  'Scientist - Chemist': ['Technology and Science', 'Science and Lab'],
};

// ============================================================
// CORE PROFESSIONS MAP (maintained by TDC-11 Expert Taxonomy Specialist)
// For each sub-RPG key (format: "RPG|SubRPG"), lists profession names
// classified as CORE specialists for that category.
// Core = this IS their professional identity (not just pitchable).
// Source: core_professions_map_20260318.json
// ============================================================

const CORE_PROFESSIONS = {
  'Food and Beverage|Chef and Culinary (General)': ['Chef', 'Restaurant Owner', 'Baker/Pastry Chef', 'BBQ/Grill Expert', 'Chef - Sous Chef'],
  'Food and Beverage|Food Science and Product Testing': ['Food Scientist'],
  'Food and Beverage|BBQ and Grilling': ['BBQ/Grill Expert', 'Chef - BBQ'],
  'Food and Beverage|Baking and Pastry': ['Baker/Pastry Chef', 'Chef - Baker', 'Baker', 'Chef - Pastry'],
  'Food and Beverage|Mixology and Bar (Cocktails)': ['Mixologist', 'Sommelier', 'Wine Expert'],
  'Food and Beverage|Coffee and Tea': ['Barista'],
  'Home Improvement and Skilled Trades|Appliance Repair and Installation': ['Appliance Repair Technician', 'Electrician', 'HVAC Technician', 'Plumber', 'Home Improvement Expert - Appliance Repair'],
  'Home Improvement and Skilled Trades|General Contractors and Remodel': ['Home Improvement Expert', 'Architect', 'Home Improvement Expert - Roofer', 'Home Improvement Expert - Mason', 'General Contractor'],
  'Home Improvement and Skilled Trades|Handyman and Home Maintenance': ['Home Improvement Expert', 'DIY Creator'],
  'Home Improvement and Skilled Trades|Home Cleaning and Organization': ['Home Improvement Expert', 'Home Improvement Expert - Home Organizer', 'Home Cleaning'],
  'Home Improvement and Skilled Trades|Painting and Finishing': ['Painter/Finishing Specialist', 'Home Improvement Expert - Painter'],
  'Home Improvement and Skilled Trades|Flooring and Tile': ['Home Improvement Expert', 'Home Improvement Expert - Flooring'],
  'Home Improvement and Skilled Trades|Carpentry and Woodwork': ['Woodworker', 'Home Improvement Expert - Carpenter', 'Carpenter'],
  'Home Improvement and Skilled Trades|Landscaping and Outdoor Build': ['Gardening/Landscaping Expert'],
  'Home Improvement and Skilled Trades|HVAC and Ventilation': ['HVAC Technician'],
  'Home Improvement and Skilled Trades|Electrical': ['Electrician', 'Lighting Designer'],
  'Home Improvement and Skilled Trades|Plumbing': ['Plumber'],
  'Health and Wellness|Wellness Practitioners': ['Wellness Expert', 'Herbalist', 'Life Coach', 'Doula', 'Medical Professions - Naturopathy'],
  'Health and Wellness|Nutrition and Dietetics': ['Dietician', 'Nutrition Coach', 'Medical Professions - Dietitian', 'Medical Professions - Nutrition'],
  'Health and Wellness|Mental and Behavioral Health': ['Therapist', 'Medical Professions - Psychiatrist', 'Psychiatrist', 'Medical Professions - Psychology/Psychiatry', 'Behavioral Health Professional'],
  'Health and Wellness|Physicians (MD, DO)': ['Doctor', 'Physician Assistant', 'Medical Professions - Dermatologist', 'Medical Professions - Cardiologist', 'Medical Professions - Pediatrician', 'Medical Professions - Dermatology', 'Medical Professions - OBGYN', 'Medical Professions - Pediatrics', 'Medical Professions - Sleep Specialist', 'Medical Professions - Podiatry', 'Doctor - General Practitioner', 'Doctor - Specialist'],
  'Health and Wellness|Nursing and Clinical Care': ['Nurse', 'Medical Professions - Nurse Practitioner', 'Nurse Practitioner'],
  'Health and Wellness|Pharmacy and Medication': ['Pharmacist'],
  'Health and Wellness|Physical Therapy and Rehab': ['Physical Therapist', 'Occupational Therapist', 'Medical Professions - Chiropractic'],
  'Health and Wellness|Dental and Oral Health': ['Dentist', 'Medical Professions - Dentistry', 'Dentistry'],
  'Health and Wellness|Vision and Eye Care': ['Medical Professions - Optometrist', 'Optometrist', 'Medical Professions - Ophthalmologist', 'Ophthalmologist'],
  'Technology and Science|Consumer Tech and Smart Home': ['Technology Expert', 'Audio Tech Expert', 'Audio/Visual Technician', 'Engineer'],
  'Technology and Science|Audio, Video, and A/V Tech': ['Audio Tech Expert', 'Audio/Visual Technician'],
  'Technology and Science|Hardware and Engineering': ['Engineer', 'STEM Expert'],
  'Technology and Science|Science and Lab': ['Scientist', 'Genetics Expert'],
  'Technology and Science|Gaming Tech (Hardware, PC build)': ['Gamer', 'Video Game Developer', 'Technology Expert - Gaming', 'Gamer - PC'],
  'Technology and Science|IT Support and Systems': ['Technology Expert', 'Engineer'],
  'Technology and Science|Software and Developer': ['Video Game Developer', 'Engineer'],
  'Beauty and Personal Care|Skincare and Esthetics': ['Esthetician', 'Beauty Expert'],
  'Beauty and Personal Care|Beauty Retail and Education': ['Beauty Expert', 'Retail Buyer', 'Cosmetologist'],
  'Beauty and Personal Care|Makeup (Artist, Educator)': ['Makeup Artist'],
  'Beauty and Personal Care|Hair (Stylist, Color, Barber)': ['Hair Stylist/Barber'],
  'Beauty and Personal Care|Nails and Lash/Brow': ['Nail Technician'],
  'Outdoors, Agriculture, and Land|Camping, Hiking, Survival': ['Adventurer/Outdoors', 'Survivalist/Emergency Preparedness Expert'],
  'Outdoors, Agriculture, and Land|Environmental and Conservation': ['Sustainability Expert', 'Zoologist'],
  'Outdoors, Agriculture, and Land|Hunting, Fishing, and Sporting Outdoors': ['Hunter/Angler', 'Boater/Fisherman', 'Firearms Trainer'],
  'Outdoors, Agriculture, and Land|Gardening and Horticulture': ['Gardening/Landscaping Expert', 'Florist', 'Gardening/Landscaping Expert - Horticulturist'],
  'Outdoors, Agriculture, and Land|Farming and Ranching': ['Farmer/Rancher', 'Homesteader'],
  'Outdoors, Agriculture, and Land|Landscaping and Outdoor Build': ['Gardening/Landscaping Expert'],
  'Safety, Security, and Emergency Response|Emergency Management and Preparedness': ['Survivalist/Emergency Preparedness Expert', 'First Responder', 'Military', 'Medical Professions - Emergency Medicine'],
  'Safety, Security, and Emergency Response|Law Enforcement and Public Safety': ['First Responder', 'Security Expert'],
  'Safety, Security, and Emergency Response|Workplace Safety and Compliance (EHS)': ['Security Expert'],
  'Safety, Security, and Emergency Response|Fire and Emergency Response': ['First Responder', 'First Responder - EMT'],
  'Safety, Security, and Emergency Response|Private Security and Protection': ['Security Expert', 'Firearms Trainer'],
  'Sports, Fitness, and Performance|Personal Training and Strength': ['Fitness Expert', 'Coach', 'Athlete', 'Fitness Expert - CrossFit', 'Fitness Expert - Strength/Conditioning', 'Fitness Expert - Weightlifting', 'Coach - Personal Trainer'],
  'Sports, Fitness, and Performance|Recovery and Bodywork': ['Physical Therapist', 'Wellness Expert', 'Fitness Expert - Recovery', 'Fitness Expert - Sports Medicine'],
  'Sports, Fitness, and Performance|Yoga, Pilates, Mobility': ['Fitness Expert', 'Dancer', 'Fitness Expert - Yoga', 'Fitness Expert - Pilates', 'Fitness Expert - Yoga/Yogi'],
  'Sports, Fitness, and Performance|Endurance and Outdoor Fitness': ['Athlete', 'Extreme Sports', 'Adventurer/Outdoors', 'Fitness Expert - Endurance', 'Fitness Expert - Runner'],
  'Sports, Fitness, and Performance|Sports Coaching (Team, Youth)': ['Coach', 'Athlete', 'Coach - Sports Coach'],
  'Arts, Design, and Creative Production|Photo and Video Production': ['Photographer', 'Videographer', 'Cinematographer'],
  'Arts, Design, and Creative Production|Makers and Crafts (Artisan)': ['Artist', 'Woodworker', 'Furniture Restoration/Upholstery Expert', 'DIY Creator', 'Jeweler/Jewelry Expert', 'Florist'],
  'Arts, Design, and Creative Production|Interior and Spatial Design': ['Interior Designer', 'Architect', 'Lighting Designer'],
  'Fashion and Accessories|Apparel Design and Production': ['Fashion Designer'],
  'Fashion and Accessories|Styling (Wardrobe, Personal Style)': ['Fashion Stylist', 'Wardrobe Stylist'],
  'Fashion and Accessories|Fashion Retail and Merchandising': ['Retail Buyer'],
  'Fashion and Accessories|Jewelry and Watches': ['Jeweler/Jewelry Expert'],
  'Travel, Transportation, and Logistics|Travel and Hospitality': ['Travel Expert', 'Hospitality Expert'],
  'Travel, Transportation, and Logistics|Automotive (Mechanic, Detailing)': ['Auto Technician', 'Automotive Expert'],
  'Travel, Transportation, and Logistics|Logistics and Supply Chain': ['Operations/Logistics Expert', 'Trucking/Transportation Expert'],
  'Travel, Transportation, and Logistics|Aviation and Airport': ['Aviation'],
  'Travel, Transportation, and Logistics|Commercial Driving and Fleet': ['Trucking/Transportation Expert'],
  'Travel, Transportation, and Logistics|Public Transit and Rail': ['Train Conductor'],
  'Entertainment, Media, and Creator Economy|Influencer and Creator (Lifestyle)': ['Live Streamer/Content Creator', 'Blogger', 'Lifestyle Expert'],
  'Entertainment, Media, and Creator Economy|Acting and Performance': ['Actor/TV Personality', 'Dancer', 'Entertainer', 'Musician', 'Recording Artist'],
  'Entertainment, Media, and Creator Economy|On-Camera Host and Presenter': ['Talk Show Host', 'TV/Film Commentator', 'Reporter/Journalist'],
  'Entertainment, Media, and Creator Economy|Podcasting and Audio Content': ['Podcaster'],
  'Entertainment, Media, and Creator Economy|Music (Producer, Artist, DJ)': ['Music Producer', 'Musician', 'Recording Artist', 'DJ'],
  'Entertainment, Media, and Creator Economy|Gaming and Streaming Creators': ['Gamer', 'Live Streamer/Content Creator', 'Video Game Developer'],
  'Education, Training, and Child Development|K-12 Education': ['Educator'],
  'Education, Training, and Child Development|Corporate Training and Coaching': ['Coach', 'Life Coach', 'Educator'],
  'Education, Training, and Child Development|Early Childhood and Parenting Education': ['Doula', 'Pediatric Sleep Consultant', 'Nanny'],
  'Education, Training, and Child Development|Special Education and Learning Support': ['Speech/Language Expert', 'Occupational Therapist'],
  'Business, Communications, and Professional Services|Entrepreneurship and Small Business': ['Entrepreneur', 'CEO/Founder', 'Business Executive'],
  'Business, Communications, and Professional Services|Operations and Project Management': ['Operations/Logistics Expert', 'Business/Office Expert'],
  'Business, Communications, and Professional Services|Sales and Partnerships': ['Entrepreneur', 'Retail Buyer', 'Talent Management'],
  'Business, Communications, and Professional Services|Finance and Accounting': ['Financial Advisor'],
  'Business, Communications, and Professional Services|Communications and PR': ['Reporter/Journalist', 'Journalist', 'Author'],
  'Business, Communications, and Professional Services|HR and Talent': ['Talent Management'],
  'Business, Communications, and Professional Services|Real Estate (Residential, Commercial)': ['Realtor', 'Architect'],
  'Business, Communications, and Professional Services|Legal and Compliance': ['Lawyer', 'Paralegal'],
  'Pet and Animal Care|Veterinary (Vet, Vet Tech)': ['Veterinarian', 'Veterinary Technician', 'Medical Professions - Veterinary'],
  'Pet and Animal Care|Animal Care and Rescue': ['Veterinarian', 'Veterinary Technician', 'Pet Expert'],
  'Pet and Animal Care|Pet Training and Behavior': ['Dog Trainer'],
  'Pet and Animal Care|Pet Grooming': ['Pet Groomer'],
  'Pet and Animal Care|Specialty Animals': ['Zoologist', 'Veterinarian'],
};

// ============================================================
// RETAIL DEMAND WEIGHTS (V3.1 - recalibrated from TDC-09 business judgment)
// ============================================================

const RETAIL_DEMAND = {
  // --- Tier 1: Highest demand (9/10) ---
  'Technology and Science': 41.0,              // was 41.5 - TDC-09: 9/10, backbone of TDC brand partners
  'Health and Wellness': 40.0,                 // was 39.5 - TDC-09: 9/10, credential depth matters most
  // --- Tier 2: High demand (8/10) ---
  'Home Improvement and Skilled Trades': 36.0, // was 40.0 - TDC-09: 8/10, demand clusters in specific sub-trades
  // --- Tier 3: Solid demand (7/10) ---
  'Food and Beverage': 31.5,                   // was 36.0 - TDC-09: 7/10, real but episodic demand
  'Beauty and Personal Care': 31.5,            // was 31.5 - TDC-09: 7/10, consistent, maintain
  // --- Tier 4: Moderate demand (6/10) ---
  'Pet and Animal Care': 27.0,                 // was 33.0 - TDC-09: 6/10, Tractor Supply + Mars but not top tier
  'Outdoors, Agriculture, and Land': 27.0,     // was 31.0 - TDC-09: 6/10, Tractor Supply driven
  // --- Tier 5: Lower-moderate demand (5/10) ---
  'Sports, Fitness, and Performance': 22.5,    // was 27.0 - TDC-09: 5/10, overcrowded vs demand
  // --- Tier 6: Low demand (4/10) ---
  'Safety, Security, and Emergency Response': 18.0, // was 15.0 - TDC-09: 4/10, but HTF multiplier compensates
  'Arts, Design, and Creative Production': 18.0,    // was 21.0 - TDC-09: 4/10, interior design is the value
  'Fashion and Accessories': 18.0,                   // was 21.0 - TDC-09: 4/10, sporadic brand demand
  // --- Tier 7: Minimal demand (3/10) ---
  'Travel, Transportation, and Logistics': 13.5,     // was 19.0 - TDC-09: 3/10, only Automotive has real demand
  'Entertainment, Media, and Creator Economy': 13.5,  // was 17.0 - TDC-09: 3/10, most overstocked RPG
  'Education, Training, and Child Development': 13.5, // was 15.0 - TDC-09: 3/10, no strong edu-tech vertical
  // --- Tier 8: Minimal demand (2/10) ---
  'Business, Communications, and Professional Services': 9.0, // was 9.0 - TDC-09: 2/10, maintain lowest tier
};

const HARD_TO_FILL = {
  'Health and Wellness': 1.5,
  'Home Improvement and Skilled Trades': 1.5,
  'Pet and Animal Care': 1.3,
  'Safety, Security, and Emergency Response': 1.3,
  'Travel, Transportation, and Logistics': 1.2, // NEW: Automotive mechanics hard to recruit
  'Technology and Science': 1.1,
  'Outdoors, Agriculture, and Land': 1.1, // NEW: Farmer/Rancher geographic gap
};

// ============================================================
// BENTONVILLE GEOGRAPHIC PRIORITY
// Sub-RPG keys that receive a 1.5x multiplier when Bentonville
// expert count < 5. Source: TDC-09 Bentonville Blitz strategy.
// ============================================================

const BENTONVILLE_PRIORITY_CATEGORIES = new Set([
  // Health and Wellness
  'Health and Wellness|Nutrition and Dietetics',
  'Health and Wellness|Wellness Practitioners',
  // Food and Beverage
  'Food and Beverage|Chef and Culinary (General)',
  // Sports, Fitness, and Performance
  'Sports, Fitness, and Performance|Personal Training and Strength',
  // Home Improvement and Skilled Trades
  'Home Improvement and Skilled Trades|General Contractors and Remodel',
  'Home Improvement and Skilled Trades|Handyman and Home Maintenance',
  // Beauty and Personal Care
  'Beauty and Personal Care|Skincare and Esthetics',
  // Pet and Animal Care
  'Pet and Animal Care|Veterinary (Vet, Vet Tech)',
  // Outdoors, Agriculture, and Land
  'Outdoors, Agriculture, and Land|Farming and Ranching',
  // Arts, Design, and Creative Production
  'Arts, Design, and Creative Production|Interior and Spatial Design',
]);

const BENTONVILLE_THRESHOLD = 5; // Multiplier applies when Bentonville count < this
const BENTONVILLE_MULTIPLIER = 1.5;

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

  // === NEW ENTRIES (30 previously unmapped sub-RPGs) ===
  // Added 2026-03-18 by TDC-11 + TDC-16

  // Arts, Design, and Creative Production (parent: 4/10)
  'Arts, Design, and Creative Production|Interior and Spatial Design': 5,
  'Arts, Design, and Creative Production|Makers and Crafts (Artisan)': 3,
  'Arts, Design, and Creative Production|Photo and Video Production': 2,

  // Beauty and Personal Care (parent: 7/10)
  'Beauty and Personal Care|Nails and Lash/Brow': 4,

  // Business, Communications, and Professional Services (parent: 2/10)
  'Business, Communications, and Professional Services|Communications and PR': 1,
  'Business, Communications, and Professional Services|Entrepreneurship and Small Business': 2,
  'Business, Communications, and Professional Services|Finance and Accounting': 1,
  'Business, Communications, and Professional Services|HR and Talent': 1,
  'Business, Communications, and Professional Services|Legal and Compliance': 1,
  'Business, Communications, and Professional Services|Operations and Project Management': 1,
  'Business, Communications, and Professional Services|Real Estate (Residential, Commercial)': 2,
  'Business, Communications, and Professional Services|Sales and Partnerships': 1,

  // Education, Training, and Child Development (parent: 3/10)
  'Education, Training, and Child Development|Corporate Training and Coaching': 2,
  'Education, Training, and Child Development|Special Education and Learning Support': 2,

  // Entertainment, Media, and Creator Economy (parent: 3/10)
  'Entertainment, Media, and Creator Economy|Acting and Performance': 2,
  'Entertainment, Media, and Creator Economy|Gaming and Streaming Creators': 5,
  'Entertainment, Media, and Creator Economy|Influencer and Creator (Lifestyle)': 2,
  'Entertainment, Media, and Creator Economy|Music (Producer, Artist, DJ)': 3,
  'Entertainment, Media, and Creator Economy|On-Camera Host and Presenter': 3,
  'Entertainment, Media, and Creator Economy|Podcasting and Audio Content': 2,

  // Fashion and Accessories (parent: 4/10)
  'Fashion and Accessories|Apparel Design and Production': 3,
  'Fashion and Accessories|Fashion Retail and Merchandising': 3,

  // Outdoors, Agriculture, and Land (parent: 6/10)
  'Outdoors, Agriculture, and Land|Environmental and Conservation': 2,

  // Pet and Animal Care (parent: 6/10)
  'Pet and Animal Care|Specialty Animals': 3,

  // Safety, Security, and Emergency Response (parent: 4/10)
  'Safety, Security, and Emergency Response|Private Security and Protection': 2,

  // Technology and Science (parent: 9/10)
  'Technology and Science|Science and Lab': 3,

  // Travel, Transportation, and Logistics (parent: 3/10)
  'Travel, Transportation, and Logistics|Aviation and Airport': 1,
  'Travel, Transportation, and Logistics|Commercial Driving and Fleet': 1,
  'Travel, Transportation, and Logistics|Logistics and Supply Chain': 1,
  'Travel, Transportation, and Logistics|Public Transit and Rail': 1,
};

// ============================================================
// BIO KEYWORD PATTERNS (used for scrub candidate detection only)
// ============================================================

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
// LOCATION ANALYSIS
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
// EXPERT TEXT EXTRACTION (for bio scrub detection)
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

// ============================================================
// SUB-PROFESSION OVERRIDE LOOKUP
// ============================================================

function getSubRpgOverride(profEntry) {
  const subProf = profEntry.subProfession;
  if (!subProf || !subProf.name) return null;

  const subName = subProf.name;

  // Direct match
  if (SUB_PROFESSION_TO_SUB_RPG[subName]) return SUB_PROFESSION_TO_SUB_RPG[subName];

  // Fuzzy match
  for (const [key, mapping] of Object.entries(SUB_PROFESSION_TO_SUB_RPG)) {
    if (subName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(subName.toLowerCase())) {
      return mapping;
    }
  }
  return null;
}

// ============================================================
// RPG ASSIGNMENT (V3 - NO LIMITS)
// An expert counts in EVERY sub-RPG their professions map to.
// Sub-profession overrides ADD the specific sub-RPG routing.
// Default mappings ALWAYS apply (a baker-chef is still a chef).
// Pitchability rule: if you could pitch them, they count.
// ============================================================

function assignRpgs(expert) {
  const assignments = [];
  const seenSubRpgs = new Set(); // Deduplicate by RPG|subRPG key (not just subRPG name)

  const profs = expert.professions || [];

  // Process ALL professions (no sorting by order, no limit)
  for (const profEntry of profs) {
    const profName = profEntry.profession?.name || '';
    const defaultPairs = PROFESSION_TO_RPG[profName];
    if (!defaultPairs) continue;

    const override = getSubRpgOverride(profEntry);

    // Add ALL default pairs (always - a baker-chef is still a chef)
    for (const [rpg, subRpg] of defaultPairs) {
      const key = `${rpg}|${subRpg}`;
      if (!seenSubRpgs.has(key)) {
        assignments.push({ rpg, subRpg, source: 'profession' });
        seenSubRpgs.add(key);
      }
    }

    // If override exists, ADD the specific sub-RPG routing too
    if (override) {
      const [overrideRpg, overrideSubRpg] = override;
      const key = `${overrideRpg}|${overrideSubRpg}`;
      if (!seenSubRpgs.has(key)) {
        assignments.push({ rpg: overrideRpg, subRpg: overrideSubRpg, source: 'profession' });
        seenSubRpgs.add(key);
      }
    }
  }

  return assignments;
}

// ============================================================
// CORE SPECIALIST COUNTING
// For a given sub-RPG, count experts whose profession is CORE
// (not just pitchable via multi-mapping).
// Returns { coreCount, coreExpertIds } for the sub-RPG.
// ============================================================

function countCoreSpecialists(experts, subRpgKey) {
  const coreProfessions = CORE_PROFESSIONS[subRpgKey] || [];
  if (coreProfessions.length === 0) return { coreCount: 0, coreExpertIds: [] };

  const coreSet = new Set(coreProfessions);
  const coreExpertIds = [];

  for (const expert of experts) {
    const profs = expert.professions || [];
    const hasCoreProf = profs.some(p => {
      // Check top-level profession name (existing behavior)
      if (coreSet.has(p.profession?.name || '')) return true;
      // CHECK SUB-PROFESSION NAME (the fix)
      const subName = p.subProfession?.name?.trim();
      if (subName && coreSet.has(subName)) return true;
      return false;
    });
    if (hasCoreProf) {
      coreExpertIds.push(expert.userid || expert.id);
    }
  }

  return {
    coreCount: coreExpertIds.length,
    coreExpertIds,
  };
}

// ============================================================
// UNIQUE EXPERT COUNT PER RPG
// Deduplicated count of actual humans assigned to this RPG.
// An expert who maps to 5 sub-RPGs within Technology still = 1 human.
// ============================================================

function countUniqueExpertsPerRpg(experts) {
  const rpgExpertSets = {}; // RPG -> Set of expert IDs
  for (const rpg of ALL_RPGS) {
    rpgExpertSets[rpg] = new Set();
  }

  for (const expert of experts) {
    const assignments = assignRpgs(expert);
    const expertId = expert.userid || expert.id;
    const seenRpgs = new Set();

    for (const { rpg } of assignments) {
      if (!seenRpgs.has(rpg)) {
        rpgExpertSets[rpg].add(expertId);
        seenRpgs.add(rpg);
      }
    }
  }

  const result = {};
  for (const [rpg, expertSet] of Object.entries(rpgExpertSets)) {
    result[rpg] = expertSet.size;
  }
  return result;
}

// ============================================================
// BENTONVILLE EXPERT COUNT
// Returns total Bentonville-area experts (used for geo multiplier).
// ============================================================

function countBentonvilleExperts(experts) {
  let count = 0;
  for (const expert of experts) {
    const markets = classifyMarket(expert);
    if (markets.includes('Bentonville')) count++;
  }
  return count;
}

// ============================================================
// SCRUB CANDIDATES (bio inference as cleanup tool)
// Identifies experts whose bios suggest professions they lack tags for.
// This is NOT used for RPG counting - it's a data quality output.
// ============================================================

export function getScrubCandidates(experts) {
  const candidates = [];

  for (const expert of experts) {
    const text = getExpertText(expert);
    if (!text.trim()) continue;

    // Get the RPGs this expert is already assigned to via professions
    const currentAssignments = assignRpgs(expert);
    const currentRpgs = new Set(currentAssignments.map(a => a.rpg));
    const currentProfNames = (expert.professions || []).map(p => p.profession?.name || '').filter(Boolean);

    const suggestedRpgs = [];
    for (const [rpg, pattern] of Object.entries(RPG_KEYWORDS)) {
      if (!currentRpgs.has(rpg)) {
        const matches = text.match(new RegExp(pattern, 'gi'));
        if (matches && matches.length >= 2) {
          // Require at least 2 keyword hits to reduce noise
          suggestedRpgs.push({
            rpg,
            bioEvidence: `Matched keywords: ${[...new Set(matches.map(m => m.toLowerCase()))].join(', ')}`,
            matchCount: matches.length,
          });
        }
      }
    }

    if (suggestedRpgs.length > 0) {
      candidates.push({
        expertId: expert.userid || expert.id,
        expertName: `${expert.firstName || ''} ${expert.lastName || ''}`.trim(),
        currentProfessions: currentProfNames,
        suggestedRpgs: suggestedRpgs.sort((a, b) => b.matchCount - a.matchCount),
      });
    }
  }

  return candidates;
}

// ============================================================
// VALIDATION LAYER
// Independent count verification: walks experts and professions
// directly, compares against the engine's computed sub-RPG counts.
// V3.1: Also validates core counts.
// ============================================================

export function validateCounts(experts, analysis) {
  const directCounts = {}; // subRpg -> count from direct profession walk

  for (const expert of experts) {
    const assignments = assignRpgs(expert);
    for (const { rpg, subRpg } of assignments) {
      const key = `${rpg}|${subRpg}`;
      directCounts[key] = (directCounts[key] || 0) + 1;
    }
  }

  // Compare against what the analysis produced
  const discrepancies = [];
  const analysisSubCounts = {};

  // Build a lookup from the analysis rpgPriorities subGroups
  // V3.1: field renamed from count to mappedCount
  for (const rpgEntry of (analysis.rpgPriorities || [])) {
    for (const sg of (rpgEntry.subGroups || [])) {
      const key = `${rpgEntry.rpg}|${sg.name}`;
      analysisSubCounts[key] = sg.mappedCount;
    }
  }

  // Check all keys from both sides
  const allKeys = new Set([...Object.keys(directCounts), ...Object.keys(analysisSubCounts)]);
  for (const key of allKeys) {
    const direct = directCounts[key] || 0;
    const computed = analysisSubCounts[key] || 0;
    if (direct !== computed) {
      const [rpg, subRpg] = key.split('|');
      discrepancies.push({
        rpg,
        subRpg,
        type: 'mapped',
        directCount: direct,
        computedCount: computed,
        delta: direct - computed,
      });
    }
  }

  // Additionally validate core counts for sub-RPG priorities
  for (const sub of (analysis.subRpgPriorities || [])) {
    const key = `${sub.rpg}|${sub.subRpg}`;
    const { coreCount: directCore } = countCoreSpecialists(experts, key);
    if (directCore !== sub.coreCount) {
      discrepancies.push({
        rpg: sub.rpg,
        subRpg: sub.subRpg,
        type: 'core',
        directCount: directCore,
        computedCount: sub.coreCount,
        delta: directCore - sub.coreCount,
      });
    }
  }

  return {
    valid: discrepancies.length === 0,
    discrepancies,
    totalKeysChecked: allKeys.size,
  };
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

  // Pre-compute Bentonville count for geographic multiplier
  const bentonvilleCount = countBentonvilleExperts(experts);

  // Initialize RPG structures
  for (const rpg of ALL_RPGS) {
    rpgCounts[rpg] = 0;
    rpgSubCounts[rpg] = {};
    rpgSource[rpg] = { profession: 0 };
  }

  // Process each expert
  for (const expert of experts) {
    // Market classification
    const markets = classifyMarket(expert);
    for (const m of markets) {
      if (marketCounts[m] !== undefined) marketCounts[m]++;
    }

    // BIPOC tracking
    const ethnicity = (expert.ethnicity || expert.race || '').toLowerCase();
    if (ethnicity && !ethnicity.includes('white') && !ethnicity.includes('caucasian') && ethnicity !== 'prefer not to say' && ethnicity !== '') {
      bipocCount.total++;
    }

    // RPG assignment - V3: ALL professions, ALL sub-RPGs, no limit
    const assignments = assignRpgs(expert);
    if (assignments.length === 0) {
      unassignedCount++;
      continue;
    }

    for (const { rpg, subRpg, source } of assignments) {
      rpgCounts[rpg] = (rpgCounts[rpg] || 0) + 1;
      if (!rpgSubCounts[rpg]) rpgSubCounts[rpg] = {};
      rpgSubCounts[rpg][subRpg] = (rpgSubCounts[rpg][subRpg] || 0) + 1;
      if (rpgSource[rpg]) rpgSource[rpg][source] = (rpgSource[rpg][source] || 0) + 1;
    }
  }

  bipocCount.percentage = experts.length > 0 ? Math.round((bipocCount.total / experts.length) * 100) : 0;

  // ============================================================
  // SUB-RPG PRIORITIZATION (V3.1 - core-based)
  // ============================================================

  const subRpgPriorities = [];

  // Apply sales overrides as demand boosts
  const demandBoosts = {};
  for (const override of salesOverrides) {
    if (!override || !override.trim()) continue;
    const term = override.toLowerCase().trim();

    for (const key of Object.keys(SAMS_CLUB_SUB_RPG_DEMAND)) {
      if (key.toLowerCase().includes(term)) {
        demandBoosts[key] = (demandBoosts[key] || 0) + 5;
      }
    }

    for (const [profName, pairs] of Object.entries(PROFESSION_TO_RPG)) {
      for (const [rpg, subRpg] of pairs) {
        if (profName.toLowerCase().includes(term) || subRpg.toLowerCase().includes(term)) {
          const key = `${rpg}|${subRpg}`;
          demandBoosts[key] = (demandBoosts[key] || 0) + 5;
        }
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

    // Compute CORE specialist count for this sub-RPG
    const { coreCount } = countCoreSpecialists(experts, key);

    // gapMult now uses CORE count (not mapped count)
    let gapMult;
    if (coreCount === 0) gapMult = 6.0;
    else if (coreCount <= 2) gapMult = 5.0;
    else if (coreCount <= 5) gapMult = 4.0;
    else if (coreCount <= 10) gapMult = 3.0;
    else if (coreCount <= 20) gapMult = 2.0;
    else if (coreCount <= 40) gapMult = 1.5;
    else gapMult = 1.0;

    // Inflation ratio: mapped vs core
    const inflationRatio = coreCount > 0 ? Math.round((currentCount / coreCount) * 10) / 10 : Infinity;
    const inflationFlag = inflationRatio > 5;

    // Bentonville geographic multiplier
    let bentonvilleMult = 1.0;
    if (BENTONVILLE_PRIORITY_CATEGORIES.has(key) && bentonvilleCount < BENTONVILLE_THRESHOLD) {
      bentonvilleMult = BENTONVILLE_MULTIPLIER;
    }

    const score = effectiveDemand * gapMult * htf * bentonvilleMult;

    // Calculate recruitment target
    let target;
    if (baseDemand >= 8) target = 25;
    else if (baseDemand >= 6) target = 15;
    else target = 10;

    const gap = Math.max(0, target - currentCount);

    // Urgency labels based on CORE specialist count (not mapped count)
    let urgency;
    if (coreCount <= 2) urgency = 'CRITICAL';
    else if (coreCount <= 7) urgency = 'HIGH';
    else if (coreCount <= 14) urgency = 'MEDIUM';
    else urgency = 'LOW';

    subRpgPriorities.push({
      rpg,
      subRpg,
      mappedCount: currentCount,      // RENAMED from currentCount for clarity
      coreCount,                       // NEW: core specialist count
      inflationRatio,                  // NEW: mapped/core ratio
      inflationFlag,                   // NEW: true when >5x inflation
      target,
      gap,
      demand: effectiveDemand,
      baseDemand,
      boosted: boost > 0,
      score: Math.round(score * 10) / 10,
      gapMult,
      htf,
      bentonvilleMult,                 // NEW: 1.0 or 1.5
      urgency,
    });
  }

  subRpgPriorities.sort((a, b) => b.score - a.score);

  // ============================================================
  // RPG-LEVEL PRIORITIES (V3.1 - unique expert counts)
  // ============================================================

  // Pre-compute unique expert counts per RPG
  const uniqueExpertCounts = countUniqueExpertsPerRpg(experts);

  const rpgPriorities = ALL_RPGS.map(rpg => {
    const mappedCount = rpgCounts[rpg] || 0;
    const uniqueExperts = uniqueExpertCounts[rpg] || 0;
    const demand = RETAIL_DEMAND[rpg] || 5;
    const htf = HARD_TO_FILL[rpg] || 1.0;

    // gapMult now uses UNIQUE expert count (deduplicated humans)
    let gapMult;
    if (uniqueExperts < 10) gapMult = 5.0;
    else if (uniqueExperts < 25) gapMult = 4.0 - (uniqueExperts - 10) * (1.0 / 15);
    else if (uniqueExperts < 50) gapMult = 3.0 - (uniqueExperts - 25) * (0.5 / 25);
    else if (uniqueExperts < 100) gapMult = 2.5 - (uniqueExperts - 50) * (1.0 / 50);
    else if (uniqueExperts < 200) gapMult = 1.5 - (uniqueExperts - 100) * (0.5 / 100);
    else gapMult = 1.0;

    if (uniqueExperts > 300) gapMult *= 0.5;
    else if (uniqueExperts > 200) gapMult *= 0.7;

    const score = demand * gapMult * htf;

    // Build sub-groups with BOTH mapped and core counts
    const subGroupEntries = Object.entries(rpgSubCounts[rpg] || {})
      .map(([name, mappedCnt]) => {
        const subKey = `${rpg}|${name}`;
        const { coreCount } = countCoreSpecialists(experts, subKey);
        return { name, mappedCount: mappedCnt, coreCount };
      })
      .sort((a, b) => b.mappedCount - a.mappedCount);

    return {
      rpg,
      mappedCount,       // RENAMED from count for clarity
      uniqueExperts,     // NEW: deduplicated human count
      demand,
      htf,
      score: Math.round(score * 10) / 10,
      subGroups: subGroupEntries,
    };
  }).sort((a, b) => b.score - a.score);

  // ============================================================
  // SELF-VALIDATION
  // ============================================================

  const result = {
    metadata: {
      totalExperts: experts.length,
      analysisDate: new Date().toISOString(),
      engineVersion: 'V4.1',                  // CHANGED from V3.1 - added 30 unmapped sub-RPG demand weights
      unassigned: unassignedCount,
      salesOverrides,
      bentonvilleCount,                        // NEW
      coreProMapVersion: '2026-03-18',         // NEW: tracks which core map was used
    },
    rpgPriorities,
    subRpgPriorities,
    topTen: subRpgPriorities.slice(0, 10),
    topTwenty: subRpgPriorities.slice(0, 20), // NEW: expanded from top 10
    markets: marketCounts,
    bipoc: bipocCount,
  };

  // Run validation and attach results
  const validation = validateCounts(experts, result);
  result.validation = validation;

  return result;
}
