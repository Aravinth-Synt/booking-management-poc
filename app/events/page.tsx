"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import type { Event } from "../../types/events";
import RoomCard from "@/components/RoomCard";
import EventCard from "@/components/EventCard";

function SkeletonCard() {
  return (
    <div className="bg-white border">
      <div className="skeleton h-48 w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-5 w-2/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [category, setCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"ct" | "mock">("mock");

  async function fetchEvents() {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();

      setEvents(data.events ?? []);
      setSource(data.source ?? "mock");
    } catch {
      setEvents([]);
      setSource("mock");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  const categories = [
    "ALL",
    ...Array.from(new Set(events.map((e) => e.category).filter(Boolean))),
  ];

  const filteredEvents = events.filter((event) => {
    const eventCategory = event.category;

    if (category !== "ALL" && eventCategory !== category) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-ivory-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-2">
            Explore
          </p>

          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-gray-900 mb-1">
            Discover Events
          </h1>

          {!loading && (
            <p className="text-gray-400 text-sm">
              {events.length} event{events.length !== 1 ? "s" : ""} available
              {source === "mock" && (
                <span className="ml-2 text-xs bg-ivory-100 text-gray-400 border px-2 py-0.5 rounded-full">
                  demo data
                </span>
              )}
            </p>
          )}

          <div className="gold-divider w-16 mt-4" />
        </div>

        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 text-xs uppercase border transition ${
                category === cat
                  ? "bg-forest-500 text-white border-forest-500"
                  : "bg-white text-gray-500 border-ivory-200 hover:border-forest-300"
              }`}
            >
              {cat === "ALL" ? "All Events" : cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="font-display text-2xl mb-2">No events available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
