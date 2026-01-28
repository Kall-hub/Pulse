export const pulseyBrain = [
  {
    keywords: ["status", "overview", "update"],
    response: "CURRENT PULSE: 4 Units pending inspection, 2 Job Cards are overdue. Shield is 100% active. Regina has authorized 1 viewing without clearance today.",
    action: "trigger_status_blink"
  },
  {
    keywords: ["regina", "principal", "bypass"],
    response: "MONITORING LOG: Regina bypassed the '30-minute travel buffer' for Unit A402 at 14:00. This is the 3rd bypass this week. Accountability log updated.",
    action: "log_bypass"
  },
  {
    keywords: ["inspections", "failed", "check"],
    response: "TECHNICAL ALERT: Unit B102 failed 'Plumbing/Water Zone' check. Auto-Job Card suggested for Lindiwe's team.",
    action: "nav_to_inspections"
  },
  {
    keywords: ["finance", "payment", "clearance"],
    response: "FINANCE LOCK: No viewing or move-in permitted until Deposit & Admin Fee reflect. Shield is blocking bypass attempts on Unit C501.",
    action: "show_finance_shield"
  },
  {
    keywords: ["cleaning", "cleaners", "maids"],
    response: "CLEANING ROSTER: 3 units scheduled for deep clean today. Unit A612 is currently in progress. Estimated completion: 16:00.",
    action: "track_cleaning"
  },
  {
    keywords: ["contractor", "lindiwe", "repair"],
    response: "CONTRACTOR LOG: Lindiwe is on-site at Unit D09. Burst pipe repair is 60% complete. No additional materials requested yet.",
    action: "open_job_cards"
  },
  {
    keywords: ["apartments", "vacant", "units"],
    response: "BUILDING STATS: 12 Units Vacant, 8 Units Pending Move-in, 2 Units under High Alert maintenance.",
    action: "view_apartments"
  },
  {
    keywords: ["kally", "operator", "boss"],
    response: "SITUATION REPORT: Senior Operator Kally is currently verified. System privileges: MAXIMUM. Shield overrides: GRANTED.",
    action: "salute"
  },
  {
    keywords: ["help", "commands", "what can you do"],
    response: "I monitor Duncan Court. Ask me about: 'Status', 'Regina', 'Inspections', 'Finance', or 'Contractors'. I see everything.",
    action: "show_help"
  }
];