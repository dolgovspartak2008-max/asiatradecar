"use client";

import { useState } from "react";

export function ReviewText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = text.length > 260;
  return <div className="review-copy">
    <p className={expandable && !expanded ? "is-collapsed" : ""}>{text}</p>
    {expandable && <button className="review-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Свернуть" : "Читать полностью"}</button>}
  </div>;
}
