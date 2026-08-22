type OptionGroup = { title: string; items: string[] };

function readGroups(details: Record<string, unknown>): OptionGroup[] {
  if (!Array.isArray(details.optionGroups)) return [];
  return details.optionGroups.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const group = value as { title?: unknown; items?: unknown };
    const title = typeof group.title === "string" ? group.title.trim() : "";
    const items = Array.isArray(group.items) ? group.items.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
    return title && items.length ? [{ title, items }] : [];
  });
}

export function CarOptions({ details }: { details: Record<string, unknown> }) {
  const groups = readGroups(details);
  if (!groups.length) return null;
  return <section className="car-options" aria-labelledby="options-title"><p className="eyebrow">Комплектация</p><h2 id="options-title">Опции автомобиля</h2><div>{groups.map((group) => <details key={group.title}><summary><span>{group.title}</span><b>{group.items.length}</b></summary><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></details>)}</div></section>;
}
