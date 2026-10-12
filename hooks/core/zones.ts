// Separators by level (064 #9): `│` between zones, `·` inside one, never both in a zone.
// Pure: no $.

export const ZONE_SEPARATOR = ' │ '
export const ITEM_SEPARATOR = ' · '

/** Zones of items as one line. A zone bar inside an item is flattened, so a zone never holds both. */
export const joinZones = (zones: readonly (readonly string[])[]): string =>
  zones
    .map(items =>
      items
        .map(item => item.replaceAll('│', '|'))
        .filter(item => item !== '')
        .join(ITEM_SEPARATOR),
    )
    .filter(zone => zone !== '')
    .join(ZONE_SEPARATOR)
