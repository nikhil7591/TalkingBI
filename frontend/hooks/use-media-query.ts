"use client";

import * as React from "react";

export function useMediaQuery(query: string): boolean {
  const getMatches = () => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = React.useState<boolean>(getMatches);

  function handleChange() {
    setMatches(getMatches());
  }

  React.useEffect(() => {
    const matchMedia = window.matchMedia(query);
    handleChange();

    matchMedia.addEventListener("change", handleChange);
    return () => matchMedia.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}
