export const SHARED_ITEMS = [
  "Walls",
  "Tile wall",
  "Ceiling",
  "Floor",
  "Windows",
  "Doors",
  "Curtain Rail / Blinds",
  "Lights / Globes",
  "Plugs / Sockets",
  "Light Switches"
];

export const inspectionLayout = {
  Kitchen: {
    Core: SHARED_ITEMS,
    Appliances: [
      "Stove / Oven",
      "Extractor / Hob",
      "Fridge / Freezer",
      "Microwave Space"
    ],
    Plumbing: [
      "Sink / Basin",
      "Taps",
      "Drains / Trap",
      "Cabinets & Counters"
    ],
  },
  Bathroom: {
    Core: SHARED_ITEMS,
    Plumbing: [
      "Toilet",
      "Basin",
      "Shower",
      "shower head",
      "Bath",
      "Taps & Mixers",
      "Drains / Trap"
    ],
    Fixtures: [
      "Mirror / Cabinet",
      "Towel Rails / Hooks"
    ],
  },
  Lounge: {
    Core: SHARED_ITEMS,
    Fixtures: [
      "Curtains / Blinds",
      "Balcony Door / Slider",
      "Intercom / Bell"
    ],
  },
  Bedroom: {
    Core: SHARED_ITEMS,
    Storage: [
      "Wardrobe / Cupboards",
      "Curtains / Blinds"
    ],
  },
  Utilities: {
    Core: [
      "Walls",
      "Ceiling",
      "Floor",
      "Lights / Globes"
    ],
    Equipment: [
      "Water Heater",
      "Electrical Panel",
      "Gas Meter",
      "Storage Shelves"
    ],
  },
  Exterior: {
    Core: [
      "Walls",
      "Windows",
      "Doors",
      "Lights"
    ],
    Landscaping: [
      "Front Garden / Yard",
      "Patio / Deck",
      "Fence / Gates",
      "Letterbox"
    ],
  },
};

export default inspectionLayout;