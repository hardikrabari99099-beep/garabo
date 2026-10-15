import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MapPin,
  Tag,
  IndianRupee,
  Edit3,
  ExternalLink,
  PlusCircle,
  Clock,
  Layers,
  Music,
  Check,
  ShieldCheck,
  RotateCw,
  Globe,
  Link2,
  Trash2,
  Image as ImageIcon,
  Copy,
  Eye,
  ListPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { EventItem, PassType } from "../lib/types";
import { addOrUpdateEvent, addMultipleEvents, deleteEvent, deleteEventPass } from "../lib/storage";

interface AiEventCreatorProps {
  onEventCreated?: (event: EventItem) => void;
  onOpenPriceEdit?: (event: EventItem) => void;
  onEditEvent?: (event: EventItem) => void;
  onNotify: (msg: string) => void;
}

const SAMPLE_URLS = [
  {
    title: "Kesariya Navratri 4.0 - FastTicket",
    url: "https://www.fastticket.live/surat/kesariya-navratri-4-0",
    venue: "Sarsana Dome, Surat",
  },
  {
    title: "Garvi Vaarso Surat 2026",
    url: "https://www.fastticket.live/surat/garvi-vaarso-navratri-2026",
    venue: "Vesu Arena, Surat",
  },
  {
    title: "Falguni Pathak Dandiya Mahotsav",
    url: "https://in.bookmyshow.com/surat/events/falguni-pathak-navratri-surat/ET003921",
    venue: "Surat Convention Centre",
  },
  {
    title: "Tapi Riverfront Raas-Garba",
    url: "https://insider.in/surat-tapi-riverfront-navratri-celebration-2026/event",
    venue: "Adajan Riverfront, Surat",
  },
];

const SAMPLE_PROMPTS = [
  {
    title: "🔥 સુરતના ૩ મોટા ગરબા (Generate 3 Events at once)",
    prompt:
      "સુરતના 3 પ્રખ્યાત ગરબા મહોત્સવ બનાવો: 1. ફાલ્ગુની પાઠક (સરસાણા SIECC એસી ડોમ), 2. કિંજલ દવે (વેસુ લક્ષ્મી હેરિટેજ ગ્રાઉન્ડ), 3. કીર્તિદાન ગઢવી (અડાજણ તાપી રિવરફ્રન્ટ). તમામમાં સિંગલ પાસ ₹499-₹650, કપલ પાસ ₹899-₹1200, સીઝન પાસ ₹3499-₹4500 અને VIP ₹6999-₹8500.",
    badge: "3 Events at Once",
    count: 3,
  },
  {
    title: "👑 Falguni Pathak - Sarsana AC Dome",
    prompt:
      "સરસાણા એસી ડોમ મા ફાલ્ગુની પાઠક ગરબા 2026, તારીખ 4 થી 12 ઓક્ટોબર, સિંગલ પાસ ₹650, કપલ ₹1200, સીઝન ₹4500, વીઆઈપી ₹8500, ફૂડ કોર્ટ, એસી ડોમ અને સુરત ના ટોપ આર્ટિસ્ટ",
    badge: "Celebrity / Sarsana",
    count: 1,
  },
  {
    title: "💃 Kinjal Dave - Laxmi Ground Vesu",
    prompt:
      "વેસુ લક્ષ્મી ગ્રાઉન્ડ મા કિંજલ દવે ગરબા મહોત્સવ 2026 તારીખ 3 થી 11 ઓક્ટોબર સિંગલ પાસ ₹499 કપલ ₹899 સીઝન પાસ ₹3499 વીઆઈપી ₹6999, સુરત નું સૌથી મોટું ગ્રાઉન્ડ",
    badge: "Traditional / Vesu",
    count: 1,
  },
  {
    title: "🪘 સુરતના 4 પ્રીમિયમ ગ્રાઉન્ડ (Generate 4 Events at once)",
    prompt:
      "Generate 4 top Navratri events in Surat: SIECC Dome (Sarsana), Laxmi Heritage Lawn (Vesu), Tapi Riverfront (Adajan), and Dumas Road Luxury Lawn. Authentic Gujarati folk songs, laser show, parking, food court, single pass ₹450-₹700, couple ₹850-₹1400, season ₹3200-₹4800.",
    badge: "4 Events at Once",
    count: 4,
  },
];

