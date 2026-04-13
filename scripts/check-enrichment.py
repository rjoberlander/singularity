# -*- coding: utf-8 -*-
import json, sys, re
from collections import Counter

data = json.load(sys.stdin)
trip = data.get('data', {})
media = trip.get('media', [])
activities = trip.get('activities', [])
segments = trip.get('segments', [])

print(f"API returned: {len(media)} media, {len(activities)} activities")
print()

enrichable_types = {'activity','dining','snack','coffee','sightseeing','attraction',
                    'restaurant','cafe','museum','hike','beach','shopping'}

non_enrichable_types = {'transport','downtime','logistics','sleep','rest','custom'}

meal_types = {'dining','meal','breakfast','lunch','dinner','snack','coffee','restaurant','cafe'}

no_location_patterns = [
    r'wake\s*up', r'sleep', r'bed', r'pack', r'rest', r'pool\s*time',
    r'check\s*-?\s*(in|out)', r'checkout', r'checkin',
    r'luggage', r'nap', r'relax', r'free\s*time',
    r'kids?\s*to\s*bed', r'early\s*night',
]

transit_name_patterns = [
    r'^uber\b', r'^taxi\b', r'^bus\b', r'^train\b', r'^tram\b',
    r'^drive\s+(to|from|back)\b',
    r'^walk\s+(to|from|back|down\s+to)\b',
    r'^travel\s+to\b', r'^head\s+to\b', r'^ride\s+to\b',
    r'^transfer\b', r'^drop[\s-]*off\b',
    r'^park\s+at\b',
    r'\b(back\s+to|to\s+the)\s+(hotel|airport|car|station|accommodation)\b',
]

def activity_needs_enrichment(name, atype):
    if atype in non_enrichable_types:
        return False
    if atype not in enrichable_types:
        return False
    lower = name.lower()
    for p in no_location_patterns:
        if re.search(p, lower, re.IGNORECASE):
            return False
    for p in transit_name_patterns:
        if re.search(p, name, re.IGNORECASE):
            return False
    if atype in meal_types and (
        'at hotel' in lower or
        'at accommodation' in lower or
        'hotel breakfast' in lower or
        'room service' in lower
    ):
        return False
    return True

media_by_activity = Counter()
for m in media:
    if m.get('parent_type') == 'activity':
        media_by_activity[m['parent_id']] += 1

seg_names = {s['id']: s['name'] for s in segments}
seg_order = {s['id']: s.get('sort_order', 0) for s in segments}
seg_acts = {}
for a in activities:
    if a.get('is_backup'):
        continue
    sid = a.get('segment_id')
    if sid:
        seg_acts.setdefault(sid, []).append(a)

print(f"{'Segment':35s} | {'Places':12s} | {'Photos':15s} | Status")
print("-" * 85)

for sid in sorted(seg_acts.keys(), key=lambda x: seg_order.get(x, 0)):
    acts = seg_acts[sid]
    name = seg_names.get(sid, sid[:8])

    places_enriched = 0
    places_total = 0
    photos_actual = 0

    for a in acts:
        atype = a.get('activity_type', '')
        aname = a.get('name', '')
        if not activity_needs_enrichment(aname, atype):
            continue
        if atype in enrichable_types:
            places_total += 1
            has_google = a.get('google_place_id') and (
                a.get('google_rating') is not None or
                a.get('opening_hours') is not None or
                a.get('photos_fetched') is True
            )
            if has_google:
                places_enriched += 1
            photos_actual += media_by_activity.get(a['id'], 0)

    photos_expected = places_total * 10
    places_ok = places_total == 0 or places_enriched == places_total
    photos_ok = photos_expected == 0 or photos_actual >= photos_expected
    done = places_ok and photos_ok
    status = "DONE" if done else "INCOMPLETE"
    print(f"  {name:33s} | {places_enriched:3d}/{places_total:3d}     | {photos_actual:4d}/{photos_expected:4d}      | {status}")

    # Show missing activities
    if not done:
        for a in acts:
            atype = a.get('activity_type', '')
            aname = a.get('name', '')
            if not activity_needs_enrichment(aname, atype):
                continue
            if atype in enrichable_types:
                has_google = a.get('google_place_id') and (
                    a.get('google_rating') is not None or
                    a.get('opening_hours') is not None or
                    a.get('photos_fetched') is True
                )
                pc = media_by_activity.get(a['id'], 0)
                if not has_google or pc == 0:
                    pid = a.get('google_place_id')
                    pf = a.get('photos_fetched')
                    gr = a.get('google_rating')
                    oh = 'yes' if a.get('opening_hours') else 'no'
                    marker = "NO GOOGLE" if not has_google else "NO PHOTOS"
                    print(f"       {marker}: {aname} (type={atype}, gplace={'yes' if pid else 'no'}, rating={gr}, hours={oh}, pf={pf}, photos={pc})")
