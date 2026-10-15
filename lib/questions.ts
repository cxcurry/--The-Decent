import { normalize } from "./recognition";
// Original, approachable prompts. Group order follows the six rarity tiers.
// Scores are editorial estimates of likely answer familiarity, not measured frequencies.
export type SeedQuestion = {
  id: string;
  set: number;
  position: number;
  category: string;
  prompt: string;
  groups: string[];
};
const bank: Array<[string, string, string[]]> = [
  [
    "GEOGRAPHY",
    "Name a country in Africa.",
    [
      "Nigeria|Egypt|South Africa|Kenya|Morocco|Ghana",
      "Algeria|Ethiopia|Tanzania|Uganda|Tunisia|Zimbabwe|Côte d’Ivoire~Ivory Coast",
      "Senegal|Cameroon|Angola|Zambia|Rwanda|Sudan|Libya|Democratic Republic of the Congo~DRC~DR Congo|Republic of the Congo~Congo~Congo Brazzaville",
      "Botswana|Namibia|Madagascar|Mozambique|Mali|Mauritius|Somalia|Niger|Chad|Malawi|Guinea|Liberia",
      "Eswatini~Swaziland|Lesotho|Djibouti|Eritrea|Burkina Faso|Benin|Gabon|Togo|Burundi|Mauritania|Gambia~The Gambia",
      "São Tomé and Príncipe~Sao Tome|Comoros|Seychelles|Cabo Verde~Cape Verde|Guinea-Bissau|Equatorial Guinea|Central African Republic~CAR|South Sudan|Sierra Leone",
    ],
  ],
  [
    "SPACE",
    "Name a planet in our Solar System.",
    ["Earth|Mars", "Jupiter", "Venus|Saturn", "Mercury", "", "Neptune|Uranus"],
  ],
  [
    "ANIMALS",
    "Name an animal commonly kept on farms.",
    [
      "Cow~Cattle|Pig|Chicken|Horse",
      "Sheep|Goat|Duck",
      "Donkey|Goose|Turkey",
      "Rabbit|Alpaca|Llama",
      "Quail|Guinea fowl|Honeybee~Bee",
      "Yak|Water buffalo|Ostrich|Emu",
    ],
  ],
  [
    "FOOD",
    "Name something people put on a pizza.",
    [
      "Cheese|Pepperoni|Tomato sauce~Pizza sauce",
      "Mushroom|Onion|Ham|Tomato",
      "Pineapple|Bacon|Sausage|Bell pepper~Pepper|Olive",
      "Chicken|Spinach|Jalapeño~Jalapeno|Basil",
      "Anchovy~Anchovies|Artichoke|Arugula~Rocket|Feta",
      "Capers|Egg|Potato|Truffle|Goat cheese",
    ],
  ],
  [
    "EVERYDAY",
    "Name a color in a rainbow.",
    ["Red|Blue", "Yellow", "Green", "Orange", "Purple~Violet", "Indigo"],
  ],
  [
    "MUSIC",
    "Name a musical instrument.",
    [
      "Piano|Guitar|Drums~Drum|Violin",
      "Flute|Trumpet|Saxophone|Keyboard",
      "Clarinet|Cello|Harp|Ukulele|Bass guitar~Bass",
      "Accordion|Trombone|Banjo|Oboe|Xylophone",
      "Bassoon|Sitar|Mandolin|Bagpipes|Dulcimer",
      "Erhu|Theremin|Sarangi|Santoor|Nyckelharpa",
    ],
  ],
  [
    "SPORT",
    "Name a sport played with a ball.",
    [
      "Soccer~Football|Basketball|Baseball|American football",
      "Tennis|Golf|Volleyball",
      "Rugby|Cricket|Table tennis~Ping pong|Softball",
      "Handball|Lacrosse|Squash|Water polo",
      "Netball|Polo|Racquetball|Bocce",
      "Sepak takraw|Hurling|Gaelic football|Pelota|Fistball",
    ],
  ],
  [
    "GEOGRAPHY",
    "Name a country in Europe.",
    [
      "France|Germany|Italy|Spain|United Kingdom~UK~Britain~Great Britain",
      "Ireland|Portugal|Greece|Netherlands~Holland|Switzerland",
      "Sweden|Norway|Denmark|Finland|Poland|Austria|Belgium",
      "Croatia|Serbia|Romania|Bulgaria|Hungary|Czechia~Czech Republic|Iceland",
      "Latvia|Lithuania|Estonia|Slovenia|Slovakia|Albania|North Macedonia|Bosnia and Herzegovina~Bosnia|Montenegro|Belarus|Ukraine|Moldova|Russia|Turkey~Türkiye|Cyprus",
      "Andorra|Monaco|San Marino|Liechtenstein|Luxembourg|Malta|Vatican City~Vatican~Holy See|Kosovo",
    ],
  ],
  [
    "SCIENCE",
    "Name a part of the human body.",
    [
      "Head|Arm|Leg|Hand|Foot~Feet|Eye|Ear|Heart",
      "Brain|Nose|Mouth|Finger|Toe|Knee|Elbow",
      "Shoulder|Ankle|Wrist|Neck|Back|Stomach|Lung",
      "Liver|Kidney|Skin|Tongue|Tooth~Teeth|Muscle|Bone|Intestine",
      "Spleen|Pancreas|Esophagus~Oesophagus|Tendon|Ligament|Diaphragm",
      "Pituitary gland~Pituitary|Thymus|Cochlea|Hippocampus|Duodenum",
    ],
  ],
  [
    "ANIMALS",
    "Name a kind of bird.",
    [
      "Chicken|Duck|Eagle|Parrot|Penguin",
      "Owl|Pigeon|Swan|Crow|Robin",
      "Goose|Raven|Flamingo|Peacock|Seagull~Gull|Ostrich",
      "Hummingbird|Woodpecker|Pelican|Puffin|Blue jay|Sparrow",
      "Kingfisher|Kestrel|Albatross|Heron|Toucan|Kiwi",
      "Hoopoe|Shoebill|Cassowary|Kakapo|Secretary bird|Lyrebird",
    ],
  ],
  [
    "FOOD",
    "Name a fruit you might buy at a grocery store.",
    [
      "Apple|Banana|Orange|Strawberry|Grape",
      "Pineapple|Mango|Watermelon|Lemon|Peach",
      "Pear|Cherry|Plum|Blueberry|Raspberry|Lime|Kiwi~Kiwifruit",
      "Papaya|Guava|Passion fruit|Grapefruit|Apricot|Avocado|Tomato",
      "Pomegranate|Lychee|Fig|Date|Dragon fruit~Pitaya|Coconut",
      "Rambutan|Mangosteen|Persimmon|Quince|Star fruit~Carambola|Durian|Jackfruit",
    ],
  ],
  [
    "EVERYDAY",
    "Name a month of the year.",
    [
      "January~Jan|December~Dec",
      "June~Jun|July~Jul",
      "March~Mar|May",
      "April~Apr|August~Aug",
      "February~Feb|October~Oct",
      "September~Sep~Sept|November~Nov",
    ],
  ],
  [
    "NATURE",
    "Name a kind of tree.",
    [
      "Oak|Pine|Maple|Apple tree~Apple|Palm",
      "Willow|Birch|Cedar|Cherry tree~Cherry|Orange tree~Orange",
      "Fir|Spruce|Beech|Elm|Ash|Walnut",
      "Sycamore|Cypress|Juniper|Redwood|Sequoia",
      "Baobab|Ginkgo|Magnolia|Acacia|Yew|Eucalyptus",
      "Wollemi pine~Wollemia|Metasequoia~Dawn redwood|Araucaria|Banyan|Kauri",
    ],
  ],
  [
    "MOVIES",
    "Name an animated movie released by Disney or Pixar.",
    [
      "Frozen|The Lion King~Lion King|Toy Story|Finding Nemo",
      "Aladdin|Cinderella|Beauty and the Beast|Moana|The Little Mermaid|Snow White and the Seven Dwarfs~Snow White",
      "Mulan|Tangled|Zootopia~Zootropolis|Encanto|Cars|Inside Out|Up|Coco",
      "Ratatouille|Brave|WALL-E~Wall E|Monsters Inc~Monsters Incorporated|Sleeping Beauty|Peter Pan|Dumbo",
      "Fantasia|The Rescuers|The Aristocats|The Jungle Book|Soul|Luca|Elemental|Lilo and Stitch~Lilo & Stitch",
      "Treasure Planet|The Great Mouse Detective~Great Mouse Detective|The Black Cauldron|Atlantis The Lost Empire~Atlantis",
    ],
  ],
  [
    "GEOGRAPHY",
    "Name a country in Asia.",
    [
      "China|Japan|India",
      "South Korea~Republic of Korea|North Korea|Indonesia|Pakistan|Saudi Arabia|Singapore",
      "Thailand|Vietnam~Viet Nam|Philippines|Malaysia|Israel|Russia|Turkey~Türkiye",
      "Iran|Iraq|Bangladesh|Afghanistan|Sri Lanka|Mongolia|Nepal|Egypt",
      "Kazakhstan|Uzbekistan|Kyrgyzstan|Tajikistan|Turkmenistan|Brunei|Myanmar~Burma|Laos|Cambodia|Taiwan|Palestine",
      "Bhutan|Timor-Leste~East Timor|Maldives|Bahrain|Oman|Jordan|Kuwait|Lebanon|Yemen|Syria|Armenia|Georgia|Azerbaijan|Qatar|United Arab Emirates~UAE|Cyprus",
    ],
  ],
  [
    "SCIENCE",
    "Name a chemical element.",
    [
      "Oxygen~O|Carbon~C|Hydrogen~H|Iron~Fe|Gold~Au|Silver~Ag",
      "Helium~He|Nitrogen~N|Calcium~Ca|Aluminium~Aluminum~Al",
      "Copper~Cu|Zinc~Zn|Neon~Ne|Lead~Pb|Tin~Sn|Sodium~Na",
      "Chlorine~Cl|Potassium~K|Magnesium~Mg|Silicon~Si|Mercury~Hg|Sulfur~Sulphur~S",
      "Uranium~U|Platinum~Pt|Lithium~Li|Iodine~I|Titanium~Ti|Boron~B|Fluorine~F|Phosphorus~P|Argon~Ar",
      "Tungsten~W|Vanadium~V|Yttrium~Y|Oganesson~Og|Osmium~Os|Bismuth~Bi|Technetium~Tc|Beryllium~Be|Krypton~Kr|Xenon~Xe|Radon~Rn|Bromine~Br|Cobalt~Co|Nickel~Ni|Neodymium~Nd|Manganese~Mn",
    ],
  ],
  [
    "ANIMALS",
    "Name a mammal.",
    [
      "Dog|Cat|Human|Cow|Horse|Elephant",
      "Lion|Tiger|Bear|Monkey|Dolphin|Whale",
      "Bat|Rabbit|Pig|Sheep|Goat|Giraffe|Zebra|Gorilla",
      "Otter|Badger|Beaver|Hedgehog|Kangaroo|Koala|Seal",
      "Capybara|Meerkat|Armadillo|Aardvark|Wombat|Tapir",
      "Platypus|Echidna|Pangolin|Okapi|Solenodon|Binturong",
    ],
  ],
  [
    "FOOD",
    "Name a vegetable used in cooking.",
    [
      "Carrot|Potato|Onion|Broccoli|Tomato",
      "Pea|Corn~Sweetcorn|Cabbage|Spinach|Garlic",
      "Cauliflower|Bell pepper~Pepper|Cucumber|Zucchini~Courgette|Eggplant~Aubergine",
      "Leek|Celery|Asparagus|Kale|Sweet potato|Pumpkin",
      "Brussels sprout~Brussels sprouts|Parsnip|Turnip|Beetroot~Beet|Artichoke|Okra",
      "Kohlrabi|Celeriac|Salsify|Rutabaga~Swede|Fennel|Chicory|Endive",
    ],
  ],
  [
    "LANGUAGE",
    "Name a language people speak.",
    [
      "English|Spanish|French|Mandarin Chinese~Mandarin~Chinese",
      "German|Hindi|Arabic",
      "Portuguese|Italian|Russian|Japanese",
      "Korean|Vietnamese|Turkish|Dutch|Polish|Bengali",
      "Swahili|Welsh|Catalan|Greek|Tamil|Urdu|Ukrainian|Hebrew|Persian~Farsi",
      "Basque|Amharic|Xhosa|Icelandic|Māori~Maori|Scottish Gaelic~Gaelic|Irish~Irish Gaelic|Tagalog|Finnish|Hungarian|Zulu|Romanian|Danish|Norwegian|Swedish|Indonesian|Thai",
    ],
  ],
  [
    "NATURE",
    "Name a kind of flower.",
    [
      "Rose|Tulip|Daisy|Sunflower",
      "Daffodil|Lily|Orchid",
      "Poppy|Iris|Lavender|Carnation",
      "Peony|Hibiscus|Dahlia|Marigold",
      "Chrysanthemum|Anemone|Zinnia|Cosmos|Hydrangea",
      "Hellebore|Ranunculus|Delphinium|Foxglove|Lisianthus",
    ],
  ],
  [
    "SPACE",
    "Name a person who has been to space.",
    [
      "Neil Armstrong~Armstrong|Buzz Aldrin~Aldrin",
      "Yuri Gagarin~Gagarin|Sally Ride~Ride",
      "John Glenn~Glenn|Alan Shepard~Shepard|Chris Hadfield~Hadfield",
      "Michael Collins~Collins|Mae Jemison~Jemison|Valentina Tereshkova~Tereshkova|Tim Peake~Peake",
      "Peggy Whitson~Whitson|Kalpana Chawla~Chawla|Sunita Williams~Suni Williams|Guion Bluford~Bluford|Helen Sharman~Sharman",
      "Kathryn Sullivan~Sullivan|Yang Liwei|Wally Funk~Funk|Alan Bean~Bean|Eugene Cernan~Gene Cernan~Cernan|Charles Duke~Charlie Duke~Duke|Harrison Schmitt~Schmitt",
    ],
  ],
  [
    "GEOGRAPHY",
    "Name a US state.",
    [
      "California~CA|New York~NY|Texas~TX|Florida~FL|Hawaii~HI",
      "Alaska~AK|Nevada~NV|Washington~WA|Ohio~OH|Georgia~GA|Michigan~MI",
      "Arizona~AZ|Colorado~CO|Illinois~IL|Pennsylvania~PA|Massachusetts~MA|New Jersey~NJ|North Carolina~NC",
      "Oregon~OR|Virginia~VA|Tennessee~TN|Louisiana~LA|Wisconsin~WI|Minnesota~MN|Maryland~MD|South Carolina~SC",
      "Alabama~AL|Arkansas~AR|Connecticut~CT|Delaware~DE|Idaho~ID|Indiana~IN|Iowa~IA|Kansas~KS|Kentucky~KY|Maine~ME|Missouri~MO",
      "Mississippi~MS|Montana~MT|Nebraska~NE|New Hampshire~NH|New Mexico~NM|North Dakota~ND|Oklahoma~OK|Rhode Island~RI|South Dakota~SD|Utah~UT|Vermont~VT|West Virginia~WV|Wyoming~WY",
    ],
  ],
  [
    "SCIENCE",
    "Name a unit used to measure distance.",
    [
      "Meter~Metre~M|Mile",
      "Kilometer~Kilometre~KM|Centimeter~Centimetre~CM",
      "Foot~Feet~FT|Inch~Inches~IN|Millimeter~Millimetre~MM",
      "Yard~YD|Nautical mile|Light-year~Light year",
      "Micrometer~Micrometre~Micron|Nanometer~Nanometre~NM|Astronomical unit~AU",
      "Parsec|Ångström~Angstrom|Furlong|Cubit|Fathom|Chain",
    ],
  ],
  [
    "ANIMALS",
    "Name an animal that lives in the ocean.",
    [
      "Shark|Fish|Dolphin|Whale",
      "Octopus|Crab|Sea turtle~Turtle|Jellyfish",
      "Squid|Seal|Seahorse|Lobster|Starfish~Sea star",
      "Stingray|Clam|Oyster|Sea lion|Manta ray|Coral",
      "Sea urchin|Cuttlefish|Nautilus|Moray eel|Sea cucumber",
      "Nudibranch|Coelacanth|Dugong|Vampire squid|Mantis shrimp|Hagfish",
    ],
  ],
  [
    "FOOD",
    "Name a shape of pasta.",
    [
      "Spaghetti|Penne|Macaroni",
      "Fusilli|Farfalle|Lasagne~Lasagna",
      "Rigatoni|Linguine|Tagliatelle",
      "Orecchiette|Bucatini|Orzo",
      "Cavatappi|Pappardelle|Conchiglie",
      "Strozzapreti|Mafaldine|Garganelli|Trofie",
    ],
  ],
  [
    "EVERYDAY",
    "Name a job someone could have.",
    [
      "Teacher|Doctor|Nurse|Police officer~Police|Firefighter",
      "Chef~Cook|Engineer|Pilot|Farmer|Lawyer",
      "Dentist|Plumber|Carpenter|Electrician|Driver|Cashier",
      "Librarian|Architect|Veterinarian~Vet|Pharmacist|Paramedic|Accountant",
      "Geologist|Translator|Journalist|Archaeologist|Astronomer|Botanist",
      "Cartographer|Actuary|Luthier|Archivist|Foley artist|Perfumer",
    ],
  ],
  [
    "NATURE",
    "Name a type of weather or a weather phenomenon.",
    [
      "Rain|Snow|Wind|Sunshine~Sunny",
      "Thunder|Lightning|Fog|Cloud~Clouds",
      "Hail|Frost|Storm|Rainbow",
      "Sleet|Drizzle|Mist|Blizzard",
      "Tornado|Hurricane|Monsoon|Waterspout",
      "Squall|Graupel|Diamond dust|Virga|Sundog~Sun dog|St Elmos fire~Saint Elmos fire",
    ],
  ],
  [
    "ENTERTAINMENT",
    "Name a comic-book superhero.",
    [
      "Superman|Batman|Spider-Man~Spiderman",
      "Wonder Woman|Iron Man|Hulk|Captain America|Thor",
      "Black Panther|Flash~The Flash|Aquaman|Wolverine",
      "Doctor Strange~Dr Strange|Green Lantern|Ant-Man~Antman|Captain Marvel",
      "Scarlet Witch|Black Widow|Daredevil|Storm|Shang-Chi~Shang Chi",
      "Moon Knight|Blue Beetle|Zatanna|Squirrel Girl|Ms Marvel~Kamala Khan",
    ],
  ],
  [
    "GEOGRAPHY",
    "Name a national capital city.",
    [
      "London|Paris|Tokyo|Washington DC~Washington|Rome",
      "Berlin|Madrid|Ottawa|Beijing|Canberra|New Delhi~Delhi|Moscow",
      "Cairo|Nairobi|Pretoria|Cape Town|Bloemfontein|Athens|Dublin|Lisbon",
      "Stockholm|Oslo|Helsinki|Copenhagen|Wellington|Bern~Berne|Bangkok|Seoul",
      "Reykjavík~Reykjavik|Ljubljana|Tirana|Thimphu|Ulaanbaatar~Ulan Bator|Suva",
      "Belmopan|Yamoussoukro|Gaborone|Nuku’alofa~Nuku Alofa|Sri Jayawardenepura Kotte~Kotte|Dili|Tarawa|Funafuti|Moroni|Banjul",
    ],
  ],
  [
    "SCIENCE",
    "Name a source of energy people use.",
    [
      "Sun~Solar~Sunlight|Wind|Coal|Oil",
      "Natural gas~Gas|Water~Hydropower~Hydroelectricity",
      "Nuclear power~Nuclear|Wood|Uranium",
      "Biomass|Geothermal energy~Geothermal|Hydrogen",
      "Tidal energy~Tidal|Wave energy~Waves|Biogas",
      "Ethanol|Peat|Biodiesel|Landfill gas|Bagasse",
    ],
  ],
  [
    "ANIMALS",
    "Name a kind of reptile.",
    [
      "Snake|Lizard|Crocodile",
      "Turtle|Alligator|Tortoise",
      "Gecko|Chameleon|Iguana",
      "Komodo dragon|Monitor lizard|Python|Cobra",
      "Skink|Gila monster|Caiman|Basilisk",
      "Tuatara|Gharial|Slow worm|Thorny devil|Frilled lizard",
    ],
  ],
  [
    "FOOD",
    "Name a sweet dessert.",
    [
      "Cake|Ice cream|Cookie~Biscuit|Pie|Chocolate",
      "Brownie|Donut~Doughnut|Pudding|Cheesecake|Cupcake",
      "Tart|Jelly~Jello|Custard|Waffle|Crêpe~Crepe",
      "Tiramisu|Crème brûlée~Creme brulee|Trifle|Churros|Cobbler",
      "Panna cotta|Baklava|Pavlova|Macaron|Mochi",
      "Gulab jamun|Kulfi|Halva~Halvah|Knafeh~Kunafa|Pastel de nata|Syllabub",
    ],
  ],
  [
    "EVERYDAY",
    "Name a subject taught in school.",
    [
      "Mathematics~Math~Maths|English|Science|History",
      "Art|Music|Physical education~PE|Geography",
      "Biology|Chemistry|Physics|French|Spanish",
      "Computer science~Computing|Business|Economics|Drama|Health",
      "Philosophy|Sociology|Latin|Statistics|Religious studies~Religion",
      "Design and technology~Design technology|Classics|Astronomy|Psychology|Geology|Home economics",
    ],
  ],
  [
    "NATURE",
    "Name a gemstone.",
    [
      "Diamond|Ruby|Emerald|Sapphire",
      "Amethyst|Pearl|Opal",
      "Topaz|Jade|Garnet|Turquoise",
      "Aquamarine|Peridot|Onyx|Lapis lazuli",
      "Moonstone|Tanzanite|Alexandrite|Amber|Tourmaline",
      "Spinel|Zircon|Sphene~Titanite|Iolite|Kunzite|Chrysoberyl",
    ],
  ],
  [
    "MOVIES",
    "Name a movie genre.",
    [
      "Comedy|Horror|Action|Drama",
      "Romance|Science fiction~Sci fi|Thriller",
      "Animation~Animated|Fantasy|Family|Adventure",
      "Musical|Western|Mystery|War|Documentary",
      "Film noir~Noir|Romantic comedy~Rom com|Mockumentary",
      "Neo-noir~Neo noir|Spaghetti western|Screwball comedy|Giallo|Wuxia",
    ],
  ],
  [
    "GEOGRAPHY",
    "Name an island country (Australia counts here too).",
    [
      "Japan|United Kingdom~UK~Britain~Great Britain|Australia|New Zealand~NZ",
      "Cuba|Jamaica|Iceland|Ireland|Philippines|Indonesia",
      "Sri Lanka|Madagascar|Singapore|Malta|Fiji|Cyprus",
      "Mauritius|Bahamas~The Bahamas|Barbados|Bahrain|Maldives|Cabo Verde~Cape Verde",
      "Samoa|Tonga|Vanuatu|Comoros|Kiribati|Nauru|Tuvalu|Brunei",
      "São Tomé and Príncipe~Sao Tome|Timor-Leste~East Timor|Palau|Marshall Islands|Federated States of Micronesia~Micronesia|Solomon Islands|Papua New Guinea~PNG|Seychelles|Haiti|Dominican Republic|Trinidad and Tobago~Trinidad|Dominica|Grenada|Antigua and Barbuda|Saint Lucia~St Lucia|Saint Kitts and Nevis~St Kitts and Nevis|Saint Vincent and the Grenadines~St Vincent and the Grenadines",
    ],
  ],
  [
    "SCIENCE",
    "Name a bone or group of bones in the human body.",
    [
      "Skull|Rib~Ribs|Femur~Thigh bone",
      "Humerus|Tibia~Shin bone|Fibula|Clavicle~Collarbone",
      "Pelvis|Patella~Kneecap|Mandible~Jawbone|Spine~Vertebrae",
      "Radius|Ulna|Sternum~Breastbone|Scapula~Shoulder blade",
      "Carpals~Wrist bones|Tarsals~Ankle bones|Metacarpals|Metatarsals|Phalanges|Sacrum|Coccyx~Tailbone",
      "Stapes|Incus|Malleus|Hyoid|Ethmoid|Sphenoid",
    ],
  ],
  [
    "ANIMALS",
    "Name a breed of dog.",
    [
      "Labrador~Labrador retriever~Lab|Golden retriever|Poodle|Bulldog",
      "German shepherd|Beagle|Boxer|Dachshund~Sausage dog",
      "Chihuahua|Husky~Siberian husky|Dalmatian|Border collie",
      "Rottweiler|Pug|Corgi|Akita|Shiba inu|Samoyed",
      "Greyhound|Whippet|Great Dane|Doberman~Doberman pinscher|Shih tzu",
      "Basenji|Borzoi|Saluki|Xoloitzcuintli~Xolo|Leonberger|Otterhound",
    ],
  ],
  [
    "FOOD",
    "Name something people eat for breakfast.",
    [
      "Egg~Eggs|Cereal|Toast|Pancake~Pancakes",
      "Waffle~Waffles|Bacon|Bagel|Yogurt~Yoghurt",
      "Porridge|Oatmeal|Fruit|Muffin|Sausage",
      "Croissant|Granola|Baked beans~Beans|Hash browns|French toast",
      "Avocado toast|Congee|Shakshuka|Crumpet|Muesli",
      "Idli|Dosa|Kedgeree|Natto|Arepa|Ful medames",
    ],
  ],
  [
    "MUSIC",
    "Name a percussion instrument.",
    [
      "Drums~Drum|Piano|Tambourine",
      "Cymbals~Cymbal|Triangle|Xylophone",
      "Bongos~Bongo|Conga|Cowbell",
      "Marimba|Timpani|Snare drum|Bass drum",
      "Djembe|Cajón~Cajon|Glockenspiel|Guiro~Güiro",
      "Talking drum|Udu|Cuíca~Cuica|Crotales|Bodhrán~Bodhran",
    ],
  ],
  [
    "SPACE",
    "Name a constellation or a recognizable star pattern.",
    [
      "Orion|Big Dipper~The Big Dipper",
      "Little Dipper|Leo|Taurus|Southern Cross~Crux",
      "Cassiopeia|Scorpius~Scorpio|Gemini|Cancer|Aries|Libra",
      "Orion’s Belt~Orions Belt|Sagittarius|Andromeda|Pegasus|Pleiades~Seven Sisters|Pisces|Aquarius|Capricornus~Capricorn|Virgo",
      "Lyra|Cygnus|Draco|Hydra|Ursa Major~Great Bear|Ursa Minor~Little Bear",
      "Ophiuchus|Lacerta|Vulpecula|Monoceros|Delphinus|Equuleus",
    ],
  ],
  [
    "GAMES",
    "Name a board game.",
    [
      "Chess|Monopoly|Checkers~Draughts|Scrabble",
      "Risk|Clue~Cluedo|Battleship|Sorry",
      "Catan~Settlers of Catan|Candy Land|Chutes and Ladders~Snakes and Ladders|The Game of Life~Game of Life~Life",
      "Ticket to Ride|Trivial Pursuit|Connect Four~Connect 4|Dominoes|Backgammon",
      "Go|Mancala|Ludo|Parcheesi|Carcassonne|Pandemic",
      "Azul|Wingspan|Scythe|Agricola|Root|Everdell",
    ],
  ],
  [
    "GEOGRAPHY",
    "Name any country in the world.",
    [
      "United States~USA~US~United States of America~America|United Kingdom~UK~Britain~Great Britain|France|Germany|China|Japan|India|Brazil|Canada|Australia",
      "Mexico|Italy|Spain|Russia|South Africa|Nigeria|Egypt|Argentina|South Korea~Republic of Korea|New Zealand~NZ",
      "Guatemala|Costa Rica|Panama|Chile|Colombia|Peru|Venezuela|Ecuador|Uruguay",
      "Belize|Honduras|El Salvador|Nicaragua|Bolivia|Paraguay",
      "Suriname|Guyana",
      "",
      "",
    ],
  ],
  [
    "SCIENCE",
    "Name a unit used to measure time.",
    [
      "Second~Sec|Minute~Min|Hour~Hr",
      "Day|Week",
      "Month|Year",
      "Decade|Century",
      "Millennium|Fortnight|Millisecond~Ms",
      "Microsecond|Nanosecond|Picosecond|Planck time|Sidereal day",
    ],
  ],
  [
    "ANIMALS",
    "Name an animal in the cat family.",
    [
      "Cat~Domestic cat|Lion|Tiger",
      "Leopard|Cheetah|Jaguar",
      "Snow leopard|Lynx|Cougar~Puma~Mountain lion",
      "Bobcat|Ocelot|Serval",
      "Caracal|Clouded leopard|Pallas’s cat~Pallas cat|Fishing cat",
      "Margay|Kodkod|Oncilla|Flat-headed cat~Flat headed cat|Jaguarundi|Sand cat",
    ],
  ],
  [
    "FOOD",
    "Name a type of noodle or pasta.",
    [
      "Spaghetti|Macaroni|Ramen",
      "Penne|Udon|Egg noodles",
      "Soba|Fusilli|Rice noodles|Lasagne~Lasagna",
      "Sōmen~Somen|Shirataki|Farfalle|Linguine",
      "Hiyamugi|Bucatini|Pappardelle|Glass noodles~Cellophane noodles",
      "Kishimen|Hōtō~Hoto|Harusame|Garganelli|Trofie",
    ],
  ],
  [
    "SPORT",
    "Name a sport featured at the Summer or Winter Olympics.",
    [
      "Swimming|Running~Athletics~Track and field|Soccer~Football|Basketball",
      "Gymnastics|Tennis|Skiing|Ice hockey~Hockey|Boxing",
      "Cycling|Volleyball|Figure skating|Snowboarding|Wrestling|Golf",
      "Fencing|Archery|Rowing|Sailing|Judo|Badminton|Rugby|Skateboarding",
      "Curling|Biathlon|Luge|Taekwondo|Water polo|Table tennis~Ping pong|Triathlon",
      "Skeleton|Canoe slalom|Modern pentathlon|Short track speed skating~Short track|Rhythmic gymnastics|Sport climbing~Climbing|Surfing|Breaking~Breakdancing",
    ],
  ],
  [
    "NATURE",
    "Name a natural body of water.",
    [
      "Ocean|River",
      "Lake|Sea",
      "Pond|Stream",
      "Creek|Bay|Gulf",
      "Lagoon|Estuary|Spring",
      "Fjord|Strait|Tarn|Oxbow lake|Sound|Inlet",
    ],
  ],
  [
    "MUSIC",
    "Name a musical instrument with strings.",
    [
      "Guitar|Violin|Piano",
      "Cello|Harp|Bass guitar~Bass",
      "Ukulele|Banjo|Double bass~Upright bass",
      "Mandolin|Sitar|Viola|Lute",
      "Dulcimer|Zither|Erhu|Koto",
      "Sarangi|Santoor|Nyckelharpa|Theorbo|Guzheng|Sarod",
    ],
  ],
];
// The worldwide prompt accepts the full curated country collection rather than
// rejecting a familiar country simply because it was in another day's set.
const worldwide = bank[42][2];
worldwide.length = 6;
const entries: Array<{ canonical: string; aliases: string[]; tier: number }> =
  [];
