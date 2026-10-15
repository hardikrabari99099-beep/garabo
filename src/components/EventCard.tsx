import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  Clock,
  MapPin,
  Mic,
  Tag,
  Copy,
  Check,
  Share2,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Ticket
} from "lucide-react";
import type { EventItem } from "../lib/types";

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
  onNotify: (msg: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect, onNotify }) => {
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const minPrice = event.passes?.length ? Math.min(...event.passes.map(p => p.price)) : 499;

  const isFeatured = Boolean(
    event.isFeatured ||
    event.tag?.toLowerCase().includes("featured") ||
    event.isTrending ||
    event.tag?.toLowerCase().includes("exclusive") ||
    event.tag?.toLowerCase().includes("vip")
  );

  const handleCopy = async (e: React.MouseEvent, type: "whatsapp" | "text" | "link") => {
    e.stopPropagation();
    let textToCopy = "";
    let label = "";

    const passLines = event.passes?.map(p => `  • ${p.name}: ₹${p.price.toLocaleString("en-IN")} (${p.desc})`).join("\n") || `  • Passes starting at ₹${minPrice}`;

    if (type === "whatsapp") {
      textToCopy = `🔥 *${event.name.toUpperCase()}* 🔥
📍 *Venue:* ${event.venue}, ${event.area}, Surat
📅 *Dates:* ${event.dates} | ⏰ *Time:* ${event.time}
🎤 *Lead Artist:* ${event.artist}
✨ *Event Type:* ${event.eventType}
🏷️ *Organized by:* ${event.organizer}

🎟️ *TICKET & PASS TIERS:*
${passLines}

🌟 *Highlights:*
${event.highlights?.slice(0, 3).map(h => `  ✓ ${h}`).join("\n") || "  ✓ Authentic Navratri Garba"}

👗 *Dress Code:* ${event.dressCode || "Traditional Gujarati Attire mandatory"}
🔗 *Book Digital Passes on AapnoPass:* ${typeof window !== "undefined" ? window.location.origin : ""}/#event-${event.id}

_Book passes online on AapnoPass before sold out!_ 💃🕺`;
      label = "WhatsApp formatted event message";
    } else if (type === "text") {
      textToCopy = `EVENT DETAILS:
Title: ${event.name}
Dates: ${event.dates}
Timings: ${event.time}
Venue: ${event.venue}
Area: ${event.area}, Surat
Address: ${event.address}
Lead Artist: ${event.artist}
Starting Price: ₹${minPrice}
Booking Link: ${typeof window !== "undefined" ? window.location.origin : ""}/#event-${event.id}`;
      label = "Plain text details";
    } else if (type === "link") {
      textToCopy = `${typeof window !== "undefined" ? window.location.origin : ""}/#event-${event.id}`;
      label = "AapnoPass booking link";
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedType(type);
      onNotify(`${label} copied to clipboard!`);
      setTimeout(() => {
        setCopiedType(null);
        setShowCopyMenu(false);
      }, 2000);
    } catch {
      onNotify("Unable to copy to clipboard.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      whileHover={{ y: -5, transition: { duration: 0.22 } }}
      onClick={() => onSelect(event)}
      className="bg-white/95 backdrop-blur-md border border-neutral-200/90 rounded-3xl overflow-hidden hover:border-amber-400/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_45px_-12px_rgba(245,158,11,0.2)] transition-all duration-300 flex flex-col justify-between group cursor-pointer relative"
    >
      {/* Subtle Luxury Glass Inner Ring Highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5 group-hover:ring-amber-400/30 transition-all z-20" />

      {/* Poster Image & Badges */}
      <div className="relative aspect-[16/10] overflow-hidden bg-neutral-950">
        
        {/* High-Resolution Luxury Fallback / Placeholder */}
        {(!imgLoaded || imgError) && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center select-none bg-radial from-[#1e3a2f] via-[#0c2018] to-[#040d0a] text-white">
            {/* Geometric luxury mandala / dandiya SVG pattern */}
            <svg
              className="w-24 h-24 text-amber-400/30 mb-2 animate-pulse"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <circle cx="50" cy="50" r="44" strokeDasharray="3 3" opacity="0.6" />
              <circle cx="50" cy="50" r="32" opacity="0.4" />
              <circle cx="50" cy="50" r="18" strokeWidth="2" />
              <path d="M50 6 L50 94 M6 50 L94 50 M19 19 L81 81 M19 81 L81 19" opacity="0.3" />
              <circle cx="50" cy="50" r="6" fill="currentColor" fillOpacity="0.4" />
            </svg>
            <div className="font-display font-black text-amber-200 text-sm tracking-wide line-clamp-1 max-w-[85%]">
              {event.name}
            </div>
            <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-widest mt-1">
              AapnoPass Luxury Access • {event.area}
            </div>
          </div>
        )}

        {/* Primary Cover Image */}
        <img
          src={event.coverImage}
          alt={event.name}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-1 relative ${
            imgError ? "hidden" : "block"
          }`}
          loading="lazy"
        />

        {/* Cinematic Luxury Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30 z-2 pointer-events-none" />

        {/* Top Badges with Glass-morphism & Refined Featured Gradient */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
          {isFeatured ? (
            /* Refined Gradient for Featured Tag with Luxury Shimmer & Glow */
            <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-neutral-950 px-3 py-1 rounded-full shadow-[0_2px_14px_rgba(245,158,11,0.45)] border border-amber-200/80 flex items-center gap-1.5 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-neutral-950 fill-neutral-950" />
              <span>{event.tag || "Featured"}</span>
            </span>
          ) : (
            /* Subtle Dark Glassmorphism Tag */
            <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-950/75 backdrop-blur-md text-amber-300 border border-white/20 px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <Tag className="w-2.5 h-2.5 text-amber-400" />
              <span>{event.tag || "Surat Live"}</span>
            </span>
          )}

          {/* Frosted Glass Verified Pass Badge */}
          <span className="text-[10px] font-bold bg-white/90 backdrop-blur-md text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Verified Pass</span>
          </span>
        </div>

        {/* Bottom Area & Price Pill over image with Subtle Glassmorphism */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none z-10">
          <div className="bg-neutral-950/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-semibold text-neutral-100 flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span className="truncate max-w-[120px] sm:max-w-none">{event.area}, Surat</span>
          </div>

          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-neutral-950 px-3.5 py-1 rounded-full font-black text-xs shadow-md border border-amber-300/40 flex items-center gap-1">
            <span>₹{minPrice.toLocaleString("en-IN")}</span>
            <span className="text-[9px] font-bold opacity-80 uppercase tracking-tight">onwards</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-white">
        <div>
          {/* Artist & Event Type */}
          <div className="flex items-center gap-2 text-xs text-amber-800 font-bold mb-1">
            <Mic className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="truncate">{event.artist}</span>
          </div>

          {/* Title */}
          <h3 className="font-display font-black text-lg text-neutral-900 group-hover:text-amber-600 transition leading-snug line-clamp-1">
            {event.name}
          </h3>

          {/* Venue & Time info */}
          <div className="mt-2.5 space-y-1.5 text-xs text-neutral-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate text-neutral-700 font-medium">{event.venue}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-neutral-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{event.dates}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{event.time}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pass tiers chips with subtle glass-effect borders */}
        <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-neutral-100">
          {event.passes?.slice(0, 3).map((p) => (
            <span
              key={p.id}
              className="text-[10px] bg-neutral-100/70 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-neutral-200/80 text-neutral-700 font-medium group-hover:border-amber-200 transition"
            >
              {p.name.replace(/Pass/i, "")}: <strong className="text-neutral-900 font-bold">₹{p.price.toLocaleString("en-IN")}</strong>
            </span>
          ))}
          {(event.passes?.length || 0) > 3 && (
            <span className="text-[10px] text-neutral-400 self-center font-medium">
              +{event.passes!.length - 3} more
            </span>
          )}
        </div>

        {/* Action Buttons: Book & Share */}
        <div className="pt-2 flex items-center gap-2">
          
          {/* Book Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.12)] group-hover:shadow-[0_4px_16px_rgba(245,158,11,0.25)] transition-all cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5 text-amber-400" />
            <span>Book Tickets</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Copy Details Menu Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCopyMenu(!showCopyMenu);
              }}
              className="p-2.5 rounded-xl bg-neutral-100/80 hover:bg-neutral-200/80 text-neutral-600 hover:text-neutral-900 border border-neutral-200 transition cursor-pointer"
              title="Share event details on WhatsApp or copy link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu with Frosted Glassmorphism */}
            {showCopyMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-2 w-56 rounded-2xl bg-white/95 backdrop-blur-xl border border-neutral-200/90 shadow-2xl p-1.5 z-30 text-xs"
              >
                <div className="px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider text-neutral-400 border-b border-neutral-100">
                  Share Event
                </div>

                <button
                  onClick={(e) => handleCopy(e, "whatsapp")}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-neutral-50 text-neutral-800 flex items-center justify-between group transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-medium">WhatsApp Invite</span>
                  </span>
                  {copiedType === "whatsapp" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>

                <button
                  onClick={(e) => handleCopy(e, "text")}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-neutral-50 text-neutral-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-medium">Plain Text Details</span>
                  </span>
                  {copiedType === "text" && <Check className="w-3.5 h-3.5 text-amber-500" />}
                </button>

                <button
                  onClick={(e) => handleCopy(e, "link")}
                  className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-neutral-50 text-neutral-800 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium">Copy Pass Link</span>
                  </span>
                  {copiedType === "link" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
};

