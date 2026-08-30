const TURKISH_CHARACTERS: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
}

export function vehicleGroupCodeBase(name: string) {
  const latin = [...name.toLocaleLowerCase("tr-TR")]
    .map((character) => TURKISH_CHARACTERS[character] ?? character)
    .join("")

  return (
    latin
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
      .slice(0, 40) || "GROUP"
  )
}

export function nextVehicleGroupCode(base: string, existingCodes: Iterable<string>) {
  const existing = new Set(existingCodes)
  if (!existing.has(base)) return base

  let suffix = 2
  while (existing.has(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}