const aliases = new Map<string, number>();
for (const groups of [
  worldwide,
  bank[0][2],
  bank[7][2],
  bank[14][2],
  bank[35][2],
]) {
  groups.forEach((group, tier) =>
    group
      .split("|")
      .filter(Boolean)
      .forEach((value) => {
        const [canonical, ...alternatives] = value.split("~");
        const names = [canonical, ...alternatives];
        const existing = names
          .map(normalize)
          .map((n) => aliases.get(n))
          .find((i) => i !== undefined);
        if (existing !== undefined) {
          for (const name of names) {
            if (
              !entries[existing].aliases.includes(name) &&
              name !== entries[existing].canonical
            )
              entries[existing].aliases.push(name);
            aliases.set(normalize(name), existing);
          }
        } else {
          const index = entries.length;
          entries.push({ canonical, aliases: alternatives, tier });
          for (const name of names) aliases.set(normalize(name), index);
        }
      }),
  );
}
bank[42][2] = Array.from({ length: 6 }, (_, tier) =>
  entries
    .filter((e) => e.tier === tier)
    .map((e) => [e.canonical, ...e.aliases].join("~"))
    .join("|"),
);
export const questions: SeedQuestion[] = bank.map(
  ([category, prompt, groups], index) => ({
    id: `everyday-${String(index + 1).padStart(2, "0")}`,
    set: Math.floor(index / 7),
    position: index % 7,
    category,
    prompt,
    groups,
  }),
);
