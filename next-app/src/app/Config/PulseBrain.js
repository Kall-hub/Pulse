/**
 * PULSE BRAIN - Makes the app feel self-aware
 * Tracks user actions, learns patterns, and provides contextual check-ins
 */

class PulseBrain {
  constructor() {
    this.currentPage = null;
    this.lastAction = null;
    this.userActivity = {
      inspectionsCreated: 0,
      maintenanceLogged: 0,
      unitsVisited: new Set(),
      totalInteractions: 0,
      lastUnitSelected: null,
      currentFocus: 'idle',
      focusStartTime: Date.now(),
      recentActions: [] // Track last 5 actions
    };
    
    // Initialize listeners
    this.init();
  }

  init() {
    // Listen for page changes
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => this.onPageChange());
      window.addEventListener('load', () => this.onPageChange());

      // Expose this to window for access from components
      window.pulseAwareness = this;
    }
  }

  // Track when user selects a unit
  onUnitSelected(unitName) {
    this.userActivity.lastUnitSelected = unitName;
    this.userActivity.unitsVisited.add(unitName);
    this.userActivity.totalInteractions++;
    this.addRecentAction('unit-selected', unitName);
    this.updateFocus('unit-selected');
  }

  // Track inspection creation
  onInspectionCreated(unitName) {
    this.userActivity.inspectionsCreated++;
    this.userActivity.totalInteractions++;
    this.addRecentAction('inspection-created', unitName);
    this.updateFocus('inspection-active');
  }

  // Track maintenance logged
  onMaintenanceLogged(unitName, issueCount) {
    this.userActivity.maintenanceLogged++;
    this.userActivity.totalInteractions++;
    this.addRecentAction('maintenance-logged', `${unitName} (${issueCount} issues)`);
    this.updateFocus('maintenance-active');
  }

  // Track cleaning scheduled
  onCleaningBooked(unitName) {
    this.userActivity.totalInteractions++;
    this.addRecentAction('cleaning-booked', unitName);
    this.updateFocus('cleaning-active');
  }

  // Track invoice creation
  onInvoiceCreated(unitName, total) {
    this.userActivity.totalInteractions++;
    this.addRecentAction('invoice-created', `${unitName} - R${total}`);
    this.updateFocus('invoicing-active');
  }

  // Add to recent actions (keep only last 5)
  addRecentAction(action, details) {
    this.userActivity.recentActions.unshift({
      action,
      details,
      timestamp: Date.now()
    });
    if (this.userActivity.recentActions.length > 5) {
      this.userActivity.recentActions.pop();
    }
  }

  // Update current focus
  updateFocus(newFocus) {
    this.currentFocus = newFocus;
    this.focusStartTime = Date.now();
  }

  // Page change detection
  onPageChange() {
    const path = window.location.pathname;
    const pageMap = {
      '/inspections': 'Inspections',
      '/maintenance': 'Maintenance',
      '/cleanings': 'Housekeeping',
      '/invoicing': 'Finance Hub',
      '/dashboard': 'Executive Pulse',
      '/apartments': 'The Empire',
      '/clearance': 'Clearance Tracker',
      '/reports': 'Reports'
    };

    for (const [route, name] of Object.entries(pageMap)) {
      if (path.includes(route)) {
        this.currentPage = name;
        break;
      }
    }
  }

  // Get awareness level (0-100) based on interactions
  getAwarenessLevel() {
    return Math.min(100, this.userActivity.totalInteractions * 5);
  }

  // Get recent actions for display
  getRecentActions() {
    return this.userActivity.recentActions;
  }

  // Reset activity (for testing)
  reset() {
    this.userActivity = {
      inspectionsCreated: 0,
      maintenanceLogged: 0,
      unitsVisited: new Set(),
      totalInteractions: 0,
      lastUnitSelected: null,
      currentFocus: 'idle',
      focusStartTime: Date.now(),
      recentActions: []
    };
  }
}

// Create singleton instance
const pulseBrain = new PulseBrain();

export default pulseBrain;
