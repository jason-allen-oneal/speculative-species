"use client";
import React, { useState } from "react";

export default function Tooltip({id, text, children}: { id: string; text: string; children: React.ReactNode; }) {
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    const toggleTooltip = (id: string) => {
        setActiveTooltip((prev) => (prev === id ? null : id));
    };

    return (
        <div
      className="relative group"
      onClick={() => toggleTooltip(id)} // mobile toggle
      onMouseLeave={() => setActiveTooltip(null)}
    >
      {children}
      {/* Tooltip box */}
      <div
        className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 rounded-lg
            text-gray-100 text-xs px-2 py-1 shadow-lg transition-opacity duration-300
            z-50 ${
              activeTooltip === id
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none group-hover:opacity-100"
            }`}
        style={{
            backgroundColor: "rgba(0, 0, 0, 0.95)",   // true opaque black
            backdropFilter: "none",                    // disable inherited blur
            WebkitBackdropFilter: "none",              // Safari fix
        }}
      >
        {text}
      </div>
    </div>
    );
}