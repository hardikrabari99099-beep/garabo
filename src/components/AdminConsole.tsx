import React, { useState, useEffect } from "react";
import {
  Shield,
  ScanLine,
  RefreshCw,
  PlusCircle,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Ticket,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  Tag,
  IndianRupee,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { EventItem, Booking, SyncLog, PassType } from "../lib/types";
import {
  getStoredEvents,
  saveEvents,
  addOrUpdateEvent,
  deleteEvent,
  deleteMultipleEvents,
  updateEventPrices,
  updateEventPasses,
  deleteEventPass,
  getStoredBookings,
  updateBookingStatus,
  getStoredSyncLogs,
  addSyncLog,
  getSyncSettings,
  saveSyncSettings,
  SURAT_AREAS
} from "../lib/storage";
import { LIVE_FASTTICKET_SURAT_CATALOG, convertSourceToEventItem } from "../lib/fastticket-copier";
import { AiEventCreator } from "./AiEventCreator";

interface AdminConsoleProps {
  onOpenFastTicketCopier: () => void;
  onLogout?: () => void;
  onNotify: (msg: string) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  onOpenFastTicketCopier,
  onLogout,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<"events" | "ai" | "scanner" | "bookings" | "sync">("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Scanner State
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{
    status: "success" | "warning" | "error";
    message: string;
    booking?: Booking;
  } | null>(null);

  // Price & Pass Plan Editing Modal State
  const [priceEditingEvent, setPriceEditingEvent] = useState<EventItem | null>(null);
  const [editingPasses, setEditingPasses] = useState<PassType[]>([]);
  const [isAddingNewPlan, setIsAddingNewPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState<number>(499);
  const [newPlanDesc, setNewPlanDesc] = useState("Single night admission");

  // New/Edit Event Form State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<EventItem> | null>(null);
  const [formPasses, setFormPasses] = useState<PassType[]>([]);

  // Deletion States
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  useEffect(() => {
    setEvents(getStoredEvents());
    setBookings(getStoredBookings());
    setSyncLogs(getStoredSyncLogs());

    const eventHandler = (e: any) => setEvents(e.detail || getStoredEvents());
    const bookingHandler = (e: any) => setBookings(e.detail || getStoredBookings());
    const syncHandler = (e: any) => setSyncLogs(e.detail || getStoredSyncLogs());

    window.addEventListener("events_updated", eventHandler);
    window.addEventListener("bookings_updated", bookingHandler);
    window.addEventListener("synclogs_updated", syncHandler);

    return () => {
      window.removeEventListener("events_updated", eventHandler);
      window.removeEventListener("bookings_updated", bookingHandler);
      window.removeEventListener("synclogs_updated", syncHandler);
    };
  }, []);

  // Open Quick Price & Plan Editor
  const handleOpenPriceEdit = (ev: EventItem) => {
    setPriceEditingEvent(ev);
    setEditingPasses(
      ev.passes && ev.passes.length > 0
        ? JSON.parse(JSON.stringify(ev.passes))
        : [{ id: "single", name: "Single Night Pass", price: 499, desc: "Entry for 1 night", left: 100 }]
    );
    setIsAddingNewPlan(false);
    setNewPlanName("");
    setNewPlanPrice(499);
    setNewPlanDesc("Single night admission");
  };

  // Delete a pass plan in the Quick Editor
  const handleDeletePassFromEdit = (passId: string) => {
    if (editingPasses.length <= 1) {
      onNotify("At least one pass plan must be kept.");
      return;
    }
    const target = editingPasses.find((p) => p.id === passId);
    setEditingPasses(editingPasses.filter((p) => p.id !== passId));
    onNotify(`Removed plan "${target?.name || passId}". Click Save to confirm.`);
  };

  // Add a new pass plan in the Quick Editor
  const handleAddPassToEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) {
      onNotify("Please enter a pass plan name");
      return;
    }
    const newPass: PassType = {
      id: "pass-" + Date.now().toString(36),
      name: newPlanName.trim(),
      price: Math.max(1, Number(newPlanPrice) || 499),
      desc: newPlanDesc.trim() || "Admission pass",
      left: 100,
      season: newPlanName.toLowerCase().includes("season") || newPlanName.toLowerCase().includes("9 nights"),
      vip: newPlanName.toLowerCase().includes("vip") || newPlanName.toLowerCase().includes("royal"),
    };
    setEditingPasses([...editingPasses, newPass]);
    setNewPlanName("");
    setNewPlanPrice(499);
    setNewPlanDesc("Single night admission");
    setIsAddingNewPlan(false);
    onNotify(`Added plan "${newPass.name}". Click Save to apply.`);
  };

  // Save Updated Pass Plans & Prices
  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceEditingEvent) return;
    if (editingPasses.length === 0) {
      onNotify("At least one pass plan is required.");
      return;
    }

    updateEventPasses(priceEditingEvent.id, editingPasses);
    onNotify(`Pass plans and prices updated successfully for "${priceEditingEvent.name}"!`);
    setPriceEditingEvent(null);
  };


  // Handle gate scan simulation (clean input, no auto ID display)
  const handleVerifyScan = (targetCode?: string) => {
    const target = (targetCode || scanInput).trim().toUpperCase();
    if (!target) return;

    const booking = bookings.find(
      (b) =>
        (b.id && b.id.toUpperCase() === target) ||
        (b.booking_id && b.booking_id.toUpperCase() === target) ||
        (b.phone && b.phone.includes(target)) ||
        (b.name && b.name.toUpperCase().includes(target))
    );

    if (!booking) {
      setScanResult({
        status: "error",
        message: `Pass "${target}" not found in Surat gate database. Entry Denied!`,
      });
      onNotify("Scan Failed: Pass Not Found");
      return;
    }

    if (booking.status === "USED") {
      setScanResult({
        status: "warning",
        message: `Pass for ${booking.name} was already scanned at turnstile! Re-entry restricted.`,
        booking,
      });
      onNotify("Warning: Pass already scanned");
      return;
    }

    // Mark as used
    updateBookingStatus(booking.id, "USED");
    setScanResult({
      status: "success",
      message: `ACCESS GRANTED! Verified entry for ${booking.name} (${booking.qty}x ${booking.pass_name}) at ${booking.event_name}.`,
      booking: { ...booking, status: "USED" },
    });
    onNotify(`✓ Access Granted for ${booking.name}`);
  };

  // FastTicket Sync Operation
  const handleSyncFastTicket = () => {
    setIsSyncing(true);
    setTimeout(() => {
      let added = 0;
      let updated = 0;
      const currentEvents = getStoredEvents();
      const currentMap = new Map(currentEvents.map((e) => [e.name.toLowerCase(), e]));

      LIVE_FASTTICKET_SURAT_CATALOG.forEach((item) => {
        const existing = currentMap.get(item.name.toLowerCase());
        if (existing) {
          updated++;
        } else {
          currentEvents.unshift(convertSourceToEventItem(item));
          added++;
        }
      });

      saveEvents(currentEvents);

      const log: SyncLog = {
        id: "sync-" + Date.now().toString(36),
        timestamp: new Date().toLocaleTimeString() + ", " + new Date().toLocaleDateString(),
        source: "https://www.fastticket.live/surat",
        status: "success",
        eventsProcessed: LIVE_FASTTICKET_SURAT_CATALOG.length,
        newEventsAdded: added,
        eventsUpdated: updated,
        duplicatesSkipped: 0,
        soldOutDetected: 0,
        errors: [],
        details: LIVE_FASTTICKET_SURAT_CATALOG.map((c) => ({
          eventTitle: c.name,
          action: "added" as const,
        })),
      };

      addSyncLog(log);
      setIsSyncing(false);
      onNotify(`FastTicket Sync complete! ${added} new events added, ${updated} refreshed.`);
    }, 1000);
  };

  const handleToggleSoldOut = (event: EventItem) => {
    const updated = { ...event, isSoldOut: !event.isSoldOut };
    addOrUpdateEvent(updated);
    onNotify(`Event marked as ${updated.isSoldOut ? "Sold Out" : "Active"}`);
  };

  const handleDelete = (id: string, name: string) => {
    const target = events.find((e) => e.id === id);
    if (target) {
      setEventToDelete(target);
    } else {
      deleteEvent(id);
      onNotify(`Event "${name}" deleted.`);
    }
  };

  const handleConfirmDeleteSingle = () => {
    if (!eventToDelete) return;
    const name = eventToDelete.name;
    const id = eventToDelete.id;
    deleteEvent(id);
    setSelectedEventIds((prev) => prev.filter((item) => item !== id));
    setEvents((prev) => prev.filter((item) => item.id !== id));
    setEventToDelete(null);
    onNotify(`Event "${name}" permanently deleted from catalog.`);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedEventIds.length === 0) return;
    const count = selectedEventIds.length;
    deleteMultipleEvents(selectedEventIds);
    setEvents((prev) => prev.filter((item) => !selectedEventIds.includes(item.id)));
    setSelectedEventIds([]);
    setIsBulkDeleteModalOpen(false);
    onNotify(`Successfully deleted ${count} events from catalog.`);
  };

  const handleToggleSelectAll = () => {
    if (selectedEventIds.length === events.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(events.map((e) => e.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.name) return;

    const calculatedPasses =
      formPasses && formPasses.length > 0
        ? formPasses
        : [
            { id: "single", name: "Single Night Pass", price: 499, desc: "Entry for 1 night", left: 100 },
            { id: "couple", name: "Couple Pass (1 Night)", price: 899, desc: "Entry for couple", left: 50 },
            { id: "season", name: "All 9 Nights Season Pass", price: 3499, desc: "All nights pass", left: 25, season: true },
          ];
    const minPrice = Math.min(...calculatedPasses.map((p) => p.price));

    const fullItem: EventItem = {
      id: editingEvent.id || "ev-" + Date.now().toString(36),
      name: editingEvent.name,
      city: editingEvent.city || "Surat",
      category: editingEvent.category || "navratri",
      venue: editingEvent.venue || "Surat Arena",
      address: editingEvent.address || "Surat, Gujarat",
      area: editingEvent.area || "Sarsana",
      dates: editingEvent.dates || "3 – 11 Oct 2026",
      time: editingEvent.time || "8:00 PM – 2:00 AM",
      startTime: editingEvent.startTime || "08:00 PM",
      endTime: editingEvent.endTime || "02:00 AM",
      artist: editingEvent.artist || "Live Folk Troupe",
      tag: editingEvent.tag || "Surat Live",
      eventType: editingEvent.eventType || "Traditional Garba",
      about: editingEvent.about || "Surat Navratri Celebration",
      highlights: editingEvent.highlights || ["Live Orchestra", "Safe Family Venue"],
      facilities: editingEvent.facilities || ["Parking", "Security", "Food Plaza"],
      dressCode: editingEvent.dressCode || "Traditional Gujarati attire.",
      ageRestriction: editingEvent.ageRestriction || "All ages welcome.",
      rules: editingEvent.rules || ["Valid QR pass required"],
      terms: editingEvent.terms || ["Non-refundable"],
      organizer: editingEvent.organizer || "Surat Cultural Guild",
      coverImage:
        editingEvent.coverImage ||
        "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=1200&auto=format&fit=crop&q=80",
      nights: editingEvent.nights || ["3 Oct 2026", "4 Oct 2026", "5 Oct 2026", "6 Oct 2026", "7 Oct 2026"],
      passes: calculatedPasses,
      startingPrice: minPrice,
      active: true,
      sort: 1,
      isFeatured: editingEvent.isFeatured ?? true,
      sourceName: "AapnoPass Admin",
    };

    addOrUpdateEvent(fullItem);
    setShowEventModal(false);
    setEditingEvent(null);
    onNotify(`Event "${fullItem.name}" saved with updated pass plans!`);
  };


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="font-display font-black text-2xl text-white">
              Organizer Panel & Pass Control
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Edit Pass Prices • Gate Check-in • Inventory & FastTicket Sync
          </p>
        </div>

        {/* Sync & Copy Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("ai")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-400/30 text-amber-300 border border-amber-500/40 transition cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Event Creator</span>
          </button>

          <button
            onClick={onOpenFastTicketCopier}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Import Event</span>
          </button>

          <button
            onClick={handleSyncFastTicket}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync FastTicket"}</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 transition cursor-pointer"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("events")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "events"
              ? "border-amber-400 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Events & Prices ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "ai"
              ? "border-amber-400 text-amber-400 bg-amber-500/5 shadow-sm"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>✨ AI Event Creator</span>
        </button>

        <button
          onClick={() => setActiveTab("scanner")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "scanner"
              ? "border-amber-400 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ScanLine className="w-4 h-4" />
          <span>Gate Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab("bookings")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "bookings"
              ? "border-amber-400 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Bookings ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sync")}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "sync"
              ? "border-amber-400 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Sync Status</span>
        </button>
      </div>

      {/* TAB 1: MANAGE EVENTS & EDIT PRICES */}
      {activeTab === "events" && (
        <div className="space-y-4">
          {/* Quick AI Creator Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-900/20 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-sm font-bold text-white font-display">
                  AI Instant Event Creator (ઇન્સ્ટન્ટ ઇવેન્ટ બનાવો)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  NEW
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                ગુજરાતી કે English માં માત્ર વિગત લખો (દા.ત. &ldquo;સરસાણા ડોમ ફાલ્ગુની પાઠક ગરબા સિંગલ ૬૫૦ કપલ ૧૨૦૦&rdquo;) — AI તરત જ આખી ઇવેન્ટ અને પાસના ભાવો બનાવી દેશે!
              </p>
            </div>
            <button
              onClick={() => setActiveTab("ai")}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 flex items-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer shrink-0 font-display"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open AI Creator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Showing <strong>{events.length}</strong> active Surat events. Click <strong>Edit Prices</strong> to change pass rates anytime.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("ai")}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Create</span>
              </button>

              <button
                onClick={() => {
                  setEditingEvent({
                    name: "",
                    area: "Sarsana",
                    venue: "",
                    dates: "3 – 11 Oct 2026",
                    time: "8:00 PM – 2:00 AM",
                    artist: "",
                  });
                  setFormPasses([
                    { id: "single", name: "Single Night Pass", price: 499, desc: "Entry for 1 night", left: 100 },
                    { id: "couple", name: "Couple Pass (1 Night)", price: 899, desc: "Entry for couple", left: 50 },
                    { id: "season", name: "All 9 Nights Season Pass", price: 3499, desc: "All 9 nights pass", left: 25, season: true },
                    { id: "vip", name: "Royal VIP Season Pass", price: 6999, desc: "VIP lounge & hospitality", left: 15, season: true, vip: true },
                  ]);
                  setShowEventModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Manual Add</span>
              </button>

            </div>
          </div>

          {/* Bulk Actions Toolbar (when 1 or more events selected) */}
          {selectedEventIds.length > 0 && (
            <div className="bg-rose-950/80 border-2 border-rose-500/50 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 text-white shadow-xl animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>{selectedEventIds.length} event(s) selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEventIds([])}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedEventIds.length})</span>
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={events.length > 0 && selectedEventIds.length === events.length}
                        onChange={handleToggleSelectAll}
                        className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer w-3.5 h-3.5"
                        title="Select All Events"
                      />
                    </th>
                    <th className="p-3.5">Event</th>
                    <th className="p-3.5">Venue & Area</th>
                    <th className="p-3.5">Pass Prices (Editable)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-75" />
                        <p className="font-bold text-white text-sm">No events found in catalog</p>
                        <p className="text-xs text-slate-500 mt-1">Use the "AI Create" tab to generate events or click "Manual Add".</p>
                      </td>
                    </tr>
                  ) : (
                    events.map((ev) => (
                      <tr key={ev.id} className={`hover:bg-slate-850/50 transition ${selectedEventIds.includes(ev.id) ? "bg-rose-950/20" : ""}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedEventIds.includes(ev.id)}
                            onChange={() => handleToggleSelectOne(ev.id)}
                            className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-white line-clamp-1">{ev.name}</div>
                            {ev.sourceName === "AI Instant Creator" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-0.5" title="Created with AI">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>AI</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{ev.artist}</div>
                        </td>
                        <td className="p-3.5">
                          <div>{ev.venue}</div>
                          <div className="text-[10px] text-amber-400">{ev.area}, Surat</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {ev.passes?.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-200 group"
                              >
                                <span>
                                  {p.name.replace(/Pass/i, "").trim()}:{" "}
                                  <strong className="text-amber-400 font-bold">₹{p.price}</strong>
                                </span>
                                {(ev.passes || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteEventPass(ev.id, p.id);
                                      onNotify(`Plan "${p.name}" deleted from "${ev.name}".`);
                                    }}
                                    className="text-slate-500 hover:text-rose-400 p-0.5 rounded hover:bg-rose-950/50 transition cursor-pointer"
                                    title={`Delete "${p.name}" plan`}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                            <button
                              onClick={() => handleOpenPriceEdit(ev)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition cursor-pointer ml-1 flex items-center gap-1"
                              title="Manage pass plans and prices"
                            >
                              <Tag className="w-3 h-3" />
                              <span>Manage Plans</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleSoldOut(ev)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                              ev.isSoldOut
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {ev.isSoldOut ? "Sold Out" : "Active"}
                          </button>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenPriceEdit(ev)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 cursor-pointer transition"
                            title="Edit Pass Prices & Plans"
                          >
                            ₹ Change Price
                          </button>
                          <button
                            onClick={() => {
                              setEditingEvent(ev);
                              setFormPasses(
                                ev.passes && ev.passes.length > 0
                                  ? JSON.parse(JSON.stringify(ev.passes))
                                  : [{ id: "single", name: "Single Night Pass", price: 499, desc: "Entry for 1 night", left: 100 }]
                              );
                              setShowEventModal(true);
                            }}
                            className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer border border-slate-700 transition inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="Edit Event Details & Passes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setEventToDelete(ev)}
                            className="p-1.5 px-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 cursor-pointer inline-flex items-center gap-1 transition text-[11px] font-bold shadow-xs"
                            title={`Delete event "${ev.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI INSTANT EVENT CREATOR */}
      {activeTab === "ai" && (
        <AiEventCreator
          onEventCreated={(newEvent) => {
            setEvents(getStoredEvents());
            onNotify(`Event "${newEvent.name}" created and published live!`);
          }}
          onOpenPriceEdit={(ev) => handleOpenPriceEdit(ev)}
          onEditEvent={(ev) => {
            setEditingEvent(ev);
            setFormPasses(
              ev.passes && ev.passes.length > 0
                ? JSON.parse(JSON.stringify(ev.passes))
                : [{ id: "single", name: "Single Night Pass", price: 499, desc: "Entry for 1 night", left: 100 }]
            );
            setShowEventModal(true);
          }}
          onNotify={onNotify}
        />
      )}


      {/* TAB 2: GATE SCANNER (CLEAN - NO AUTO ID DISPLAY) */}
      {activeTab === "scanner" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Turnstile Gate Scanner
              </span>
              <h3 className="font-display font-bold text-lg text-white">
                Verify Digital Pass at Gate
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan attendee QR code or enter booking reference/attendee phone number.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan QR or Enter Booking Ref / Phone"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                />
                <button
                  onClick={() => handleVerifyScan()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
                >
                  Verify Entry
                </button>
              </div>

              {bookings.length > 0 && (
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Recent passes ready for entry:</span>
                  <span className="text-amber-400 font-semibold">{bookings.filter(b => b.status === "CONFIRMED").length} active</span>
                </div>
              )}
            </div>

            {/* Scan Output Screen */}
            {scanResult && (
              <div
                className={`p-4 rounded-xl border space-y-2 mt-4 ${
                  scanResult.status === "success"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                    : scanResult.status === "warning"
                    ? "bg-amber-950/40 border-amber-500/40 text-amber-200"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-200"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {scanResult.status === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {scanResult.status === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {scanResult.status === "error" && <XCircle className="w-5 h-5 text-rose-400" />}
                  <span>{scanResult.status.toUpperCase()}</span>
                </div>
                <p className="text-xs leading-relaxed">{scanResult.message}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-white">
              Gate Turnstile Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Total Issued Passes</span>
                <span className="font-mono text-xl font-black text-white">{bookings.length}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Admitted at Turnstile</span>
                <span className="font-mono text-xl font-black text-emerald-400">
                  {bookings.filter((b) => b.status === "USED").length}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Confirmed / Valid</span>
                <span className="font-mono text-xl font-black text-amber-400">
                  {bookings.filter((b) => b.status === "CONFIRMED").length}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Gate Status</span>
                <span className="font-mono text-xl font-black text-cyan-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOOKINGS AUDIT (CLEAN - NO CRYPTIC AUTO ID COLUMN) */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Total Bookings: <strong>{bookings.length}</strong>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Attendee</th>
                  <th className="p-3.5">Event</th>
                  <th className="p-3.5">Pass Tier</th>
                  <th className="p-3.5">Schedule</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {bookings.map((b, idx) => (
                  <tr key={b.id || idx} className="hover:bg-slate-850/50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{b.name || b.customer_name}</div>
                      <div className="text-[10px] text-slate-400">{b.phone || b.customer_phone}</div>
                    </td>
                    <td className="p-3.5 max-w-[180px] truncate">{b.event_name}</td>
                    <td className="p-3.5">
                      <span className="font-medium text-amber-300">{b.pass_name}</span>
                      <span className="text-slate-400 block text-[10px]">Qty: {b.qty}</span>
                    </td>
                    <td className="p-3.5 text-slate-300">{b.night}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      ₹{b.total.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          b.status === "USED"
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {b.status !== "USED" && (
                        <button
                          onClick={() => {
                            updateBookingStatus(b.id, "USED");
                            onNotify(`Marked ${b.name}'s pass as USED`);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold cursor-pointer"
                        >
                          Check In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYNC AUDIT */}
      {activeTab === "sync" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Integration Status
                </span>
                <h3 className="font-display font-bold text-lg text-white">
                  FastTicket.live/surat API Sync Engine
                </h3>
              </div>
              <button
                onClick={handleSyncFastTicket}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Sync Now</span>
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Active endpoint: <code>https://www.fastticket.live/surat</code>. Automatically imports newly published Navratri garba arenas and pricing.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-display font-bold text-sm text-white">
              Sync Operations History ({syncLogs.length})
            </h4>

            {syncLogs.length === 0 ? (
              <p className="text-xs text-slate-400">No sync operations run yet. Click "Sync Now" above.</p>
            ) : (
              <div className="space-y-2">
                {syncLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">{log.source}</div>
                      <div className="text-[10px] text-slate-400">{log.timestamp}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold">{log.eventsProcessed} events processed</span>
                      <div className="text-[10px] text-slate-400">{log.newEventsAdded} added • {log.eventsUpdated} updated</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANAGE PASS PLANS & PRICES MODAL (WITH INSTANT PLAN DELETION) */}
      {priceEditingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Tag className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    Manage Pass Plans & Prices
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-sm">
                    {priceEditingEvent.name} • {priceEditingEvent.area}, Surat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPriceEditingEvent(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrices} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 text-[11px] text-slate-300 flex items-center justify-between">
                <span>
                  તમે અહીંથી કોઈપણ પ્લાન ડિલીટ (Delete) કરી શકો છો અથવા નવો પ્લાન ઉમેરી શકો છો.
                </span>
                <span className="text-amber-400 font-bold font-mono">
                  {editingPasses.length} Plans Active
                </span>
              </div>

              {/* Dynamic Pass Plans List */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {editingPasses.map((pass, index) => (
                  <div
                    key={pass.id}
                    className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 hover:border-slate-700 space-y-2.5 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={pass.name}
                          onChange={(e) => {
                            const updated = [...editingPasses];
                            updated[index].name = e.target.value;
                            setEditingPasses(updated);
                          }}
                          placeholder="Plan Name (e.g. Couple Pass, VIP Lounge)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      {/* Price Input */}
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-2.5 top-1.5 text-slate-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={pass.price}
                          onChange={(e) => {
                            const updated = [...editingPasses];
                            updated[index].price = Number(e.target.value) || 0;
                            setEditingPasses(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-6 pr-2 py-1.5 text-xs text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      {/* DELETE PLAN BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleDeletePassFromEdit(pass.id)}
                        disabled={editingPasses.length <= 1}
                        className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
                        title={editingPasses.length <= 1 ? "Cannot delete the last remaining plan" : `Delete "${pass.name}" plan`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={pass.desc || ""}
                      onChange={(e) => {
                        const updated = [...editingPasses];
                        updated[index].desc = e.target.value;
                        setEditingPasses(updated);
                      }}
                      placeholder="Plan description (e.g. Entry for 1 night, VIP elevated deck & valet)"
                      className="w-full bg-slate-900/60 border border-slate-850 rounded-xl px-3 py-1 text-[11px] text-slate-400 focus:border-slate-700 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Add New Plan Accordion / Box */}
              {!isAddingNewPlan ? (
                <button
                  type="button"
                  onClick={() => setIsAddingNewPlan(true)}
                  className="w-full py-2.5 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 flex items-center justify-center gap-2 transition cursor-pointer text-xs font-bold"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Add New Pass Plan / Tier (નવો પ્લાન ઉમેરો)</span>
                </button>
              ) : (
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 text-xs">
                      + Add New Pass Plan
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewPlan(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-8">
                      <input
                        type="text"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        placeholder="Plan Name (e.g. Early Bird Single, VIP Table)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="sm:col-span-4 relative">
                      <span className="absolute left-3 top-2 text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        value={newPlanPrice}
                        onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono font-bold"
                        placeholder="Price"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    value={newPlanDesc}
                    onChange={(e) => setNewPlanDesc(e.target.value)}
                    placeholder="Short description (e.g. Single admission on festival night)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-300"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewPlan(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPassToEdit}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
                    >
                      Add Plan
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPriceEditingEvent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 font-black text-slate-950 hover:bg-amber-400 shadow-md cursor-pointer transition font-display"
                >
                  Save All Plans & Prices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL EVENT ADD / EDIT MODAL (DYNAMIC PASS TIERS WITH PLAN DELETION) */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-lg text-white">
                {editingEvent?.id ? "Edit Event Details & Pass Plans" : "Create New Surat Event"}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Event Name:</label>
                <input
                  type="text"
                  required
                  value={editingEvent?.name || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. Surat Heritage Dandiya 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Area in Surat:</label>
                  <select
                    value={editingEvent?.area || "Sarsana"}
                    onChange={(e) => setEditingEvent({ ...editingEvent, area: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none"
                  >
                    {SURAT_AREAS.filter((a) => a !== "All").map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Venue:</label>
                  <input
                    type="text"
                    required
                    value={editingEvent?.venue || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none"
                    placeholder="e.g. SIECC Dome"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Lead Artist / Performer:</label>
                <input
                  type="text"
                  required
                  value={editingEvent?.artist || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, artist: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. Kinjal Dave"
                />
              </div>

              {/* Dynamic Pass Plans in Full Modal */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold block text-xs uppercase tracking-wider">
                    Pass Plans ({formPasses.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newP: PassType = {
                        id: "pass-" + Date.now().toString(36),
                        name: "Custom Pass",
                        price: 599,
                        desc: "Entry admission",
                        left: 100,
                      };
                      setFormPasses([...formPasses, newP]);
                    }}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add Plan</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {formPasses.map((p, idx) => (
                    <div key={p.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => {
                          const updated = [...formPasses];
                          updated[idx].name = e.target.value;
                          setFormPasses(updated);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        placeholder="Plan name"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1 text-slate-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          value={p.price}
                          onChange={(e) => {
                            const updated = [...formPasses];
                            updated[idx].price = Number(e.target.value) || 0;
                            setFormPasses(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-5 pr-2 py-1 text-xs text-white font-mono font-bold"
                        />
                      </div>
                      {formPasses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormPasses(formPasses.filter((item) => item.id !== p.id));
                          }}
                          className="p-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-500/30 cursor-pointer"
                          title="Delete Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Poster Image URL:</label>
                <input
                  type="url"
                  value={editingEvent?.coverImage || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, coverImage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {editingEvent?.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      const ev = events.find((e) => e.id === editingEvent.id);
                      if (ev) {
                        setShowEventModal(false);
                        setEventToDelete(ev);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Event</span>
                  </button>
                ) : <div />}
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 font-black text-slate-950 hover:bg-amber-400 shadow-md cursor-pointer transition font-display"
                  >
                    Save Event & Plans
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE EVENT DELETE CONFIRMATION MODAL */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    Delete Event Permanently?
                  </h3>
                  <p className="text-xs text-rose-400 font-semibold">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEventToDelete(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Summary Card */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <img
                src={eventToDelete.coverImage}
                alt={eventToDelete.name}
                className="w-14 h-14 object-cover rounded-xl border border-slate-700 shrink-0"
              />
              <div className="truncate">
                <h4 className="font-bold text-white text-xs truncate">{eventToDelete.name}</h4>
                <p className="text-[11px] text-amber-400 mt-0.5">{eventToDelete.area}, Surat</p>
                <p className="text-[10px] text-slate-400">{eventToDelete.venue} • {eventToDelete.passes?.length || 0} Pass Plans</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{eventToDelete.name}"</strong>? It will be immediately removed from the public website catalog, and ticket passes will no longer be bookable.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Event</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    Delete {selectedEventIds.length} Selected Events?
                  </h3>
                  <p className="text-xs text-rose-400 font-semibold">
                    Bulk delete operation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              The following <strong className="text-white">{selectedEventIds.length} events</strong> will be permanently removed from AapnoPass:
            </p>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {events
                .filter((e) => selectedEventIds.includes(e.id))
                .map((ev) => (
                  <div key={ev.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-xs">{ev.name}</span>
                    <span className="text-[10px] text-amber-400 font-mono shrink-0">{ev.area}</span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All {selectedEventIds.length} Events</span>
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
