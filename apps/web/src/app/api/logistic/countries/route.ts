import { NextResponse } from "next/server"

interface CountryOption { code: string; name: string }

const FALLBACK_COUNTRIES: CountryOption[] = [
  ["TR", "Türkiye"], ["DE", "Almanya"], ["FR", "Fransa"], ["GB", "Birleşik Krallık"], ["ES", "İspanya"],
  ["IT", "İtalya"], ["BE", "Belçika"], ["NL", "Hollanda"], ["RO", "Romanya"], ["BG", "Bulgaristan"],
  ["GR", "Yunanistan"], ["PL", "Polonya"], ["CZ", "Çekya"], ["AT", "Avusturya"], ["HU", "Macaristan"],
  ["US", "Amerika Birleşik Devletleri"], ["CA", "Kanada"], ["MX", "Meksika"], ["BR", "Brezilya"], ["AR", "Arjantin"],
  ["AE", "Birleşik Arap Emirlikleri"], ["SA", "Suudi Arabistan"], ["EG", "Mısır"], ["MA", "Fas"], ["ZA", "Güney Afrika"],
  ["CN", "Çin"], ["JP", "Japonya"], ["KR", "Güney Kore"], ["IN", "Hindistan"], ["AU", "Avustralya"],
].map(([code, name]) => ({ code, name }))

export async function GET() {
  try {
    const response = await fetch("https://restcountries.com/v3.1/all?fields=cca2,name,translations", { next: { revalidate: 86400 } })
    if (!response.ok) throw new Error(`Countries API returned ${response.status}`)
    const data: unknown = await response.json()
    if (!Array.isArray(data)) throw new Error("Invalid countries response")
    const countries = data.flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const record = item as { cca2?: unknown; name?: { common?: unknown }; translations?: { tur?: { common?: unknown } } }
      const code = typeof record.cca2 === "string" ? record.cca2 : ""
      const name = typeof record.translations?.tur?.common === "string" ? record.translations.tur.common : record.name?.common
      return code && typeof name === "string" ? [{ code, name }] : []
    }).sort((a, b) => a.name.localeCompare(b.name, "tr"))
    return NextResponse.json(countries)
  } catch {
    return NextResponse.json(FALLBACK_COUNTRIES)
  }
}