export const AiEventCreator: React.FC<AiEventCreatorProps> = ({
  onEventCreated,
  onOpenPriceEdit,
  onEditEvent,
  onNotify,
}) => {
  const [mode, setMode] = useState<"url" | "prompt">("prompt");
  const [websiteUrl, setWebsiteUrl] = useState("https://www.fastticket.live/surat/kesariya-navratri-4-0");
  const [prompt, setPrompt] = useState("");
  const [eventCount, setEventCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [createdEvents, setCreatedEvents] = useState<EventItem[]>([]);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Handle URL Extraction with AI
  const handleScrapeUrl = async (customUrl?: string) => {
    const target = (customUrl || websiteUrl).trim();
    if (!target) {
      setError("કૃપા કરીને ઇવેન્ટની વેબસાઈટ URL દાખલ કરો.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingStep("વેબસાઈટ પેજ અને પોસ્ટર ડેટા ફેચ થઈ રહ્યો છે (Fetching page & poster graphics)...");

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep("AI ઇવેન્ટની વિગતો, આર્ટિસ્ટ અને પાસના ભાવો શોધી રહ્યું છે (Extracting pass tiers)...");
      }, 700);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep("હાઈ-રિઝોલ્યુશન ગ્રાફિક્સ અને ઇવેન્ટ કાર્ડ તૈયાર થઈ રહ્યું છે (Processing HD graphics)...");
      }, 1500);

      const response = await fetch("/api/ai/scrape-url-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await response.json();

      if (!response.ok || !data.success || !data.event) {
        throw new Error(data.error || "Failed to extract event from website URL.");
      }

      const newEvent: EventItem = data.event;

      // Automatically save to local storage & publish
      addOrUpdateEvent(newEvent);
      setCreatedEvents([newEvent]);
      setActiveEventIndex(0);
      setIsLoading(false);
      onNotify(`🎉 "${newEvent.name}" વેબસાઈટ URL માંથી પિક્ચર અને પાસ સાથે કોપી થઈ ગઈ!`);

      if (onEventCreated) {
        onEventCreated(newEvent);
      }
    } catch (err: any) {
      console.error("AI URL Scrape Error:", err);
      setIsLoading(false);
      setError(err?.message || "વેબસાઈટ માંથી કોપી કરવામાં ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
  };

  // Handle text prompt generation (with single or MULTIPLE events from one prompt)
  const handleCreatePrompt = async (customPrompt?: string, customCount?: number) => {
    const textToSubmit = (customPrompt || prompt).trim();
    const countToGenerate = customCount || eventCount || 1;

    if (!textToSubmit) {
      setError("કૃપા કરીને ઇવેન્ટની વિગતો લખો અથવા નીચે આપેલ સેમ્પલ પસંદ કરો.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingStep(
      countToGenerate > 1
        ? `AI એકસાથે ${countToGenerate} ઇવેન્ટ્સ પ્લાન કરી રહ્યું છે (Architecting ${countToGenerate} events simultaneously)...`
        : "AI તમારી વિગતો સમજી રહ્યું છે (Analyzing details)..."
    );

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep("સુરતના વિવિધ વિસ્તારો (Sarsana, Vesu, Adajan) અને આર્ટિસ્ટ મેપ થઈ રહ્યા છે...");
      }, 900);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep("દરેક ઇવેન્ટ માટે HD પોસ્ટર ગ્રાફિક્સ અને ટિકિટિંગ પ્લાન બની રહ્યા છે...");
      }, 1900);

      const response = await fetch("/api/ai/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToSubmit, count: countToGenerate }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create event with AI.");
      }

      const newEvents: EventItem[] =
        Array.isArray(data.events) && data.events.length > 0
          ? data.events
          : data.event
          ? [data.event]
          : [];

      if (newEvents.length === 0) {
        throw new Error("No events returned by AI.");
      }

      // Add all generated events directly to storage so they are immediately live
      addMultipleEvents(newEvents);
      setCreatedEvents(newEvents);
      setActiveEventIndex(0);
      setIsLoading(false);

      if (newEvents.length > 1) {
        onNotify(`🎉 વાહ! એક જ પ્રોમ્પ્ટથી ${newEvents.length} ઇવેન્ટ્સ તાત્કાલિક બની ગઈ અને લાઈવ થઈ ગઈ!`);
      } else {
        onNotify(`🎉 "${newEvents[0].name}" ઇવેન્ટ AI દ્વારા તાત્કાલિક બની ગઈ અને લાઈવ થઈ ગઈ!`);
      }

      if (onEventCreated && newEvents[0]) {
        onEventCreated(newEvents[0]);
      }
    } catch (err: any) {
      console.error("AI Event Creation Error:", err);
      setIsLoading(false);
      setError(err?.message || "ઇવેન્ટ બનાવવામાં ભૂલ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
  };

  // Delete a pass plan directly from the currently active preview event
  const handleDeletePlan = (passId: string) => {
    const current = createdEvents[activeEventIndex];
    if (!current) return;
    if ((current.passes || []).length <= 1) {
      onNotify("At least one pass plan must be kept.");
      return;
    }
    const updatedPasses = (current.passes || []).filter((p) => p.id !== passId);
    const updatedEvent = {
      ...current,
      passes: updatedPasses,
      startingPrice: Math.min(...updatedPasses.map((p) => p.price)),
    };

    addOrUpdateEvent(updatedEvent);
    const newBatch = [...createdEvents];
    newBatch[activeEventIndex] = updatedEvent;
    setCreatedEvents(newBatch);
    onNotify(`Pass plan deleted from "${updatedEvent.name}".`);
  };

  // Delete a specific event from the generated batch
  const handleDeleteEventFromBatch = (eventId: string, eventName: string) => {
    deleteEvent(eventId);
    const remaining = createdEvents.filter((e) => e.id !== eventId);
    setCreatedEvents(remaining);
    setActiveEventIndex(0);
    onNotify(`Event "${eventName}" deleted from catalog.`);
  };

  const currentEvent = createdEvents[activeEventIndex] || createdEvents[0] || null;

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900/60 border border-amber-500/40 p-6 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>AI Multi-Event Generator & URL Copier • Gemini 3.8 Flash</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
              એક જ પ્રોમ્પ્ટ થી એક થી વધારે Events બનાવો
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              માત્ર એક પ્રોમ્પ્ટ લખો — AI આપમેળે ૧, ૨, ૩ કે ૫ અલગ-અલગ વિસ્તારો (Sarsana, Vesu, Adajan, Dumas) ની પૂરી વિગત, પોસ્ટર્સ, આર્ટિસ્ટ અને પાસના ભાવો સાથે ઇવેન્ટ્સ બનાવી દેશે!
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-amber-300 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-amber-500/30 backdrop-blur-md self-start md:self-auto shadow-md">
            <ListPlus className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Batch Multiple Events Generation</span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mt-6 flex border-b border-slate-800 gap-3">
          <button
            onClick={() => {
              setMode("prompt");
              setError(null);
            }}
            className={`py-2 px-4 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              mode === "prompt"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>✍️ AI Text Prompt (એકસાથે ઘણી ઇવેન્ટ્સ બનાવો)</span>
          </button>

          <button
            onClick={() => {
              setMode("url");
              setError(null);
            }}
            className={`py-2 px-4 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
              mode === "url"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>🌐 Website URL Copy (વેબસાઈટ માંથી કોપી)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: TEXT PROMPT GENERATOR (MULTI-EVENT CAPABLE) */}
      {mode === "prompt" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl"
        >
          {/* Target Event Count Selector */}
          <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                કેટલી ઇવેન્ટ્સ બનાવવી છે? (Events to generate at once):
              </span>
              <span className="text-[11px] text-slate-400">
                એક જ ક્લિકમાં બધી ઇવેન્ટ્સ લાઈવ થઈ જશે.
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[1, 2, 3, 4, 5].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setEventCount(cnt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    eventCount === cnt
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {cnt} {cnt === 1 ? "Event" : "Events"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>ઇવેન્ટની વિગતો અહીં લખો (Event Details)</span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">
                ગુજરાતી / English / Gujlish બધું ચાલે
              </span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              rows={4}
              placeholder={`દા.ત. "સુરતના 3 મોટા ગરબા: 1. ફાલ્ગુની પાઠક (સરસાણા એસી ડોમ), 2. કિંજલ દવે (વેસુ લક્ષ્મી ગ્રાઉન્ડ), 3. કીર્તિદાન ગઢવી (અડાજણ રિવરફ્રન્ટ). સિંગલ ₹499, કપલ ₹899, સીઝન ₹3499, વીઆઈપી ₹6999"`}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
            />
          </div>

          {/* Quick sample chips */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>એક ક્લિકમાં ટેસ્ટ કરવા માટે સેમ્પલ પસંદ કરો (Quick Samples):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(sample.prompt);
                    setEventCount(sample.count);
                    handleCreatePrompt(sample.prompt, sample.count);
                  }}
                  disabled={isLoading}
                  className="p-3 rounded-xl text-left bg-slate-950 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-xs text-white group-hover:text-amber-400">{sample.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{sample.prompt}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 shrink-0 font-mono font-bold">
                    {sample.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              {isLoading ? (
                <span className="flex items-center gap-2 text-amber-300 animate-pulse font-medium">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{loadingStep}</span>
                </span>
              ) : (
                <span>
                  એક જ પ્રોમ્પ્ટથી <strong>{eventCount}</strong> ઇવેન્ટ્સ બનશે અને વેબસાઈટ પર તરત જ લાઈવ થઈ જશે.
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleCreatePrompt()}
              disabled={isLoading || !prompt.trim()}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-display"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>ઇવેન્ટ્સ બની રહી છે...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {eventCount > 1
                      ? `Generate All ${eventCount} Events Instantly`
                      : "Create Event Instantly"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* MODE 2: WEBSITE URL SCRAPER */}
      {mode === "url" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl"
        >
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Link2 className="w-4 h-4" />
                ઇવેન્ટ વેબસાઈટ URL પેસ્ટ કરો (Paste Any Website URL)
              </span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">
                FastTicket, BookMyShow, Insider, Organizers, etc.
              </span>
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isLoading}
                  placeholder="https://www.fastticket.live/surat/kesariya-navratri-4-0"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>

              <button
                type="button"
                onClick={() => handleScrapeUrl()}
                disabled={isLoading || !websiteUrl.trim()}
                className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 font-display"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Copying...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Copy & Import</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick test URL chips */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ટેસ્ટ કરવા માટે કોઈપણ લાઈવ સુરત URL ક્લિક કરો (Live Test URLs):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_URLS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setWebsiteUrl(sample.url);
                    handleScrapeUrl(sample.url);
                  }}
                  disabled={isLoading}
                  className="p-3 rounded-xl text-left bg-slate-950/80 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-xs text-white group-hover:text-amber-400">{sample.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{sample.url}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 shrink-0">
                    Test
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️ {error}</span>
            </div>
          )}

          {isLoading && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5 animate-pulse">
              <RotateCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span className="font-semibold">{loadingStep}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* MULTI-EVENT SUCCESS RESULT SHOWCASE WITH TABS & PREVIEW CONTROLS */}
      {createdEvents.length > 0 && currentEvent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl"
        >
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2 flex-wrap">
                  <span>
                    {createdEvents.length > 1
                      ? `🎉 એક જ પ્રોમ્પ્ટથી ${createdEvents.length} ઇવેન્ટ્સ લાઈવ થઈ ગઈ!`
                      : "ઇવેન્ટ પિક્ચર અને ગ્રાફિક્સ સાથે લાઈવ થઈ ગઈ!"}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {createdEvents.length} ACTIVE ON SITE
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  બધી ઇવેન્ટ્સ સુરત Navratri લિસ્ટિંગમાં તાત્કાલિક દર્શકો માટે ઉપલબ્ધ છે.
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCreatedEvents([]);
                  setPrompt("");
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create More</span>
              </button>
            </div>
          </div>

          {/* Multiple Events Tab Bar (if more than 1 event generated) */}
          {createdEvents.length > 1 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                જનરેટ થયેલી ઇવેન્ટ્સ જુઓ અને કસ્ટમાઇઝ કરો (Switch Event):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {createdEvents.map((ev, idx) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setActiveEventIndex(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
                      activeEventIndex === idx
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold font-mono">
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[160px]">{ev.name}</span>
                    <span className="text-[10px] opacity-80">({ev.area})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Event Preview Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Cover Image & Graphics */}
            <div className="relative rounded-2xl overflow-hidden aspect-[16/11] md:aspect-auto border border-slate-800 shadow-xl group">
              <img
                src={currentEvent.coverImage}
                alt={currentEvent.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-md">
                  {currentEvent.eventType}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-[11px] text-amber-300 font-medium block">Lead Performer</span>
                <div className="text-base font-bold text-white line-clamp-1">
                  {currentEvent.artist}
                </div>
              </div>
            </div>

            {/* Middle: Details */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xl font-black text-white font-display">
                    {currentEvent.name}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {currentEvent.about}
                  </p>
                </div>

                {/* Delete this event from batch button */}
                <button
                  type="button"
                  onClick={() => handleDeleteEventFromBatch(currentEvent.id, currentEvent.name)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shrink-0"
                  title="Delete this event from catalog"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Event</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400">Venue: </span>
                    <strong className="text-white">{currentEvent.venue}</strong> ({currentEvent.area})
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-400">Dates: </span>
                    <strong className="text-white">{currentEvent.dates}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-400">Timing: </span>
                    <strong className="text-white">{currentEvent.time}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-slate-400">Organizer: </span>
                    <strong className="text-white">{currentEvent.organizer}</strong>
                  </div>
                </div>
              </div>

              {/* Pass Prices with Instant Delete Option */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>ઇવેન્ટના પાસ પ્લાન (Pass Plans - Click trash to remove)</span>
                  <span className="text-amber-400 font-mono text-[10px]">
                    Starting: ₹{currentEvent.startingPrice}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {currentEvent.passes?.map((pass) => (
                    <div
                      key={pass.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center relative group hover:border-amber-500/40 transition"
                    >
                      {/* Delete plan button */}
                      {(currentEvent.passes || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(pass.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          title="Delete this pass plan"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      <div className="text-[11px] text-slate-300 font-medium line-clamp-1">{pass.name}</div>
                      <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                        ₹{pass.price}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {pass.season ? "All Nights" : "1 Night"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlights */}
              {currentEvent.highlights && currentEvent.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentEvent.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl text-[10px] bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>{h}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
