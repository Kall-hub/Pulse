export const inspectionLayout = {
  // 1. ESSENTIALS (Appear in every room)
  essentials: {
    "Finishes": ["Ceiling / Cornice", "Walls / Paint", "Floor / Skirting", "Doors / Locks / Handles"],
    "Electrical": ["Light Switch", "Power Sockets", "Light Fitting / Globe"],
    "Windows": ["Glass / Putty", "Handles / Latches", "Burglar Bars", "Blinds / Rails"]
  },

  // 2. EXTRAS (Room specific)
  extras: {
    "Kitchen": {
      "Cooking": ["Stove Plates", "Oven Interior", "Oven Element", "Oven Light", "Control Knobs", "Extractor Fan"],
      "Wet Area": ["Sink Basin", "Tap Mechanism (Leaks)", "Drain / Plug", "Under-Counter Pipes"],
      "Storage": ["Cupboards (Hinges)", "Drawers (Runners)", "Countertops"]
    },
    "Bathroom": {
      "Ventilation": ["Extractor Fan", "Window Mechanism"],
      "Basin Area": ["Basin Condition", "Taps (Leak Check)", "Mirror / Cabinet"],
      "Washing": ["Shower (Door/Floor)", "Bathtub", "Towel Rails (Loose?)"],
      "Toilet": ["Mechanism / Flush", "Seat / Lid", "Leaks"]
    },
    "Lounge": {
      "Structure": ["Staircase / Railing", "Patio Door / Security Gate"],
      "Fixtures": ["Lampshades", "Built-in Cupboards"]
    },
    "Bedroom": {
      "Storage": ["Built-in Cupboards", "Hinges / Handles"],
    }
  }
};