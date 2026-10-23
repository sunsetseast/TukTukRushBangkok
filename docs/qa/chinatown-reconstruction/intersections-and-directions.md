# Intersections, real street identities and one-way review

The retained OSM way order and `oneway` tags support each directed section below. Unknown/absent tags are not converted into invented one-way restrictions. Endpoint compass labels describe the compressed controls, not a survey bearing. Wanit 2 south and Yotha remain two-way where the selected data does not establish a one-way rule. Source restrictions are a dated geographic snapshot, not live legal driving advice.

| Game corridor | Street / Thai | OSM ways | Direction / operation |
|---|---|---|---|
| yaowarat | Yaowarat Road / ถนนเยาวราช | 157319681, 462532630, 1305800722, 754824716, 832948770, 242165655, 242165657, 242165656 | One-way NW |
| charoen_n | Charoen Krung Road / ถนนเจริญกรุง | 157690711, 911126529, 157690693, 832948764 | One-way SE |
| charoen_s | Charoen Krung Road / ถนนเจริญกรุง | 175257878, 1284585773, 1302716057 | One-way SW |
| ratchawong | Ratchawong Road / ถนนราชวงศ์ | 242165653, 23610153, 1553123377 | Two-way |
| mangkon | Mangkon Road / ถนนมังกร | 242161010 | One-way SW |
| plaeng-nam | Plaeng Nam Road / ถนนแปลงนาม | 25707421 | One-way NE |
| song-sawat | Song Sawat Road / ถนนทรงสวัสดิ์ | 24715224, 754824715 | One-way NE |
| phadung-dao | Phadung Dao Road / ถนนผดุงด้าว | 30134885 | One-way NE · local vehicle access; no through NPC traffic |
| songwat | Song Wat Road / ถนนทรงวาด | 25707891, 462492028 | One-way SE |
| songwat-east | Song Wat Road / ถนนทรงวาด | 25745335, 1051323382, 832948767 | One-way SW |
| songwat-central | Song Wat Road / ถนนทรงวาด | 242161008 | Two-way |
| tri-mit | Tri Mit Road / ถนนตรีมิตร | 25745344, 1051323384 | One-way NE |
| mittraphap | Mittraphap Thai-China Road / ถนนมิตรภาพไทย-จีน | 30134855 | One-way SW |
| wanit-2 | Soi Wanit 2 / ซอยวานิช 2 | 168826194 | One-way SW |
| yotha | Yotha Road / ถนนโยธา | 245688953 | Two-way |
| wanit-2-south | Soi Wanit 2 / ซอยวานิช 2 | 1270787531, 998707299, 1416420047 | Two-way |
| mangkon-terminal | Mangkon Road / ถนนมังกร | 628761377 | Two-way |
| khao-lam | Khao Lam Road / ถนนข้าวหลาม | 24715228, 1153320008, 168826191, 1353962192 | One-way NE |
| yaowaphanit-north | Yaowaphanit Road / ถนนเยาวพานิช | 448989820 | One-way SW · local vehicle access; no through NPC traffic |
| yaowaphanit-south | Yaowaphanit Road / ถนนเยาวพานิช | 164560254 | One-way NE · local vehicle access; no through NPC traffic |
| phat-sai | Phat Sai Road / ถนนพาดสาย | 30134881 | One-way SE · local vehicle access; no through NPC traffic |

Song Wat is intentionally split into three directional sections: west traffic eastward, east traffic westward, and a two-way central connection. Mangkon's short terminal is distinct from its one-way commercial section. Yaowaphanit approaches Phat Sai from opposite ends. Phadung Dao, Yaowaphanit and Phat Sai retain local player access while NPC through-traffic is suppressed; OSM marks destination-only motor access in this group. This is an explicit arcade traffic policy, not a claim that ordinary unrestricted traffic may use every source alley.

Yaowarat joins Odeon and curves northwest through Song Sawat, Phadung Dao/Plaeng Nam, Mangkon and Ratchawong. Corrected Tri Mit approaches the gateway from the southwest; the station-facing arc is Mittraphap Thai-China. Ratchawong reaches Song Wat; Wanit 2/Yotha provide the Talat Noi hierarchy and the preserved River City arrival connection. Visual pedestrian passages are omitted from the vehicle graph and protected by rendered posts with matching colliders.

Common graph splitting makes crossings into shared junctions; it does not leave overlapping unconnected road meshes. Asphalt is regenerated from that graph. Exact block paving is cut away from road/sidewalk ribbons and protected areas. At junctions the road surface remains authoritative; corner frontage is fitted inside residual polygons. No new water-crossing road is introduced. Bridge and river suites verify the existing crossings independently.
