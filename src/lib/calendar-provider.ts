/**
 * Calendar Provider Abstraction
 * 
 * This interface allows swapping between different calendar providers
 * (local, Google Calendar, Outlook, etc.) without changing business logic
 * 
 * IMPORTANT: This is the foundation for bidirectional sync with Google Calendar
 */

export interface CalendarEvent {
  id: string;
  externalId?: string; // Google Calendar event ID
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
  color?: string;
  busy: boolean;
}

export interface CalendarSyncResult {
  success: boolean;
  externalEventId?: string;
  error?: string;
  syncedAt: string;
}

/**
 * ICalendarProvider - Core interface for calendar operations
 * Implementations: LocalCalendarProvider, GoogleCalendarProvider, OutlookProvider, etc.
 */
export interface ICalendarProvider {
  name: string;
  isAuthenticated(): boolean;
  authenticate(credentials: Record<string, string>): Promise<void>;

  /**
   * Create an event in the external calendar
   * Used when: New appointment created in barbershop app
   * Returns: External event ID for syncing
   */
  createEvent(event: CalendarEvent): Promise<CalendarSyncResult>;

  /**
   * Update an existing event in external calendar
   * Used when: Appointment rescheduled or updated
   */
  updateEvent(externalEventId: string, event: CalendarEvent): Promise<CalendarSyncResult>;

  /**
   * Delete/cancel an event in external calendar
   * Used when: Appointment cancelled
   */
  deleteEvent(externalEventId: string): Promise<CalendarSyncResult>;

  /**
   * List events for a date range
   * Used for: Checking availability, detecting conflicts, polling sync
   */
  listEvents(startTime: string, endTime: string): Promise<CalendarEvent[]>;

  /**
   * Get a single event by external ID
   * Used for: Verifying sync status, fetching updates
   */
  getEvent(externalEventId: string): Promise<CalendarEvent | null>;

  /**
   * Watch for changes (Google Calendar Watch API)
   * Returns: Channel ID to manage the watch subscription
   * Used for: Real-time sync instead of polling
   */
  watchChanges?(calendarId: string): Promise<string>;

  /**
   * Stop watching changes
   */
  unwatchChanges?(watchChannelId: string): Promise<void>;
}

/**
 * LocalCalendarProvider - Default implementation using in-memory storage
 * Used for MVP before real external calendar integration
 */
export class LocalCalendarProvider implements ICalendarProvider {
  name = "local";
  private events: Map<string, CalendarEvent> = new Map();

  isAuthenticated(): boolean {
    return true;
  }

  async authenticate(): Promise<void> {
    // No-op for local provider
  }

  async createEvent(event: CalendarEvent): Promise<CalendarSyncResult> {
    const id = `local-${Date.now()}`;
    this.events.set(id, { ...event, id });
    return {
      success: true,
      externalEventId: id,
      syncedAt: new Date().toISOString()
    };
  }

  async updateEvent(externalEventId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    const existing = this.events.get(externalEventId);
    if (!existing) {
      return {
        success: false,
        error: "Event not found",
        syncedAt: new Date().toISOString()
      };
    }
    this.events.set(externalEventId, { ...event, id: externalEventId });
    return {
      success: true,
      externalEventId,
      syncedAt: new Date().toISOString()
    };
  }

  async deleteEvent(externalEventId: string): Promise<CalendarSyncResult> {
    const existed = this.events.has(externalEventId);
    this.events.delete(externalEventId);
    return {
      success: existed,
      externalEventId,
      syncedAt: new Date().toISOString()
    };
  }

  async listEvents(startTime: string, endTime: string): Promise<CalendarEvent[]> {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();

    return Array.from(this.events.values()).filter((event) => {
      const eventStart = new Date(event.startTime).getTime();
      const eventEnd = new Date(event.endTime).getTime();
      return eventStart < end && eventEnd > start;
    });
  }

  async getEvent(externalEventId: string): Promise<CalendarEvent | null> {
    return this.events.get(externalEventId) ?? null;
  }
}

/**
 * GoogleCalendarProvider - Real implementation for Google Calendar API
 * 
 * FUTURE IMPLEMENTATION STEPS:
 * 1. Install: npm install googleapis google-auth-library
 * 2. Setup OAuth 2.0 (see IMPLEMENTATION_GUIDE.md)
 * 3. Implement authenticate() with OAuth flow
 * 4. Implement createEvent() calling calendar.events.insert()
 * 5. Implement updateEvent() calling calendar.events.update()
 * 6. Implement deleteEvent() calling calendar.events.delete()
 * 7. Implement listEvents() calling calendar.events.list()
 * 8. Setup Watch API for real-time sync (optional but recommended)
 * 9. Handle refresh tokens and expiration
 * 10. Add conflict detection and sync conflict resolution
 */
export class GoogleCalendarProvider implements ICalendarProvider {
  name = "google";

  isAuthenticated(): boolean {
    // TODO: Check if OAuth token is valid
    throw new Error("GoogleCalendarProvider not yet implemented. See IMPLEMENTATION_GUIDE.md");
  }

  async authenticate(credentials: Record<string, string>): Promise<void> {
    // TODO: Implement OAuth 2.0 flow
    throw new Error("GoogleCalendarProvider not yet implemented");
  }

  async createEvent(event: CalendarEvent): Promise<CalendarSyncResult> {
    throw new Error("GoogleCalendarProvider not yet implemented");
  }

  async updateEvent(externalEventId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    throw new Error("GoogleCalendarProvider not yet implemented");
  }

  async deleteEvent(externalEventId: string): Promise<CalendarSyncResult> {
    throw new Error("GoogleCalendarProvider not yet implemented");
  }

  async listEvents(startTime: string, endTime: string): Promise<CalendarEvent[]> {
    throw new Error("GoogleCalendarProvider not yet implemented");
  }

  async getEvent(externalEventId: string): Promise<CalendarEvent | null> {
    throw new Error("GoogleCalendarProvider not yet implemented");
  }

  async watchChanges(calendarId: string): Promise<string> {
    throw new Error("GoogleCalendarProvider not yet implemented");
  }

  async unwatchChanges(watchChannelId: string): Promise<void> {
    throw new Error("GoogleCalendarProvider not yet implemented");
  }
}

/**
 * CalendarProviderFactory
 * Decides which provider to use based on configuration
 */
export class CalendarProviderFactory {
  static create(providerName: string = "local"): ICalendarProvider {
    switch (providerName) {
      case "google":
        return new GoogleCalendarProvider();
      case "local":
      default:
        return new LocalCalendarProvider();
    }
  }
}
