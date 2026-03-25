"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

type CardItem = {
  image: string;
  title: string;
  description: string;
};

const cardData: CardItem[] = [
  {
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=600&fit=crop&crop=center",
    title: "Sales Radar",
    description: "Track monthly growth, dips, and trend reversals in one glance.",
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop&crop=center",
    title: "Revenue Pulse",
    description: "Understand which segments are driving top-line momentum.",
  },
  {
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=600&fit=crop&crop=center",
    title: "Forecast Desk",
    description: "Get predictive context before making quarterly decisions.",
  },
  {
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop&crop=center",
    title: "KPI Storyline",
    description: "Turn raw tables into clean executive-ready narratives.",
  },
  {
    image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=600&fit=crop&crop=center",
    title: "Decision Layer",
    description: "Compare channels, regions, and cohorts with confidence.",
  },
  {
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=600&fit=crop&crop=center",
    title: "Insight Engine",
    description: "Ask plain-language KPI questions and get visual answers.",
  },
  {
    image: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=400&h=600&fit=crop&crop=center",
    title: "Performance Map",
    description: "Spot outliers and high-value clusters instantly.",
  },
  {
    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=600&fit=crop&crop=center",
    title: "BI Control",
    description: "Keep your metrics, voice summaries, and actions aligned.",
  },
];

type FlipCardProps = CardItem & {
  className?: string;
  style?: CSSProperties;
};

function FlipCard({ image, title, description, className, style }: FlipCardProps) {
  return (
    <div
      className={cn(
        "group h-24 w-20 rounded-xl [perspective:1000px] transition-transform duration-300 ease-in-out hover:scale-105 md:h-28 md:w-24",
        className
      )}
      style={style}
    >
      <div className="relative h-full w-full rounded-xl shadow-lg transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        <div className="absolute inset-0 rounded-xl [backface-visibility:hidden]">
          <img
            src={image}
            alt={title}
            className="h-full w-full rounded-xl border border-slate-600 object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = "https://placehold.co/400x600/0a0a0a/333333?text=Talking+BI";
            }}
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-2 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <h3 className="mb-1 text-[10px] font-bold text-slate-100 md:text-xs">{title}</h3>
          <p className="text-[9px] leading-snug text-slate-400 md:text-[10px]">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function CircularFlipCardGallery() {
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (galleryRef.current) {
        setSize(galleryRef.current.offsetWidth);
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (galleryRef.current) {
      resizeObserver.observe(galleryRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      setRotation((prev) => prev + 0.00006);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const radius = size * 0.38;
  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <div className="flex h-full min-h-[340px] w-full items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,0.18),rgba(15,23,42,0.98)_58%)] p-4">
      <div ref={galleryRef} className="relative aspect-square w-full max-w-[360px] md:max-w-[430px]">
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center">
          <h2 className="text-lg font-extrabold leading-tight text-white md:text-xl">Talking BI</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200">Data to Decisions</p>
        </div>

        {size > 0 &&
          cardData.map((card, index) => {
            const angle = (index / cardData.length) * 2 * Math.PI - Math.PI / 2 + rotation;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            return (
              <FlipCard
                key={card.title}
                {...card}
                className="absolute hover:z-20"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(-50%, -50%) rotate(${((angle + Math.PI / 2) * 180) / Math.PI}deg)`,
                }}
              />
            );
          })}
      </div>
    </div>
  );
}
