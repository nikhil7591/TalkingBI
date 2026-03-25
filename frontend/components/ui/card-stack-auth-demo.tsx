"use client";

import { CardStack, CardStackItem } from "@/components/ui/card-stack";

const items: CardStackItem[] = [
  {
    id: 1,
    title: "Revenue Signal Room",
    description: "Track performance shifts with high-confidence KPI snapshots.",
    imageSrc: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80",
    href: "https://unsplash.com/photos/5fNmWej4tAA",
  },
  {
    id: 2,
    title: "Forecast Control",
    description: "Scenario planning with business-first dashboard narratives.",
    imageSrc: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
    href: "https://unsplash.com/photos/m_HRfLhgABo",
  },
  {
    id: 3,
    title: "Segment Intelligence",
    description: "Deep comparative insight across channels, regions, and products.",
    imageSrc: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80",
    href: "https://unsplash.com/photos/JKUTrJ4vK00",
  },
  {
    id: 4,
    title: "Narrative Dashboards",
    description: "From raw tables to executive-ready visual stories.",
    imageSrc: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?auto=format&fit=crop&w=1400&q=80",
    href: "https://unsplash.com/photos/DfMMzzi3rmg",
  },
  {
    id: 5,
    title: "Actionable Analytics",
    description: "Answer why, what next, and what to do in one place.",
    imageSrc: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
    href: "https://unsplash.com/photos/5QgIuuBxKwM",
  },
];

export default function CardStackAuthDemo() {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-5xl p-2">
        <CardStack
          items={items}
          initialIndex={0}
          autoAdvance
          intervalMs={2400}
          pauseOnHover
          showDots
          cardWidth={420}
          cardHeight={270}
          maxVisible={5}
        />
      </div>
    </div>
  );
}
