/** Passenger details retain the full name; the driving sign uses familiar place names. */
export function destinationLabel(name = "Passenger stop") {
    const place = name.replace(/\s*·\s*(visitor drop-off|roadside stop|visitor arrival).*$/i, '').trim();
    const aliases: Record<string, string> = {
        'Wat Paknam / Big Buddha': 'Wat Paknam · Big Buddha',
        'Grand Palace / Wat Phra Kaew': 'Grand Palace · Wat Phra Kaew',
        'Chinatown Gate / Odeon Circle': 'Chinatown Gate · Odeon',
        'Terminal 21 / Asok': 'Terminal 21 · Asok',
        'MahaNakhon / Chong Nonsi': 'MahaNakhon · Chong Nonsi',
    };
    return aliases[place] ?? place.replace(/\s*\/\s*/g, ' · ');
}
