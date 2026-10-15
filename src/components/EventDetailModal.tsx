import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X,

  Calendar,
  Clock,
  MapPin,
  Mic,
  ShieldCheck,
  CheckCircle2,
  Ticket,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  QrCode,
  ArrowRight,
  Smartphone,
  Lock,
  Printer,
  ChevronRight,
  Mail
} from "lucide-react";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import type { EventItem, BookingRecord } from "../lib/types";
import { AVAILABLE_COUPONS, saveBooking } from "../lib/storage";
import {
  calculatePrice,
  confirmUpiPaymentOnServer,
  type PaymentCalculationResult
} from "../lib/razorpay";

interface EventDetailModalProps {
  event: EventItem | null;
  onClose: () => void;
  onViewPass: (bookingId: string) => void;
  onNotify: (msg: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onViewPass,
  onNotify,
}) => {
  if (!event) return null;
  return (
    <EventDetailModalContent
      event={event}
      onClose={onClose}
      onViewPass={onViewPass}
      onNotify={onNotify}
    />
  );
};

const EventDetailModalContent: React.FC<{
  event: EventItem;
  onClose: () => void;
  onViewPass: (bookingId: string) => void;
  onNotify: (msg: string) => void;
}> = ({ event, onClose, onViewPass, onNotify }) => {
  const UPI_ID = "aapnopaas@ptaxis";
  const PAYEE_NAME = "AapnoPass";

  const [selectedNight, setSelectedNight] = useState<string>(
    event.nights?.[0] || event.dates || "3 Oct 2026 (Night 1)"
  );
  const [selectedPassId, setSelectedPassId] = useState<string>(
    event.passes?.[0]?.id || "single"
  );
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // Pricing State
  const selectedPass =
    event.passes?.find((p) => p.id === selectedPassId) ||
    event.passes?.[0] || {
      id: "single",
      name: "General Pass",
      price: 499,
      desc: "Single admission",
      left: 100,
    };

  const [pricing, setPricing] = useState<PaymentCalculationResult>({
    unit_price: selectedPass.price,
    quantity: 1,
    subtotal: selectedPass.price,
    discount: 0,
    platform_fee: 15,
    gst_tax: 3,
    final_amount: selectedPass.price + 18,
    currency: "INR",
  });
  const [isCalculating, setIsCalculating] = useState(false);

  // Modal Flow
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  // Confirmed Booking Result
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [ticketQrUrl, setTicketQrUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [modalImgLoaded, setModalImgLoaded] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);

  const isFeatured = Boolean(
    event.isFeatured ||
    event.tag?.toLowerCase().includes("featured") ||
    event.isTrending ||
    event.tag?.toLowerCase().includes("exclusive") ||
    event.tag?.toLowerCase().includes("vip")
  );

  // Re-calculate price on server whenever pass, qty, or coupon changes
  useEffect(() => {
    let isMounted = true;
    setIsCalculating(true);

    calculatePrice(event.id, selectedPassId, qty, appliedCoupon, selectedPass.price)
      .then((res) => {
        if (isMounted) {
          setPricing(res);
          setIsCalculating(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsCalculating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [event.id, selectedPassId, qty, appliedCoupon, selectedPass.price]);

  // Construct Standard UPI Deep Link URI
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    PAYEE_NAME
  )}&am=${pricing.final_amount}&cu=INR&tn=${encodeURIComponent(
    `AapnoPass-${event.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15)}`
  )}`;

  // Generate QR Code for desktop payment when UPI modal opens
  useEffect(() => {
    if (showUpiModal) {
      QRCode.toDataURL(upiIntentUri, {
        width: 200,
        margin: 1,
        color: { dark: "#0c281e", light: "#ffffff" },
      })
        .then((url) => setUpiQrDataUrl(url))
        .catch((e) => console.error("UPI QR Gen error:", e));
    }
  }, [showUpiModal, upiIntentUri]);

  // Generate QR image on booking confirmation
  useEffect(() => {
    if (confirmedBooking) {
      QRCode.toDataURL(confirmedBooking.qr_code_data, {
        width: 220,
        margin: 1,
        color: { dark: "#0c281e", light: "#ffffff" },
      })
        .then((url) => setTicketQrUrl(url))
        .catch((e) => console.error("Ticket QR Gen error:", e));
    }
  }, [confirmedBooking]);

  const handleApplyCoupon = (codeToApply?: string) => {
    const target = (codeToApply || couponCode).trim().toUpperCase();
    const found = AVAILABLE_COUPONS.find((c) => c.code === target);
    if (!found) {
      onNotify("Invalid coupon. Try SURAT15 or NAVRATRI100");
      return;
    }
    setAppliedCoupon(target);
    setCouponCode(target);
    onNotify(`Coupon ${target} applied!`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    onNotify("Coupon removed");
  };

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    onNotify(`UPI ID ${UPI_ID} copied!`);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Trigger Native UPI Chooser on mobile
  const handlePayWithUpiApp = () => {
    window.location.href = upiIntentUri;
  };

  // Proceed from booking form to UPI Payment Screen
  const handleOpenUpiPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onNotify("Please enter pass holder's name");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      onNotify("Please enter a valid 10-digit mobile number");
      return;
    }

    setShowUpiModal(true);
  };

  // Confirm UPI payment and issue pass
  const handleConfirmUpiPayment = async () => {
    try {
      setIsConfirmingPayment(true);

      const generatedUtr = utrNumber.trim() || `UPI${Date.now().toString().slice(-8)}`;

      const res = await confirmUpiPaymentOnServer({
        utr: generatedUtr,
        method: "upi_app",
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || `${phone.trim()}@guest.aapnopass.com`,
        event_id: event.id,
        event_name: event.name,
        pass_id: selectedPass.id,
        pass_name: selectedPass.name,
        night: selectedNight,
        qty,
        final_amount: pricing.final_amount,
      });

      setIsConfirmingPayment(false);
      setShowUpiModal(false);

      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);

        saveBooking({
          ...res.booking,
          id: res.booking.booking_id,
          name: res.booking.customer_name,
          phone: res.booking.customer_phone,
          email: res.booking.customer_email,
        } as any);

        try {
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
            colors: ["#f59e0b", "#10b981", "#fbbf24", "#ffffff"],
          });
        } catch {}

        onNotify(`Pass confirmed! Gate pass issued for ${name.trim()}.`);
      }
    } catch (err: any) {
      setIsConfirmingPayment(false);
      onNotify(err.message || "Could not confirm UPI payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-4xl bg-white/95 backdrop-blur-2xl border border-neutral-200/80 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_40px_rgba(245,158,11,0.08)] overflow-hidden my-6 max-h-[92vh] flex flex-col"
      >
        
        {/* Top Header with Glass-morphism */}
        <div className="p-4 sm:px-6 sm:py-3.5 bg-neutral-50/80 backdrop-blur-xl border-b border-neutral-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100/90 text-amber-950 border border-amber-300/80 px-2.5 py-0.5 rounded-full shadow-2xs">
              {event.eventType}
            </span>
            <span className="text-xs text-neutral-600 truncate font-semibold">
              {event.area}, Surat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/#event-${event.id}`);
                setCopiedLink(true);
                onNotify("Pass link copied!");
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 cursor-pointer shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#f59e0b]" />}
              <span>{copiedLink ? "Copied" : "Share"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* SCREEN 1: SUCCESS CONFIRMED PASS */}
          {confirmedBooking ? (
            <div className="py-6 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Payment Verified • Gate Pass Issued
                </span>
                <h3 className="font-display font-black text-2xl text-neutral-900 mt-2">
                  Pass Confirmed!
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Show this QR code at the venue turnstile for wristband entry.
                </p>
              </div>

              {/* Digital Pass Card with Royal Luxury Detailing */}
              <div className="relative bg-neutral-950 text-white border border-amber-500/40 rounded-3xl p-6 text-left space-y-4 shadow-[0_0_35px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/20">
                <div className="flex items-start justify-between border-b border-dashed border-neutral-800 pb-3">
                  <div>
                    <span className="font-display font-black text-base text-amber-300 block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>AapnoPass Royal Gate Pass</span>
                    </span>
                    <span className="text-[11px] text-amber-200/90 font-bold">
                      {confirmedBooking.event_name}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                    VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-7 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Pass Holder</span>
                      <span className="font-bold text-white text-sm">{confirmedBooking.customer_name}</span>
                      <span className="text-[11px] text-neutral-400 block">{confirmedBooking.customer_phone}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Tier</span>
                        <span className="text-[#f59e0b] font-bold">{confirmedBooking.pass_name}</span>
                        <span className="text-[10px] text-neutral-400 block">({confirmedBooking.qty}x)</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-neutral-400 font-semibold block">Schedule</span>
                        <span className="text-white">{confirmedBooking.night}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 flex justify-between font-bold">
                      <span className="text-neutral-400">Total Paid:</span>
                      <span className="text-emerald-400 font-mono text-sm">
                        ₹{confirmedBooking.total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* QR Image */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-neutral-900 rounded-2xl border border-neutral-800 text-center">
                    {ticketQrUrl ? (
                      <div className="bg-white p-1.5 rounded-xl shadow">
                        <img src={ticketQrUrl} alt="Gate QR" className="w-24 h-24 mx-auto" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-neutral-800 animate-pulse rounded-xl" />
                    )}
                    <span className="text-[9px] font-mono font-bold text-[#f59e0b] uppercase mt-1">
                      GATE QR PASS
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onViewPass(confirmedBooking.booking_id);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>View in My Passes</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="py-3 px-4 rounded-xl text-xs font-semibold bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4 text-neutral-500" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          ) : (
            /* SCREEN 2: EVENT DETAILS & PASS SELECTION */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Event Overview */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Poster Image with Glassmorphism Overlay & High-Res Fallback */}
                <div className="relative rounded-3xl overflow-hidden aspect-[16/9] bg-neutral-950 border border-neutral-200/90 shadow-inner group">
                  {/* High-Resolution Luxury Fallback / Placeholder */}
                  {(!modalImgLoaded || modalImgError) && (
                    <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center select-none bg-radial from-[#1e3a2f] via-[#0c2018] to-[#040d0a] text-white">
                      <svg
                        className="w-24 h-24 text-amber-400/35 mb-2 animate-pulse"
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
                      <div className="font-display font-black text-amber-200 text-base tracking-wide line-clamp-1 max-w-[85%]">
                        {event.name}
                      </div>
                      <div className="text-[10px] text-amber-300/80 font-bold uppercase tracking-widest mt-1">
                        AapnoPass Royal Access • {event.area}, Surat
                      </div>
                    </div>
                  )}

                  <img
                    src={event.coverImage}
                    alt={event.name}
                    onLoad={() => setModalImgLoaded(true)}
                    onError={() => setModalImgError(true)}
                    className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-102 z-1 relative ${
                      modalImgError ? "hidden" : "block"
                    }`}
                  />
                  
                  {/* Cinematic Luxury Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30 z-2 pointer-events-none" />

                  {/* Top Badges: Featured / Event Tag */}
                  <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                    {isFeatured ? (
                      /* Refined Gradient for Featured Tag */
                      <span className="text-[10px] font-black text-neutral-950 uppercase tracking-widest bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-3.5 py-1 rounded-full border border-amber-200/80 shadow-[0_2px_14px_rgba(245,158,11,0.45)] flex items-center gap-1.5 backdrop-blur-sm">
                        <Sparkles className="w-3.5 h-3.5 text-neutral-950 fill-neutral-950" />
                        <span>{event.tag || "Featured"}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest bg-neutral-950/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1">
                        <span>{event.tag || "Surat Live"}</span>
                      </span>
                    )}

                    <span className="text-[10px] font-bold bg-white/90 backdrop-blur-md text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified Venue</span>
                    </span>
                  </div>

                  {/* Floating Glassmorphism Hero Card on Image Bottom */}
                  <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-4 bg-neutral-950/80 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-4 shadow-xl z-10 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div>
                        <h2 className="font-display font-black text-lg sm:text-xl text-white tracking-tight leading-snug">
                          {event.name}
                        </h2>
                        <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5 mt-0.5">
                          <Mic className="w-3.5 h-3.5 text-amber-400" />
                          <span>{event.artist}</span>
                          <span className="text-white/40">·</span>
                          <span className="text-white/80 font-normal">{event.eventType}</span>
                        </div>
                      </div>
                      <div className="mt-1 sm:mt-0 text-left sm:text-right">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider">Organized by</span>
                        <span className="text-xs font-semibold text-neutral-200 truncate max-w-[180px] block">{event.organizer}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info row with Glassmorphic surface */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-200/85 hover:border-amber-300/60 shadow-2xs transition-all">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Dates</span>
                    <span className="text-neutral-900 font-bold flex items-center gap-1.5 mt-1 truncate">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{event.dates}</span>
                    </span>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-200/85 hover:border-amber-300/60 shadow-2xs transition-all">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Time</span>
                    <span className="text-neutral-900 font-bold flex items-center gap-1.5 mt-1 truncate">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{event.time}</span>
                    </span>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-neutral-200/85 hover:border-amber-300/60 shadow-2xs transition-all">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Venue</span>
                    <span className="text-neutral-900 font-bold flex items-center gap-1.5 mt-1 truncate" title={event.venue}>
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </span>
                  </div>
                </div>

                {/* Pass Tiers List with Luxury Styling */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-amber-500" />
                      <span>Select Pass Tier:</span>
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-500">
                      Instant gate pass via SMS & PDF
                    </span>
                  </div>
                  <div className="space-y-2">
                    {event.passes?.map((p) => {
                      const isSelected = selectedPassId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPassId(p.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-gradient-to-r from-amber-500/12 via-amber-400/5 to-transparent border-amber-500/90 ring-1 ring-amber-400/40 shadow-[0_4px_16px_rgba(245,158,11,0.12)] text-neutral-900"
                              : "bg-white/80 backdrop-blur-sm border-neutral-200/90 text-neutral-700 hover:border-amber-300/60 hover:bg-white shadow-2xs"
                          }`}
                        >
                          <div>
                            <div className="font-black flex items-center gap-2 text-xs text-neutral-900">
                              <span>{p.name}</span>
                              {p.vip && (
                                <span className="text-[9px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-neutral-950 font-black px-2 py-0.5 rounded-full border border-amber-300/60 shadow-xs">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">{p.desc}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-neutral-950 text-base">
                              ₹{p.price.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Checkout Form with Glassmorphism */}
              <div className="lg:col-span-5 bg-neutral-50/85 backdrop-blur-xl border border-neutral-200/80 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3">
                    <h3 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-amber-500" />
                      <span>Book Passes</span>
                    </h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-800 border border-emerald-300/60 px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                      Direct UPI
                    </span>
                  </div>

                  <form onSubmit={handleOpenUpiPayment} className="space-y-3.5 text-xs">
                    
                    {/* Schedule */}
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Night / Schedule:
                      </label>
                      <select
                        value={selectedNight}
                        onChange={(e) => setSelectedNight(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#f59e0b] cursor-pointer"
                      >
                        <option value="All 9 Nights Season">All 9 Nights Season Pass (3 – 11 Oct)</option>
                        {event.nights?.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-neutral-200">
                      <div>
                        <span className="font-semibold text-neutral-800 block text-xs">
                          {selectedPass.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          ₹{selectedPass.price} per person
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold font-mono text-sm text-neutral-900 w-4 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(Math.min(10, qty + 1))}
                          className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Attendee Details */}
                    <div className="space-y-2 pt-1 border-t border-neutral-200">
                      <label className="block text-[11px] font-bold text-neutral-600">
                        Pass Holder Details:
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name (for gate pass)"
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#f59e0b]"
                      />
                      <div className="flex gap-2">
                        <div className="bg-neutral-100 border border-neutral-200 px-2.5 py-2 rounded-xl text-neutral-600 text-xs font-semibold shrink-0">
                          +91
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="10-digit WhatsApp / mobile number"
                          className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>

                      {/* Email Address Field */}
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                          Email Address (for PDF Pass Receipt):
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. yourname@gmail.com (Optional)"
                          className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#f59e0b]"
                        />
                      </div>

                      {/* Explicit English Notice: Pass PDF will be sent to this number */}
                      <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-xs text-neutral-900 space-y-1 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <Smartphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Digital Pass Delivery Notice</span>
                        </div>
                        <p className="text-[11px] text-neutral-800 leading-relaxed">
                          Your pass PDF will be sent to this number:{" "}
                          <strong className="text-amber-800 font-mono">
                            {phone ? `+91 ${phone}` : "+91 [Your Mobile Number]"}
                          </strong>{" "}
                          via WhatsApp/SMS right after payment confirmation.
                        </p>
                        {email && (
                          <p className="text-[10px] text-neutral-600">
                            A copy with invoice will also be delivered to: <strong>{email}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Coupon */}
                    <div className="pt-1 border-t border-neutral-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-600">
                          Coupon Code:
                        </label>

                        {appliedCoupon && (
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-[10px] text-rose-600 font-semibold hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="e.g. SURAT15"
                          className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-900 uppercase placeholder-neutral-400 focus:outline-none focus:border-[#f59e0b]"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-neutral-500">
                        <span>Subtotal ({pricing.quantity}x):</span>
                        <span className="font-mono text-neutral-900">₹{pricing.subtotal.toLocaleString("en-IN")}</span>
                      </div>

                      {pricing.discount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Discount:</span>
                          <span className="font-mono">-₹{pricing.discount.toLocaleString("en-IN")}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-neutral-900 font-bold text-sm pt-2 border-t border-neutral-100">
                        <span>Payable Amount:</span>
                        <span className="text-neutral-950 font-mono text-base font-black">
                          {isCalculating ? "..." : `₹${pricing.final_amount.toLocaleString("en-IN")}`}
                        </span>
                      </div>
                    </div>

                    {/* Pay CTA with Luxury Gold Gradient */}
                    <button
                      type="submit"
                      disabled={isCalculating}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-neutral-950" />
                      <span>Proceed to Pay ₹{pricing.final_amount.toLocaleString("en-IN")}</span>
                      <ArrowRight className="w-4 h-4 text-neutral-950" />
                    </button>

                    {/* Email Option & Pass Delivery Notice Directly Below Payment Button */}
                    <div className="pt-2 space-y-2">
                      {/* Optional Email Add Input */}
                      <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-amber-600" />
                            <span>Add Email for PDF Copy (Optional)</span>
                          </span>
                          {email && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Added
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email to receive PDF copy (e.g. name@gmail.com)"
                          className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-amber-400 font-normal"
                        />
                      </div>

                      {/* Explicit English Notice below payment */}
                      <div className="p-3 bg-amber-50/95 border-2 border-amber-300/90 rounded-xl text-neutral-900 space-y-1 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                          <Smartphone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Delivery Confirmation in English:</span>
                        </div>
                        <p className="text-xs text-neutral-900 font-medium leading-relaxed">
                          Pass PDF will be sent to this number:{" "}
                          <strong className="text-amber-900 font-mono font-black underline decoration-amber-400">
                            {phone ? `+91 ${phone}` : "+91 [Your Mobile Number]"}
                          </strong>
                        </p>
                        {email ? (
                          <p className="text-[11px] text-neutral-700">
                            A digital PDF copy and tax invoice will also be sent to: <strong className="text-neutral-900">{email}</strong>
                          </p>
                        ) : (
                          <p className="text-[10px] text-neutral-500">
                            (Enter email above if you also wish to receive a copy on your inbox.)
                          </p>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          )}

        </div>

      </motion.div>

      {/* ======================================================== */}
      {/* REQUESTED UPI PAYMENT SCREEN (aapnopaas@ptaxis) */}
      {/* ======================================================== */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white border border-neutral-200 rounded-3xl p-6 space-y-5 shadow-2xl"
          >
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Instant UPI Payment
                </span>

                <h3 className="font-display font-black text-xl text-neutral-900 mt-1">
                  Pay via UPI
                </h3>
              </div>
              <button
                onClick={() => setShowUpiModal(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Highlight */}
            <div className="bg-neutral-900 text-white p-4 rounded-2xl text-center space-y-1">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-semibold">
                Amount to Pay
              </span>
              <div className="font-mono text-3xl font-black text-amber-400">
                ₹{pricing.final_amount.toLocaleString("en-IN")}
              </div>
              <span className="text-[10px] text-neutral-400 block">
                {name} • {selectedPass.name} ({qty}x)
              </span>
            </div>

            {/* UPI ID Box with One-Tap Copy */}
            <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-900/80 block">
                  Official Payee UPI ID:
                </span>
                <span className="font-mono font-black text-sm text-neutral-900 select-all">
                  {UPI_ID}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpiId}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-neutral-50 text-neutral-900 border border-amber-300 transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-600" />}
                <span>{copiedUpi ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* PRIMARY REQUESTED BUTTON: "Pay with your UPI App" */}
            <div className="space-y-2">
              <button
                onClick={handlePayWithUpiApp}
                className="w-full py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay with your UPI App</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-neutral-500 text-center">
                Clicking opens all installed UPI apps (GPay, PhonePe, Paytm, BHIM) with auto-filled amount of ₹{pricing.final_amount}.
              </p>
            </div>

            {/* Desktop Scan or App Shortcuts */}
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-100">
              {upiQrDataUrl && (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs">
                    <img src={upiQrDataUrl} alt="UPI QR" className="w-24 h-24" />
                  </div>
                  <span className="text-[10px] text-neutral-500 mt-1">Scan with any UPI App</span>
                </div>
              )}
            </div>

            {/* Confirm Payment Step */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-200">
              {/* Delivery notice */}
              <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-2.5 text-center text-xs text-neutral-900 shadow-2xs">
                <span className="font-bold text-amber-900">Pass PDF will be sent to this number: </span>
                <span className="font-mono font-black text-amber-800">+91 {phone}</span>
                {email && <div className="text-[10px] text-neutral-600 mt-0.5">and emailed to: <strong>{email}</strong></div>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  UPI Reference / UTR No. (after payment):
                </label>

                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 12-digit UTR or Transaction ID"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#f59e0b]"
                />
              </div>

              <button
                onClick={handleConfirmUpiPayment}
                disabled={isConfirmingPayment}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isConfirmingPayment ? "Verifying..." : "I Have Paid / Confirm Pass"}</span>
              </button>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
};
