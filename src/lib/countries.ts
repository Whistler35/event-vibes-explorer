// Country list for the profile "Land" field. German display names, sorted,
// with the DACH region pinned to the top for convenience.

const TOP = ["Österreich", "Deutschland", "Schweiz", "Liechtenstein"];

const REST = [
  "Belgien", "Bulgarien", "Dänemark", "Estland", "Finnland", "Frankreich",
  "Griechenland", "Irland", "Italien", "Kroatien", "Lettland", "Litauen",
  "Luxemburg", "Malta", "Niederlande", "Norwegen", "Polen", "Portugal",
  "Rumänien", "Schweden", "Slowakei", "Slowenien", "Spanien", "Tschechien",
  "Ungarn", "Vereinigtes Königreich", "Island", "Serbien", "Bosnien und Herzegowina",
  "Montenegro", "Nordmazedonien", "Albanien", "Kosovo", "Moldau", "Ukraine",
  "Türkei", "Zypern",
  "Australien", "Brasilien", "Chile", "China", "Indien", "Japan", "Kanada",
  "Mexiko", "Neuseeland", "Südkorea", "USA", "Vereinigte Arabische Emirate",
  "Südafrika", "Argentinien", "Marokko", "Ägypten", "Israel", "Thailand",
  "Vietnam", "Indonesien", "Philippinen", "Singapur",
].sort((a, b) => a.localeCompare(b, "de"));

export const COUNTRIES: string[] = [...TOP, ...REST];
