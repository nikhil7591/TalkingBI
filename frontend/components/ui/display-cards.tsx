"use client";

import React from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  titleClassName = "text-blue-500",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 bg-white/80 px-4 py-3 backdrop-blur-sm transition-all duration-700 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-white after:to-transparent after:content-[''] hover:border-white/20 hover:bg-white [&>*]:flex [&>*]:items-center [&>*]:gap-2",
        className
      )}
    >
      <div>
        <span className="relative inline-block rounded-full bg-blue-800 p-1">{icon}</span>
        <p className={cn("text-lg font-medium", titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-lg text-slate-800">{description}</p>
      <p className="text-slate-500">{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      title: "Revenue Pulse",
      description: "Live KPI shifts across regions",
      date: "Refreshed now",
      className:
        "[grid-area:stack] hover:-translate-y-10 before:absolute before:h-[100%] before:w-[100%] before:rounded-xl before:bg-white/50 before:outline before:outline-1 before:outline-slate-300 before:content-[''] before:left-0 before:top-0 before:transition-opacity before:duration-700 hover:before:opacity-0 grayscale-[100%] hover:grayscale-0",
    },
    {
      title: "Forecast Layer",
      description: "Anomaly and projection highlights",
      date: "2 mins ago",
      className:
        "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:h-[100%] before:w-[100%] before:rounded-xl before:bg-white/50 before:outline before:outline-1 before:outline-slate-300 before:content-[''] before:left-0 before:top-0 before:transition-opacity before:duration-700 hover:before:opacity-0 grayscale-[100%] hover:grayscale-0",
    },
    {
      title: "Dashboard Stories",
      description: "Decision-ready BI narrative cards",
      date: "Latest update",
      className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid animate-in place-items-center [grid-template-areas:'stack'] fade-in-0 duration-700">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}
