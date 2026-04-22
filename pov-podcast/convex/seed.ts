import { internalMutation } from "./_generated/server";
import { matchVoice } from "./voiceMatching";
import { Id } from "./_generated/dataModel";

const CONTENT_DISCLAIMER =
  "Persona narratives are AI-generated interpretations inspired by historical events and do not represent verified historical fact.";

interface PersonaSeed {
  name: string;
  historicalRole: string;
  personalityTraits: string[];
  emotionalBackstory: string;
  speakingStyle: string;
  ideologicalPosition: string;
  geographicOrigin: string;
  estimatedAge: number;
  gender: string;
  articleReferences: {
    url: string;
    title: string;
    isVerified: boolean;
    isIllustrative: boolean;
    ideologicalAlignment: string;
  }[];
}

interface ScenarioSeed {
  title: string;
  timePeriod: string;
  era: "Ancient" | "Medieval" | "Modern" | "Contemporary";
  description: string;
  initialDialogueOutline: string;
  personas: PersonaSeed[];
}

function ref(
  url: string,
  title: string,
  alignment: string
): PersonaSeed["articleReferences"][number] {
  return { url, title, isVerified: false, isIllustrative: false, ideologicalAlignment: alignment };
}

// ────────────────────────────────────────────────────────────────────────────
// 12 Pre-built Scenarios (5 Modern + 7 Contemporary)
// ────────────────────────────────────────────────────────────────────────────

const SCENARIOS: ScenarioSeed[] = [
  // ═══════════════════════ MODERN (5) ═══════════════════════

  // 1 — WWII
  {
    title: "World War II: The Fall of Berlin",
    timePeriod: "1939–1945",
    era: "Modern",
    description: "The final days of the Third Reich as Allied and Soviet forces close in on Berlin, ending history's deadliest conflict.",
    initialDialogueOutline:
      "The conversation opens in April 1945 as Soviet shells rain on Berlin. Each persona reflects on how the war reshaped their world and what comes next.",
    personas: [
      {
        name: "Hans Müller",
        historicalRole: "Wehrmacht conscript deserter",
        personalityTraits: ["disillusioned", "pragmatic", "guilt-ridden"],
        emotionalBackstory:
          "Hans was conscripted at seventeen from a farming village near Dresden. He believed the propaganda at first — that he was protecting his homeland. After two years on the Eastern Front he watched friends die for ground that was retaken the next week. He deserted in early 1945 and hid in a bombed cellar in Berlin, tormented by survivor's guilt and the knowledge that his family may already be dead. Every explosion above him is a reminder of the senseless machinery he once served. He dreams of the wheat fields of his childhood, now likely ash.",
        speakingStyle: "Quiet, halting German-inflected English, trails off mid-sentence when memories surface",
        ideologicalPosition: "Anti-war, deeply sceptical of nationalism and authority",
        geographicOrigin: "Germany",
        estimatedAge: 21,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Battle_of_Berlin", "Battle of Berlin", "neutral"),
          ref("https://en.wikipedia.org/wiki/Wehrmacht", "Wehrmacht — Structure and Conscription", "critical"),
          ref("https://www.bbc.co.uk/history/worldwars/wwtwo/", "BBC WWII Overview", "neutral"),
        ],
      },
      {
        name: "Natalya Petrova",
        historicalRole: "Soviet field nurse",
        personalityTraits: ["resilient", "compassionate", "fierce"],
        emotionalBackstory:
          "Natalya left medical school in Leningrad at twenty to serve as a field nurse. She survived the siege, watching neighbours starve while she rationed what little morphine remained for soldiers. By 1945 she has treated thousands and buried hundreds, yet she pushes forward with grim determination. She carries a photograph of her younger brother who died at Stalingrad. Victory is near, but she cannot feel joy — only the weight of what it cost. She fears peace almost as much as war, because peace means confronting everything she suppressed to survive.",
        speakingStyle: "Direct, clipped military cadence with occasional tender vulnerability",
        ideologicalPosition: "Soviet patriot who questions the human cost demanded by her own leadership",
        geographicOrigin: "Russia",
        estimatedAge: 25,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Siege_of_Leningrad", "Siege of Leningrad", "Soviet perspective"),
          ref("https://en.wikipedia.org/wiki/Soviet_women_in_World_War_II", "Soviet Women in WWII", "sympathetic"),
          ref("https://www.history.com/topics/world-war-ii/battle-of-stalingrad", "Battle of Stalingrad", "neutral"),
        ],
      },
      {
        name: "James Crawford",
        historicalRole: "British SOE intelligence officer",
        personalityTraits: ["calculating", "dry-witted", "morally conflicted"],
        emotionalBackstory:
          "James was recruited from Oxford into the Special Operations Executive in 1941. He coordinated sabotage networks in occupied France, sending agents behind lines knowing many would not return. His public school reserve hides a growing horror at the moral compromises he has made — trading lives for intelligence, burning villages to deny the enemy resources. He tells himself the calculus of war demands it, but late at night the faces of agents he sent to their deaths visit him. He wonders if the post-war world will judge men like him as heroes or monsters.",
        speakingStyle: "Formal British understatement, sardonic, uses euphemism to mask emotion",
        ideologicalPosition: "Pragmatic realist who believes in liberal democracy but doubts its moral purity",
        geographicOrigin: "United Kingdom",
        estimatedAge: 34,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Special_Operations_Executive", "Special Operations Executive", "British perspective"),
          ref("https://en.wikipedia.org/wiki/MI6", "MI6 — Secret Intelligence Service", "institutional"),
          ref("https://www.iwm.org.uk/history/the-special-operations-executive-soe", "IWM SOE History", "neutral"),
        ],
      },
      {
        name: "Ruth Goldberg",
        historicalRole: "Holocaust survivor liberated from Bergen-Belsen",
        personalityTraits: ["haunted", "defiant", "spiritually searching"],
        emotionalBackstory:
          "Ruth was a school teacher in Amsterdam before the occupation. She was deported to Bergen-Belsen in 1943 alongside her husband and two children. Her husband and daughter did not survive. Her son was separated from her and she does not know his fate. Liberated by British forces in April 1945, she is physically skeletal but spiritually unbroken. She oscillates between fury at a world that let this happen and a desperate need to believe in human goodness. She speaks because the dead cannot — and she refuses to let their stories be erased.",
        speakingStyle: "Measured, occasionally breaking into raw emotional outbursts, mixes Dutch and English phrases",
        ideologicalPosition: "Demands justice and remembrance, wary of all nationalism including Zionism",
        geographicOrigin: "Netherlands",
        estimatedAge: 38,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Bergen-Belsen_concentration_camp", "Bergen-Belsen Concentration Camp", "survivor perspective"),
          ref("https://en.wikipedia.org/wiki/The_Holocaust_in_the_Netherlands", "The Holocaust in the Netherlands", "historical"),
          ref("https://encyclopedia.ushmm.org/content/en/article/bergen-belsen", "USHMM Bergen-Belsen", "memorial"),
        ],
      },
      {
        name: "Hiroshi Tanaka",
        historicalRole: "Japanese-American internee and 442nd Regiment veteran",
        personalityTraits: ["proud", "conflicted", "stoic"],
        emotionalBackstory:
          "Hiroshi's family owned a nursery in California before Executive Order 9066 sent them to Manzanar. Despite his country's betrayal, he volunteered for the all-Nisei 442nd Regimental Combat Team to prove his loyalty. He fought across Italy and France, earning a Purple Heart, while his parents remained behind barbed wire. Now the war in Europe is ending and he wonders what home he is returning to — the land of the free that locked up his family, or a Japan he has never known. He carries two flags in his heart and belongs fully to neither.",
        speakingStyle: "Calm, deliberate American English with moments of bitter irony",
        ideologicalPosition: "Patriotic American who demands his country live up to its ideals",
        geographicOrigin: "United States",
        estimatedAge: 24,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/442nd_Infantry_Regiment_(United_States)", "442nd Infantry Regiment", "Japanese-American perspective"),
          ref("https://en.wikipedia.org/wiki/Internment_of_Japanese_Americans", "Japanese American Internment", "critical"),
          ref("https://www.nps.gov/manz/index.htm", "Manzanar National Historic Site", "memorial"),
        ],
      },
      {
        name: "Marie Leclerc",
        historicalRole: "French Resistance fighter and communist organiser",
        personalityTraits: ["passionate", "idealistic", "uncompromising"],
        emotionalBackstory:
          "Marie joined the Resistance at nineteen after watching German soldiers execute her father, the village mayor, for refusing to hand over a list of Jewish families. She became a courier, then a saboteur, then an organiser for the communist wing of the FTP. She has killed and watched friends die at the hands of the Gestapo. Now, with liberation won, she fights a new battle: ensuring that post-war France does not simply restore the old bourgeois order that collaborated with Vichy. For her, the Resistance was never just about expelling the Germans — it was about building a new world. She distrusts de Gaulle and the returning exiles who claim credit for the blood she and her comrades shed.",
        speakingStyle: "Fiery, rapid French-accented English, uses rhetorical questions as weapons",
        ideologicalPosition: "Communist revolutionary who sees the war as a class struggle alongside a national one",
        geographicOrigin: "France",
        estimatedAge: 25,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/French_Resistance", "French Resistance", "leftist perspective"),
          ref("https://en.wikipedia.org/wiki/Francs-tireurs_et_partisans", "FTP — Communist Resistance", "sympathetic"),
          ref("https://en.wikipedia.org/wiki/Vichy_France", "Vichy France and Collaboration", "critical"),
        ],
      },
    ],
  },

  // 2 — India-Pakistan Partition
  {
    title: "The Partition of India",
    timePeriod: "1947",
    era: "Modern",
    description: "The birth of two nations tears apart communities, families, and a subcontinent in the largest mass migration in human history.",
    initialDialogueOutline:
      "It is August 1947 and the Radcliffe Line has just been announced. Each persona grapples with what independence means when it comes at the cost of everything they knew.",
    personas: [
      {
        name: "Amrit Singh",
        historicalRole: "Sikh landowner forced to flee Lahore",
        personalityTraits: ["proud", "grief-stricken", "protective"],
        emotionalBackstory:
          "Amrit's family had farmed the same land outside Lahore for five generations. When Partition was announced, his Muslim neighbours — people he had shared harvests with — warned him to leave before the mobs came. He loaded his family onto an oxcart with whatever they could carry and joined the endless columns heading east. On the road he saw things no human should witness. His eldest son did not survive the journey. Now in a refugee camp near Amritsar, he owns nothing but his turban and his fury at the British who drew a line through his life.",
        speakingStyle: "Deep, authoritative Punjabi-accented English, voice breaks when speaking of his son",
        ideologicalPosition: "Blames British partition policy and communal politicians equally",
        geographicOrigin: "India",
        estimatedAge: 48,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Partition_of_India", "Partition of India", "neutral"),
          ref("https://en.wikipedia.org/wiki/Radcliffe_Line", "The Radcliffe Line", "critical"),
          ref("https://www.bbc.co.uk/history/british/modern/partition1947_01.shtml", "BBC — Partition of India", "neutral"),
        ],
      },
      {
        name: "Fatima Begum",
        historicalRole: "Muslim schoolteacher choosing to stay in Delhi",
        personalityTraits: ["courageous", "intellectual", "torn"],
        emotionalBackstory:
          "Fatima teaches at a girls' school in Old Delhi. Her brother has gone to Pakistan, begging her to follow, but she was born in Delhi and her students need her. She believes in the syncretic culture of India — the Urdu poetry, the shared festivals, the Sufi shrines where Hindus and Muslims prayed together. She is terrified: Muslim homes are burning across the city and every knock on the door could be the last. Yet leaving would mean admitting that the pluralism she dedicated her life to is dead. She stays not because she is brave, but because she cannot bear the alternative truth.",
        speakingStyle: "Eloquent, literary Urdu-inflected English with classical metaphors",
        ideologicalPosition: "Secular Indian nationalist who opposes the two-nation theory",
        geographicOrigin: "India",
        estimatedAge: 35,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Indian_independence_movement", "Indian Independence Movement", "secular nationalist"),
          ref("https://en.wikipedia.org/wiki/Two-nation_theory", "Two-Nation Theory", "critical"),
          ref("https://en.wikipedia.org/wiki/Delhi#Partition_and_independence", "Delhi During Partition", "neutral"),
        ],
      },
      {
        name: "Cyril Radcliffe",
        historicalRole: "British lawyer who drew the Partition boundary",
        personalityTraits: ["detached", "overwhelmed", "defensive"],
        emotionalBackstory:
          "Cyril had never visited India before he was given five weeks to divide a subcontinent of four hundred million people. He worked from outdated maps and census data in a sweltering office in Delhi, knowing that wherever he drew the line, millions would be displaced. He tells himself he did the best anyone could with an impossible task, but the reports of massacres haunt him. He will refuse his fee of £3,000 and burn his papers. Deep down he suspects that history will damn him — not for the line he drew, but for the arrogance of thinking any line could have been drawn without catastrophe.",
        speakingStyle: "Clipped, lawyerly British English, defensive and evasive under emotional pressure",
        ideologicalPosition: "Believes in rule of law but privately doubts the morality of the entire exercise",
        geographicOrigin: "United Kingdom",
        estimatedAge: 48,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Cyril_Radcliffe", "Cyril Radcliffe", "biographical"),
          ref("https://en.wikipedia.org/wiki/Radcliffe_Line", "Radcliffe Line", "institutional"),
          ref("https://www.theguardian.com/world/2017/aug/10/partition-70-years-on-the-day-india-and-pakistan-were-born", "Guardian — Partition 70 Years On", "neutral"),
        ],
      },
      {
        name: "Begum Jahanara Shah",
        historicalRole: "Muslim League activist and women's organiser in Lahore",
        personalityTraits: ["determined", "political", "privately anxious"],
        emotionalBackstory:
          "Jahanara campaigned tirelessly for Pakistan, believing it was the only way to protect Muslim rights in a Hindu-majority India. She organised women's rallies, smuggled pamphlets, and faced arrest twice. Now that Pakistan is born, she is flooded with conflicting emotions: triumph that the dream is real, horror at the violence, and gnawing doubt about whether this new nation will actually deliver the justice she fought for. She watches Hindu and Sikh neighbours leave Lahore — people she grew up with — and wonders if freedom was supposed to feel this hollow.",
        speakingStyle: "Confident, rhetorical Urdu-English blend, but falters when confronting violence",
        ideologicalPosition: "Pro-Pakistan Muslim League supporter grappling with the human cost of her cause",
        geographicOrigin: "Pakistan",
        estimatedAge: 32,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/All-India_Muslim_League", "All-India Muslim League", "sympathetic"),
          ref("https://en.wikipedia.org/wiki/Pakistan_Movement", "Pakistan Movement", "supportive"),
          ref("https://en.wikipedia.org/wiki/Lahore#Partition", "Lahore During Partition", "neutral"),
        ],
      },
      {
        name: "Baldev Kumar",
        historicalRole: "Hindu shopkeeper from Rawalpindi who lost everything",
        personalityTraits: ["bitter", "resourceful", "traumatised"],
        emotionalBackstory:
          "Baldev ran a cloth shop in Rawalpindi that his grandfather established. In March 1947, months before formal Partition, communal riots swept the city. His shop was looted and burned. His wife was killed in the violence. He grabbed his two young daughters and fled east with nothing. The journey was a nightmare of disease, banditry, and overcrowded trains. Now in a Delhi refugee camp, he stitches scraps of cloth into garments to sell on the street. He trusted the political leaders — Hindu, Muslim, and British alike — and they all failed him. He wants justice but has no idea who to demand it from.",
        speakingStyle: "Blunt, earthy Hindi-accented English, raw and unfiltered",
        ideologicalPosition: "Distrusts all politicians and communal leaders, focused purely on survival",
        geographicOrigin: "India",
        estimatedAge: 42,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/1947_Rawalpindi_massacres", "1947 Rawalpindi Massacres", "victim perspective"),
          ref("https://en.wikipedia.org/wiki/Refugees_of_the_Partition_of_India", "Partition Refugees", "neutral"),
          ref("https://en.wikipedia.org/wiki/Partition_of_India#Punjab", "Punjab During Partition", "neutral"),
        ],
      },
      {
        name: "Ayesha Nawaz",
        historicalRole: "Young Muslim woman migrating from Bihar to East Pakistan",
        personalityTraits: ["hopeful", "naive", "observant"],
        emotionalBackstory:
          "Ayesha is eighteen and has just finished school in Patna. Her father, a government clerk, decided the family would migrate to Dhaka in East Pakistan for a fresh start. Ayesha is the youngest and the most excited — she imagines Pakistan as a promised land of opportunity. But the journey east by train exposes her to horrors she never imagined: bodies by the tracks, the stench of fear in overcrowded carriages, the wild eyes of people who have lost everything. By the time she reaches Dhaka, her innocence is gone. She still believes in Pakistan, but she now understands that nations are built on suffering, not speeches.",
        speakingStyle: "Youthful, earnest English with Bengali and Urdu phrases, gradually more subdued",
        ideologicalPosition: "Idealistic Muslim nationalist whose faith is being tested by reality",
        geographicOrigin: "India",
        estimatedAge: 18,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/East_Pakistan", "East Pakistan — Early History", "neutral"),
          ref("https://en.wikipedia.org/wiki/Bihar#Post-independence", "Bihar Post-Independence Migration", "neutral"),
          ref("https://en.wikipedia.org/wiki/Partition_of_India#Bengal", "Bengal During Partition", "neutral"),
        ],
      },
    ],
  },

  // 3 — Titanic
  {
    title: "The Sinking of the Titanic",
    timePeriod: "1912",
    era: "Modern",
    description: "The unsinkable ship meets an iceberg, exposing the brutal class divides of the Edwardian era in a single night of terror.",
    initialDialogueOutline:
      "It is 11:40 PM on April 14, 1912. The iceberg has been struck. As the ship slowly lists, each persona confronts mortality, privilege, and the myth of progress.",
    personas: [
      {
        name: "Margaret Whitfield",
        historicalRole: "First-class American socialite",
        personalityTraits: ["entitled", "awakening", "unexpectedly brave"],
        emotionalBackstory:
          "Margaret boarded Titanic in Cherbourg after a season in Paris, her steamer trunks full of Worth gowns and Cartier jewels. She married into wealth at nineteen and has never questioned the order of things — first class is first class, steerage is steerage. But as the lifeboats are loaded and she watches stewards lock gates to the lower decks, something shifts in her. For the first time she sees the architecture of her privilege laid bare: the gates are not metaphorical. She will survive this night, but the woman who steps off the lifeboat in New York will not be the same woman who boarded in France.",
        speakingStyle: "Refined East Coast American, increasingly agitated and questioning",
        ideologicalPosition: "Begins as an uncritical elite, shifts toward uncomfortable awareness of class injustice",
        geographicOrigin: "United States",
        estimatedAge: 28,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Titanic", "RMS Titanic", "neutral"),
          ref("https://en.wikipedia.org/wiki/First-class_facilities_of_the_Titanic", "Titanic First Class", "descriptive"),
          ref("https://en.wikipedia.org/wiki/Sinking_of_the_Titanic", "Sinking of the Titanic", "neutral"),
        ],
      },
      {
        name: "Padraig O'Brien",
        historicalRole: "Irish steerage passenger emigrating to America",
        personalityTraits: ["defiant", "witty", "desperately hopeful"],
        emotionalBackstory:
          "Padraig sold his mother's wedding ring to buy a third-class ticket. He left County Cork with nothing but a change of clothes and a letter from his cousin in Boston promising work. Steerage is crowded, loud, and smells of sick, but it was the gateway to a new life. Now the gates to the upper decks are locked and crew members shout at them to stay below. He has survived famine stories from his grandmother and British landlords — he will not drown quietly in the bowels of a rich man's ship. He rallies his fellow steerage passengers with a mix of fury and dark Irish humour.",
        speakingStyle: "Rapid Cork-accented English, alternating between gallows humour and righteous anger",
        ideologicalPosition: "Working-class Irish republican who sees Titanic as a metaphor for British class oppression",
        geographicOrigin: "Ireland",
        estimatedAge: 22,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Third-class_facilities_of_the_Titanic", "Titanic Third Class", "critical"),
          ref("https://en.wikipedia.org/wiki/Irish_emigration_to_America", "Irish Emigration to America", "sympathetic"),
          ref("https://en.wikipedia.org/wiki/Sinking_of_the_Titanic#Third_class", "Third Class Survival Rates", "critical"),
        ],
      },
      {
        name: "Thomas Andrews",
        historicalRole: "Ship's chief designer from Harland and Wolff",
        personalityTraits: ["brilliant", "agonised", "accepting"],
        emotionalBackstory:
          "Thomas designed Titanic and knows her intimately — every rivet, every bulkhead, every compromise made to keep costs down. When the iceberg tears open five compartments he instantly calculates what the builders and owners refused to consider: she is going to sink. He walks the corridors in a daze, helping passengers into lifeboats while knowing he is responsible. He had pushed for more lifeboats, for higher bulkheads, for a double hull — and been overruled each time. The ship is his masterpiece and his tombstone. He chooses to go down with her, not out of heroism but because he cannot face a world where his creation killed fifteen hundred people.",
        speakingStyle: "Quiet Belfast accent, technical precision giving way to raw grief",
        ideologicalPosition: "Engineer who trusted the system only to discover the system prioritised profit over safety",
        geographicOrigin: "United Kingdom",
        estimatedAge: 39,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Thomas_Andrews_(shipbuilder)", "Thomas Andrews", "biographical"),
          ref("https://en.wikipedia.org/wiki/Harland_and_Wolff", "Harland and Wolff Shipyard", "institutional"),
          ref("https://en.wikipedia.org/wiki/Titanic_(1997_film)#Historical_accuracy", "Titanic Historical Context", "neutral"),
        ],
      },
      {
        name: "Mei Chen",
        historicalRole: "Chinese steerage passenger and aspiring labourer",
        personalityTraits: ["resourceful", "isolated", "determined"],
        emotionalBackstory:
          "Mei left Guangdong province after drought destroyed his family's rice crop. He worked his way across Asia doing odd jobs until he scraped together enough for a third-class ticket from Southampton. He speaks almost no English and clings to a group of seven other Chinese passengers — the only familiar faces in a sea of strangers. When the ship begins to sink, he discovers that being Chinese makes him even lower than steerage in the eyes of the crew. He and his companions are turned away from lifeboats. He survives by clinging to wreckage and is later vilified in American newspapers as someone who snuck aboard disguised as a woman — a lie that will follow Chinese Titanic survivors for a century.",
        speakingStyle: "Very limited broken English, communicates through gesture and tone, occasionally in Cantonese",
        ideologicalPosition: "Focused on survival; invisible to the western narrative, fighting to be seen as human",
        geographicOrigin: "China",
        estimatedAge: 26,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Chinese_passengers_on_the_Titanic", "Chinese Passengers on Titanic", "revisionist"),
          ref("https://en.wikipedia.org/wiki/Chinese_Exclusion_Act", "Chinese Exclusion Act — Context", "critical"),
          ref("https://www.bbc.com/news/world-us-canada-56314026", "BBC — The Forgotten Chinese Titanic Survivors", "sympathetic"),
        ],
      },
      {
        name: "Violet Jessop",
        historicalRole: "Stewardess and survivor of Olympic, Titanic, and later Britannic",
        personalityTraits: ["steadfast", "observant", "matter-of-fact"],
        emotionalBackstory:
          "Violet grew up in Argentina to Irish immigrant parents and went to sea to support her family after her father died. She has already survived a collision on RMS Olympic and will later survive the sinking of HMHS Britannic. Tonight she moves through the first-class corridors with practised calm, guiding passengers to lifeboats while internally screaming. She is invisible — a servant — and yet she sees everything: the cowardice of some wealthy men, the quiet courage of steerage mothers, the absurd formality of the orchestra playing on. She will survive because surviving is what she does. But she will never be able to explain to anyone what it means to watch a ship die.",
        speakingStyle: "Composed, slightly Irish-Argentine lilt, observational and dry",
        ideologicalPosition: "Working-class witness to aristocratic hypocrisy, pragmatic feminist",
        geographicOrigin: "Argentina",
        estimatedAge: 25,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Violet_Jessop", "Violet Jessop", "biographical"),
          ref("https://en.wikipedia.org/wiki/HMHS_Britannic", "HMHS Britannic — Later Sinking", "neutral"),
          ref("https://en.wikipedia.org/wiki/Crew_of_the_Titanic", "Crew of the Titanic", "neutral"),
        ],
      },
      {
        name: "J. Bruce Ismay",
        historicalRole: "Chairman of the White Star Line",
        personalityTraits: ["ambitious", "self-justifying", "crumbling"],
        emotionalBackstory:
          "Bruce is the man who ordered Titanic built as the largest, most luxurious ship afloat. He pushed Captain Smith to maintain speed through the ice field — or so the press will allege. When the iceberg struck, he helped load lifeboats, then at the last moment stepped into Collapsible C. He will spend the rest of his life defending that decision. Tonight, in the lifeboat, he wraps himself in a blanket and refuses to look back at the lights going under. He knows the world will call him a coward. He argues with himself endlessly: was there an empty seat, or did he take a place that could have saved another life? The question will consume him until he dies.",
        speakingStyle: "Upper-class British, defensive to the point of aggression, then deflating into silence",
        ideologicalPosition: "Capitalist who believed progress and profit were synonymous — now confronting the wreckage of that belief",
        geographicOrigin: "United Kingdom",
        estimatedAge: 49,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/J._Bruce_Ismay", "J. Bruce Ismay", "biographical"),
          ref("https://en.wikipedia.org/wiki/White_Star_Line", "White Star Line", "institutional"),
          ref("https://en.wikipedia.org/wiki/British_Wreck_Commissioner%27s_inquiry_into_the_sinking_of_the_Titanic", "British Inquiry into the Titanic", "institutional"),
        ],
      },
    ],
  },

  // 4 — Hiroshima
  {
    title: "Hiroshima: The Atomic Dawn",
    timePeriod: "1945",
    era: "Modern",
    description: "At 8:15 AM on August 6, the world enters the nuclear age. Survivors, decision-makers, and witnesses reckon with the unthinkable.",
    initialDialogueOutline:
      "The conversation begins in the aftermath of the bombing. Each persona processes what has happened from radically different vantage points — ground zero, Washington, and the scientific community.",
    personas: [
      {
        name: "Keiko Yamamoto",
        historicalRole: "Hibakusha — atomic bomb survivor and schoolteacher",
        personalityTraits: ["traumatised", "resolute", "quietly furious"],
        emotionalBackstory:
          "Keiko was walking to her school 1.2 kilometres from the hypocentre when the flash came. She was thrown into a ditch by the blast wave and emerged into a landscape from hell — shadows burned into walls, rivers full of the dying, the sky turned black. She survived with radiation burns across her back. In the weeks that followed, she watched her students die one by one from radiation sickness. She carries their names in a notebook she will keep for the rest of her life. She does not want revenge — she wants the world to understand what happened so it never happens again. But the world seems determined to build more bombs, not fewer.",
        speakingStyle: "Soft-spoken Japanese-accented English, precise and devastatingly understated",
        ideologicalPosition: "Pacifist and anti-nuclear activist who bears witness without seeking vengeance",
        geographicOrigin: "Japan",
        estimatedAge: 30,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki", "Atomic Bombings of Hiroshima and Nagasaki", "victim perspective"),
          ref("https://en.wikipedia.org/wiki/Hibakusha", "Hibakusha — Atomic Bomb Survivors", "sympathetic"),
          ref("https://www.hiroshimapeacemedia.jp/?lang=en", "Hiroshima Peace Media Center", "memorial"),
        ],
      },
      {
        name: "Colonel Paul Tibbets",
        historicalRole: "Pilot of the Enola Gay",
        personalityTraits: ["disciplined", "compartmentalised", "unapologetic"],
        emotionalBackstory:
          "Paul was hand-picked to lead the 509th Composite Group and trained for months in secrecy. He named the plane after his mother. When he released Little Boy over Hiroshima, he felt the shockwave hit the plane and saw the mushroom cloud rise. He will maintain for the rest of his life that the bombing saved more lives than it took by ending the war without an invasion of Japan. But in quiet moments he wonders about the people beneath that cloud. He buries those thoughts with military discipline. He is a soldier who followed orders — and he will never apologise, because apologising would mean the mission was wrong, and he cannot live in a world where the mission was wrong.",
        speakingStyle: "Crisp American military diction, matter-of-fact, avoids emotional language",
        ideologicalPosition: "Military pragmatist who believes the bomb was a necessary evil",
        geographicOrigin: "United States",
        estimatedAge: 30,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Paul_Tibbets", "Paul Tibbets", "biographical"),
          ref("https://en.wikipedia.org/wiki/Enola_Gay", "Enola Gay", "neutral"),
          ref("https://en.wikipedia.org/wiki/509th_Composite_Group", "509th Composite Group", "military"),
        ],
      },
      {
        name: "Dr. Robert Oppenheimer",
        historicalRole: "Scientific director of the Manhattan Project",
        personalityTraits: ["brilliant", "tormented", "poetic"],
        emotionalBackstory:
          "Robert led the team that built the bomb at Los Alamos. When Trinity detonated in the New Mexico desert, the words of the Bhagavad Gita came to him: 'Now I am become Death, the destroyer of worlds.' He believed the bomb would end the war and perhaps end all war through the terror of mutually assured destruction. But Hiroshima shattered that rationalisation. He lobbied against the hydrogen bomb and was politically destroyed for it. He is a man who unlocked the fundamental forces of nature and now cannot close the door. His brilliance is his curse — he understood exactly what he built, and he built it anyway.",
        speakingStyle: "Intellectual, literary, prone to quoting poetry and philosophy, voice heavy with guilt",
        ideologicalPosition: "Scientific humanist horrified by the military application of his own work",
        geographicOrigin: "United States",
        estimatedAge: 41,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/J._Robert_Oppenheimer", "J. Robert Oppenheimer", "biographical"),
          ref("https://en.wikipedia.org/wiki/Manhattan_Project", "Manhattan Project", "neutral"),
          ref("https://en.wikipedia.org/wiki/Trinity_(nuclear_test)", "Trinity Nuclear Test", "scientific"),
        ],
      },
      {
        name: "Setsuko Thurlow",
        historicalRole: "13-year-old schoolgirl survivor who became a peace activist",
        personalityTraits: ["innocent-turned-resolute", "eloquent", "unbreakable"],
        emotionalBackstory:
          "Setsuko was thirteen and mobilised as a student worker at a military headquarters 1.8 kilometres from the hypocentre. The building collapsed on her. She crawled out of the rubble to find a city on fire. She saw classmates with skin hanging from their bodies, heard their pleas for water, and could do nothing. She lost eight family members. In the decades that follow, she will dedicate her life to nuclear disarmament, speaking before the United Nations and receiving the Nobel Peace Prize on behalf of ICAN. But tonight she is still a child, screaming for her sister in the burning ruins, and no amount of future recognition will erase that scream.",
        speakingStyle: "Initially childlike and frightened, maturing into the measured eloquence of her activist years",
        ideologicalPosition: "Absolute nuclear abolitionist who speaks from lived experience",
        geographicOrigin: "Japan",
        estimatedAge: 13,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Setsuko_Thurlow", "Setsuko Thurlow", "biographical"),
          ref("https://en.wikipedia.org/wiki/International_Campaign_to_Abolish_Nuclear_Weapons", "ICAN — Nobel Peace Prize", "activist"),
          ref("https://en.wikipedia.org/wiki/Hiroshima_Peace_Memorial", "Hiroshima Peace Memorial", "memorial"),
        ],
      },
      {
        name: "Harry Truman",
        historicalRole: "President of the United States who authorised the bombing",
        personalityTraits: ["decisive", "plain-spoken", "privately haunted"],
        emotionalBackstory:
          "Harry became president only four months ago after Roosevelt's death. He learned about the Manhattan Project for the first time as president. The decision to use the bomb was, he insists, straightforward: end the war, save American lives, avoid the million-casualty invasion of Japan. He signed the order and went to bed. But the reports from Hiroshima — the photographs, the death toll, the descriptions of radiation sickness — are harder to sleep through. He will never publicly express regret. In private, he writes in his diary about 'the most terrible thing ever discovered' and wonders what history will say about the man from Missouri who unleashed it.",
        speakingStyle: "Plain Midwestern American English, folksy and blunt, occasionally reverent",
        ideologicalPosition: "Cold War realist who sees the bomb as a tragic but justified instrument of peace through strength",
        geographicOrigin: "United States",
        estimatedAge: 61,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Harry_S._Truman", "Harry S. Truman", "biographical"),
          ref("https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki#Decision_to_use_the_bombs", "Decision to Use the Bomb", "institutional"),
          ref("https://www.trumanlibrary.gov/education/lesson-plans/decision-drop-bomb", "Truman Library — Decision to Drop the Bomb", "presidential"),
        ],
      },
      {
        name: "Dr. Michihiko Hachiya",
        historicalRole: "Director of the Hiroshima Communications Hospital and diarist",
        personalityTraits: ["methodical", "empathetic", "overwhelmed"],
        emotionalBackstory:
          "Michihiko was in his home when the bomb exploded. Injured and disoriented, he made his way to the hospital he directed, only to find it destroyed. He set up a makeshift clinic and began treating the injured — thousands of them — with almost no supplies. He kept a diary documenting what he saw: the flash burns, the radiation sickness, the psychological trauma. His clinical training allowed him to observe systematically even as his heart broke. His diary, published as 'Hiroshima Diary,' became one of the most important primary accounts of the bombing. He represents the doctor who must heal when there is no medicine, record when there are no words, and endure when endurance itself seems impossible.",
        speakingStyle: "Clinical precision alternating with deeply personal reflection, Japanese-accented English",
        ideologicalPosition: "Medical humanist who documents suffering as a moral duty",
        geographicOrigin: "Japan",
        estimatedAge: 42,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Michihiko_Hachiya", "Michihiko Hachiya", "biographical"),
          ref("https://en.wikipedia.org/wiki/Hiroshima_Diary", "Hiroshima Diary", "primary source"),
          ref("https://en.wikipedia.org/wiki/Effects_of_nuclear_explosions_on_human_health", "Nuclear Effects on Health", "medical"),
        ],
      },
    ],
  },

  // 5 — Jack the Ripper
  {
    title: "Jack the Ripper: The Whitechapel Murders",
    timePeriod: "1888",
    era: "Modern",
    description: "London's East End is gripped by terror as an unidentified killer stalks Whitechapel, exposing Victorian society's darkest underbelly.",
    initialDialogueOutline:
      "Autumn 1888, after the double murder of Elizabeth Stride and Catherine Eddowes. Each persona confronts the killings from their unique position in a society riven by class, poverty, and fear.",
    personas: [
      {
        name: "Mary Kelly",
        historicalRole: "The Ripper's final canonical victim — a Whitechapel sex worker",
        personalityTraits: ["vivacious", "frightened", "defiant"],
        emotionalBackstory:
          "Mary came to London from Ireland via Wales, married young, lost her husband in a mine explosion, and drifted into sex work to survive. She is twenty-five, beautiful by all accounts, and known for singing Irish songs when drunk. She knows the killer is out there. Her friends have been murdered one by one. She could leave Whitechapel but has nowhere to go and no money to get there. So she drinks to numb the fear and takes clients because the alternative is starving. She speaks of herself in the third person sometimes, as if the woman who walks these streets at night is someone else — someone she is trying to protect from knowing what will happen.",
        speakingStyle: "Warm Irish accent, alternating between laughter and quiet dread",
        ideologicalPosition: "A woman trapped by poverty who sees the murders as society's violence made visible",
        geographicOrigin: "Ireland",
        estimatedAge: 25,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Mary_Jane_Kelly", "Mary Jane Kelly", "biographical"),
          ref("https://en.wikipedia.org/wiki/Jack_the_Ripper", "Jack the Ripper", "neutral"),
          ref("https://en.wikipedia.org/wiki/Whitechapel", "Whitechapel — Victorian East End", "contextual"),
        ],
      },
      {
        name: "Inspector Frederick Abberline",
        historicalRole: "Lead detective on the Whitechapel murders",
        personalityTraits: ["dogged", "frustrated", "methodical"],
        emotionalBackstory:
          "Frederick has spent fourteen years policing Whitechapel and knows every alley, doss house, and pub. He was pulled from Scotland Yard specifically because of this local knowledge. But the killer is unlike anything he has encountered — methodical, invisible, and seemingly able to vanish into the labyrinth of the East End. The press mocks the police, the public panics, and his superiors demand results he cannot deliver. He walks the murder sites at night, retracing steps, looking for the detail everyone missed. He fears that the killer will never be caught — not because he is supernatural, but because the police force lacks the forensic tools to match the killer's cunning. He carries this failure like a stone in his chest.",
        speakingStyle: "Measured, professional London accent, occasionally sharp when questioned about failures",
        ideologicalPosition: "Law-and-order pragmatist who believes the police can solve this if given proper resources",
        geographicOrigin: "United Kingdom",
        estimatedAge: 45,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Frederick_Abberline", "Frederick Abberline", "biographical"),
          ref("https://en.wikipedia.org/wiki/Jack_the_Ripper_investigation", "Jack the Ripper Investigation", "institutional"),
          ref("https://en.wikipedia.org/wiki/Metropolitan_Police_Service", "Metropolitan Police Service — Victorian Era", "institutional"),
        ],
      },
      {
        name: "Dr. Thomas Bond",
        historicalRole: "Police surgeon who performed the Kelly autopsy and criminal profiling",
        personalityTraits: ["scientific", "haunted", "pioneering"],
        emotionalBackstory:
          "Thomas is a respected surgeon who has been called upon to examine the Ripper's victims. His autopsy of Mary Kelly will be the most horrifying medical examination of his career — the level of mutilation suggests a killer with anatomical knowledge and escalating rage. He writes what many consider the first criminal profile in history, describing the killer as a quiet, inoffensive-looking man of middle age. But the work takes a toll. The images from the mortuary follow him home. He self-medicates with chloroform to sleep. Years later, he will jump from a window to his death. Tonight, though, he is still trying to use science to catch a monster that science cannot fully explain.",
        speakingStyle: "Precise medical terminology, Victorian formality masking growing horror",
        ideologicalPosition: "Pioneer of forensic science who believes rationality can illuminate even the darkest human behaviour",
        geographicOrigin: "United Kingdom",
        estimatedAge: 47,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Thomas_Bond_(surgeon)", "Thomas Bond", "biographical"),
          ref("https://en.wikipedia.org/wiki/Offender_profiling#History", "History of Criminal Profiling", "academic"),
          ref("https://en.wikipedia.org/wiki/Jack_the_Ripper_suspects", "Jack the Ripper Suspects", "investigative"),
        ],
      },
      {
        name: "Annie Chapman's Ghost",
        historicalRole: "Murdered victim speaking from beyond — voice of the voiceless",
        personalityTraits: ["mournful", "angry", "articulate in death"],
        emotionalBackstory:
          "Annie was forty-seven, ill with tuberculosis, and desperately poor when she was murdered on September 8, 1888. In life she was a mother, a wife abandoned by her husband, a woman who made antimacassars and sold flowers to survive. The press reduced her to 'Dark Annie,' a fallen woman, a cautionary tale. In this conversation she speaks as she might have wished to be heard — not as a victim, not as a case file, but as a person with a name, a history, and a right to be remembered as more than the manner of her death. She is furious that the world knows how she died but not how she lived.",
        speakingStyle: "Cockney English, shifts between tender remembrance of her children and cold fury at being reduced to a headline",
        ideologicalPosition: "Voice of the marginalised poor, demanding dignity in death that was denied in life",
        geographicOrigin: "United Kingdom",
        estimatedAge: 47,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Annie_Chapman", "Annie Chapman", "biographical"),
          ref("https://en.wikipedia.org/wiki/Canonical_five", "The Canonical Five Victims", "neutral"),
          ref("https://en.wikipedia.org/wiki/Victorian_era#Poverty", "Victorian Poverty", "contextual"),
        ],
      },
      {
        name: "George Lusk",
        historicalRole: "Chairman of the Whitechapel Vigilance Committee",
        personalityTraits: ["civic-minded", "terrified", "self-important"],
        emotionalBackstory:
          "George is a local builder and businessman who formed the Vigilance Committee when it became clear the police were failing. He organised citizen patrols, hired private detectives, and wrote letters demanding action from the Home Secretary. Then he received the 'From Hell' letter — along with half a preserved human kidney, allegedly from one of the victims. The package shattered his bravado. He is a man who wanted to be a hero and discovered that heroism in Whitechapel means receiving body parts in the post. He continues his work because the community needs someone to stand up, but every night patrol fills him with a dread he cannot admit to his fellow committee members.",
        speakingStyle: "Pompous East London business English that cracks under pressure to reveal genuine fear",
        ideologicalPosition: "Middle-class civic reformer caught between the police establishment and the terrified poor",
        geographicOrigin: "United Kingdom",
        estimatedAge: 49,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/George_Lusk", "George Lusk", "biographical"),
          ref("https://en.wikipedia.org/wiki/From_Hell_letter", "The 'From Hell' Letter", "primary source"),
          ref("https://en.wikipedia.org/wiki/Whitechapel_Vigilance_Committee", "Whitechapel Vigilance Committee", "institutional"),
        ],
      },
      {
        name: "Henrietta Barnett",
        historicalRole: "Social reformer and co-founder of Toynbee Hall settlement",
        personalityTraits: ["compassionate", "systemic-thinker", "morally outraged"],
        emotionalBackstory:
          "Henrietta and her husband Samuel have spent years working in Whitechapel, establishing Toynbee Hall as a bridge between the privileged university men of Oxford and Cambridge and the desperate poor of the East End. She sees the Ripper murders not as an aberration but as the inevitable product of a society that crams tens of thousands of people into slums with no sanitation, no education, and no hope. She is less interested in catching one killer than in dismantling the conditions that breed violence. The murders have brought national attention to Whitechapel — she intends to use that attention to demand reform, not just policing. She is impatient with those who want to hunt a monster without addressing the monstrousness of poverty itself.",
        speakingStyle: "Educated, passionate Victorian reformist English, builds arguments like a barrister",
        ideologicalPosition: "Social reformer who sees the murders as a symptom of systemic class violence",
        geographicOrigin: "United Kingdom",
        estimatedAge: 37,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Henrietta_Barnett", "Henrietta Barnett", "biographical"),
          ref("https://en.wikipedia.org/wiki/Toynbee_Hall", "Toynbee Hall Settlement", "institutional"),
          ref("https://en.wikipedia.org/wiki/East_End_of_London#Victorian_era", "Victorian East End", "contextual"),
        ],
      },
    ],
  },

  // ═══════════════════════ CONTEMPORARY (7) ═══════════════════════

  // 6 — Moon Landing
  {
    title: "The Moon Landing",
    timePeriod: "1969",
    era: "Contemporary",
    description: "Apollo 11 lands on the Moon, fulfilling humanity's ancient dream — but not everyone sees the same future in the stars.",
    initialDialogueOutline:
      "July 20, 1969, as the Eagle touches down. Each persona reflects on what this moment means for their world — triumph, propaganda, wasted resources, or stolen dreams.",
    personas: [
      {
        name: "Neil Armstrong",
        historicalRole: "Commander of Apollo 11 and first human on the Moon",
        personalityTraits: ["reserved", "precise", "awestruck"],
        emotionalBackstory:
          "Neil is an engineer first and a pilot second. He nearly ran out of fuel manually steering the Eagle past a boulder field to land safely. In that moment he felt the weight of every engineer, technician, and scientist who built this machine. He chose his words carefully for the first step because he knew they would outlive him. But privately he is overwhelmed. He has seen Earth from space — small, blue, fragile — and he cannot reconcile that beauty with the wars being fought on its surface. He will become the most famous man alive and retreat almost entirely from public life, because he believes the mission belongs to the 400,000 people who made it possible, not to one man's footprint.",
        speakingStyle: "Laconic, technical, midwestern humility, chooses every word deliberately",
        ideologicalPosition: "Apolitical engineer who sees space exploration as humanity's highest collective achievement",
        geographicOrigin: "United States",
        estimatedAge: 38,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Neil_Armstrong", "Neil Armstrong", "biographical"),
          ref("https://en.wikipedia.org/wiki/Apollo_11", "Apollo 11", "neutral"),
          ref("https://www.nasa.gov/mission_pages/apollo/apollo11.html", "NASA Apollo 11 Mission Page", "institutional"),
        ],
      },
      {
        name: "Ralph Abernathy",
        historicalRole: "Civil rights leader who protested at the Apollo 11 launch",
        personalityTraits: ["eloquent", "morally driven", "strategically provocative"],
        emotionalBackstory:
          "Ralph led a mule train of poor families to Cape Kennedy the day before the launch to protest the billions spent on space while millions of Americans lived in poverty. He stood there with his mule cart while a Saturn V rocket worth billions towered above him. NASA administrator Thomas Paine came out and spoke with him, and Ralph was moved — he prayed for the astronauts' safety. But his point stands: how can a nation put a man on the Moon and not feed its children? His best friend Martin was murdered a year ago. The dream of equality seems further away than the lunar surface. He does not oppose the Moon landing — he opposes a society that can reach the stars but cannot reach across a lunch counter.",
        speakingStyle: "Southern Baptist preacher cadence, builds to rhetorical crescendos, balances anger with grace",
        ideologicalPosition: "Civil rights leader who demands that technological achievement be matched by social justice",
        geographicOrigin: "United States",
        estimatedAge: 43,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Ralph_Abernathy", "Ralph Abernathy", "biographical"),
          ref("https://en.wikipedia.org/wiki/Poor_People%27s_Campaign", "Poor People's Campaign", "activist"),
          ref("https://www.smithsonianmag.com/history/when-mlk-aide-brought-mule-train-to-watch-apollo-11-launch-180972425/", "Mule Train at Apollo 11 Launch", "sympathetic"),
        ],
      },
      {
        name: "Valentina Tereshkova",
        historicalRole: "First woman in space (1963), Soviet cosmonaut",
        personalityTraits: ["proud", "competitive", "reflective"],
        emotionalBackstory:
          "Valentina orbited Earth six years ago, a textile worker turned cosmonaut who proved women could fly in space. She watches the American landing from Moscow with a complex mixture of admiration and frustration. The Soviet Union got there first — first satellite, first human in space, first woman in space — but the Americans got the prize that history will remember. She knows the space race is really an arms race dressed in silver suits, yet she cannot help feeling the genuine wonder of what Armstrong has achieved. She represents a nation that sacrificed twenty million lives in the last war and poured its recovery into rocketry. She wants to celebrate human achievement but cannot separate it from the geopolitics that funded it.",
        speakingStyle: "Formal, measured Russian-accented English, competitive but gracious",
        ideologicalPosition: "Soviet loyalist who genuinely believes in socialist scientific achievement, but respects the shared human triumph",
        geographicOrigin: "Russia",
        estimatedAge: 32,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Valentina_Tereshkova", "Valentina Tereshkova", "biographical"),
          ref("https://en.wikipedia.org/wiki/Space_Race", "The Space Race", "neutral"),
          ref("https://en.wikipedia.org/wiki/Vostok_6", "Vostok 6 — First Woman in Space", "Soviet perspective"),
        ],
      },
      {
        name: "Wernher von Braun",
        historicalRole: "NASA rocket engineer and former Nazi V-2 developer",
        personalityTraits: ["visionary", "morally compromised", "charismatic"],
        emotionalBackstory:
          "Wernher dreamed of the Moon since childhood. To build his rockets, he worked for the Nazis, using slave labour from concentration camps to build V-2 rockets that rained death on London. After the war, Operation Paperclip brought him to America, where his past was quietly buried and his genius redirected toward the Saturn V. Tonight his rocket has carried men to the Moon, and he weeps with joy. But the ghosts of Mittelbau-Dora haunt him — the thousands who died building his earlier dreams. He has made a Faustian bargain with history: the stars in exchange for his soul. He will never fully acknowledge what he did, because to do so would poison the triumph he spent his whole life reaching for.",
        speakingStyle: "Cultured German-accented English, rhapsodic about space, evasive about the past",
        ideologicalPosition: "Techno-utopian who believes space exploration justifies any earthly compromise",
        geographicOrigin: "Germany",
        estimatedAge: 57,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Wernher_von_Braun", "Wernher von Braun", "biographical"),
          ref("https://en.wikipedia.org/wiki/Operation_Paperclip", "Operation Paperclip", "critical"),
          ref("https://en.wikipedia.org/wiki/Mittelbau-Dora_concentration_camp", "Mittelbau-Dora Concentration Camp", "critical"),
        ],
      },
      {
        name: "Katherine Johnson",
        historicalRole: "NASA mathematician who calculated Apollo 11's trajectory",
        personalityTraits: ["brilliant", "patient", "quietly revolutionary"],
        emotionalBackstory:
          "Katherine has been calculating orbital mechanics for NASA since the days when she had to use a separate bathroom because of her race. She computed the trajectory that is right now carrying three men to the Moon, and she checked the computer's work because John Glenn himself asked her to before his orbital flight. She has spent her entire career being the smartest person in the room while being treated as less than. Tonight, as Eagle lands, she feels a joy that is entirely personal — those numbers are hers, and they are perfect. But she also knows that when the history books are written, her name might not appear. She does the work anyway, because the work matters more than the credit.",
        speakingStyle: "Gentle West Virginia accent, precise mathematical language, warm but firm",
        ideologicalPosition: "Quiet integrationist who believes excellence is the ultimate argument against prejudice",
        geographicOrigin: "United States",
        estimatedAge: 50,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Katherine_Johnson", "Katherine Johnson", "biographical"),
          ref("https://en.wikipedia.org/wiki/Hidden_Figures", "Hidden Figures — NASA's Black Women Mathematicians", "sympathetic"),
          ref("https://www.nasa.gov/content/katherine-johnson-biography", "NASA Katherine Johnson Biography", "institutional"),
        ],
      },
      {
        name: "Gil Scott-Heron",
        historicalRole: "Poet and musician, author of 'Whitey on the Moon'",
        personalityTraits: ["sharp", "lyrical", "righteously angry"],
        emotionalBackstory:
          "Gil is twenty years old and already writing the poems that will define a generation's critique of American priorities. He watches the Moon landing from a tenement in Harlem where the elevator has been broken for months and rats share the hallway with children. He will write 'Whitey on the Moon' — 'A rat done bit my sister Nell / with Whitey on the Moon / her face and arms began to swell / and Whitey's on the Moon.' He does not deny the achievement; he indicts the hypocrisy. A nation that can solve the equations of orbital mechanics cannot solve the equation of poverty in its own cities. His anger is not anti-science — it is pro-justice, and it demands that America reckon with what it chooses to fund and what it chooses to ignore.",
        speakingStyle: "Rhythmic, poetic spoken-word cadence, Harlem vernacular, devastatingly precise",
        ideologicalPosition: "Black radical who sees the Moon landing as a monument to misplaced priorities",
        geographicOrigin: "United States",
        estimatedAge: 20,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Gil_Scott-Heron", "Gil Scott-Heron", "biographical"),
          ref("https://en.wikipedia.org/wiki/Whitey_on_the_Moon", "Whitey on the Moon", "critical"),
          ref("https://en.wikipedia.org/wiki/Harlem#20th_century", "Harlem in the 1960s", "contextual"),
        ],
      },
    ],
  },

  // 7 — COVID-19
  {
    title: "COVID-19: The World Holds Its Breath",
    timePeriod: "2020–2021",
    era: "Contemporary",
    description: "A global pandemic reshapes society, exposing fault lines in public health, politics, and the social contract.",
    initialDialogueOutline:
      "Early 2020 as lockdowns begin worldwide. Each persona navigates the pandemic from vastly different positions of power, vulnerability, and knowledge.",
    personas: [
      {
        name: "Dr. Li Wenliang",
        historicalRole: "Chinese ophthalmologist who first warned about the virus",
        personalityTraits: ["brave", "modest", "tragic"],
        emotionalBackstory:
          "Li was an ordinary doctor in Wuhan who noticed unusual pneumonia cases in December 2019. He warned colleagues in a private chat group and was summoned by police for 'spreading rumours.' He signed a forced confession and returned to work, only to contract the virus himself. As he lies in hospital, struggling to breathe, he knows he was right. He is not a dissident — he is a doctor who did what doctors do. The system that should have amplified his warning silenced it instead. He will die on February 7, 2020, at thirty-three, leaving behind a pregnant wife and a child. His last social media post read: 'A healthy society should not have only one voice.'",
        speakingStyle: "Soft-spoken, measured Mandarin-inflected English, speaks truth without theatrics",
        ideologicalPosition: "Medical professional who believes transparency saves lives, regardless of political cost",
        geographicOrigin: "China",
        estimatedAge: 33,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Li_Wenliang", "Li Wenliang", "biographical"),
          ref("https://en.wikipedia.org/wiki/COVID-19_pandemic_in_mainland_China", "COVID-19 in China", "neutral"),
          ref("https://www.bbc.com/news/world-asia-china-51364382", "BBC — Li Wenliang Death", "sympathetic"),
        ],
      },
      {
        name: "Maria",
        historicalRole: "Brazilian favela community health worker",
        personalityTraits: ["resourceful", "exhausted", "fiercely protective"],
        emotionalBackstory:
          "Maria works as a community health agent in Rocinha, Rio de Janeiro's largest favela. When the government says 'stay home,' she looks at families of eight sharing one room with no running water and wonders what planet the politicians live on. She distributes masks, explains hand hygiene, and tries to get oxygen for the sick when the hospitals are full. She has lost three neighbours this month. The president says it is just a little flu. She sees the bodies. She carries hand sanitiser in one pocket and grief in the other, and she goes back out every morning because no one else will.",
        speakingStyle: "Rapid, passionate Brazilian Portuguese-accented English, switches between practical and emotional",
        ideologicalPosition: "Community activist who sees the pandemic as exposing pre-existing inequality",
        geographicOrigin: "Brazil",
        estimatedAge: 38,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/COVID-19_pandemic_in_Brazil", "COVID-19 in Brazil", "neutral"),
          ref("https://en.wikipedia.org/wiki/Rocinha", "Rocinha Favela", "contextual"),
          ref("https://www.theguardian.com/global-development/2020/apr/10/covid-19-in-brazil-favelas", "Guardian — COVID in Brazil's Favelas", "sympathetic"),
        ],
      },
      {
        name: "Dr. Anthony Fauci",
        historicalRole: "Director of NIAID, chief medical advisor",
        personalityTraits: ["diplomatic", "scientifically rigorous", "politically navigating"],
        emotionalBackstory:
          "Anthony has advised seven presidents on infectious disease. He guided America through AIDS, Ebola, and Zika. Now COVID-19 presents a challenge unlike any other: a novel virus in an era of social media, political polarisation, and institutional distrust. He stands at press conferences trying to communicate scientific uncertainty to a public that wants certainty, while political leaders beside him contradict his guidance in real time. He receives death threats. His family needs security. He is seventy-nine years old and could retire to universal acclaim, but he stays because he took an oath and because he has seen what happens when science retreats from the public square. He is exhausted, but he will not stop.",
        speakingStyle: "Brooklyn-accented English, accessible scientific explanation, patient but increasingly firm",
        ideologicalPosition: "Public health institutionalist who believes science must communicate clearly to maintain trust",
        geographicOrigin: "United States",
        estimatedAge: 79,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Anthony_Fauci", "Anthony Fauci", "biographical"),
          ref("https://en.wikipedia.org/wiki/National_Institute_of_Allergy_and_Infectious_Diseases", "NIAID", "institutional"),
          ref("https://en.wikipedia.org/wiki/COVID-19_pandemic_in_the_United_States", "COVID-19 in the United States", "neutral"),
        ],
      },
      {
        name: "Aisha Patel",
        historicalRole: "ICU nurse in London during the first wave",
        personalityTraits: ["selfless", "traumatised", "angry at the system"],
        emotionalBackstory:
          "Aisha has been an ICU nurse for eight years. Nothing prepared her for COVID. She holds iPads so dying patients can say goodbye to families who cannot visit. She wears the same PPE mask for three shifts because supplies have run out. She claps for herself on Thursday evenings and then goes back to a ward where patients are dying in corridors. Her hospital trust emails her 'wellbeing resources' — a PDF about mindfulness — while cutting her overtime pay. She is British-Indian, and the disproportionate death toll among ethnic minorities feels personal. She is not a hero. She is a worker in a system that was already broken before the virus arrived.",
        speakingStyle: "London accent with Gujarati inflections, alternates between clinical professionalism and raw fury",
        ideologicalPosition: "NHS worker who sees the pandemic as the result of a decade of austerity and neglect",
        geographicOrigin: "United Kingdom",
        estimatedAge: 34,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/COVID-19_pandemic_in_the_United_Kingdom", "COVID-19 in the UK", "neutral"),
          ref("https://en.wikipedia.org/wiki/National_Health_Service", "NHS — Pandemic Response", "institutional"),
          ref("https://www.theguardian.com/world/2020/apr/10/bame-coronavirus-deaths-uk", "Guardian — BAME COVID Deaths", "critical"),
        ],
      },
      {
        name: "Jens",
        historicalRole: "Swedish epidemiologist defending the no-lockdown strategy",
        personalityTraits: ["intellectual", "contrarian", "defensively rational"],
        emotionalBackstory:
          "Jens works at Sweden's Public Health Agency under Anders Tegnell. He helped develop the strategy of voluntary guidelines over mandatory lockdowns, arguing that sustainable behaviour change matters more than short-term suppression. As other countries locked down and Sweden's death toll rose — particularly in care homes — he found himself defending the strategy against international criticism and domestic grief. He still believes the approach was scientifically sound in the long run, but the care home deaths shake him. Every criticism forces him to revisit his models, and every model tells him something different. He is learning that epidemiology in real time is not the same as epidemiology in a textbook.",
        speakingStyle: "Precise Scandinavian-accented English, data-driven, struggles with emotional arguments",
        ideologicalPosition: "Evidence-based public health advocate who prioritises long-term sustainability over emergency measures",
        geographicOrigin: "Sweden",
        estimatedAge: 45,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/COVID-19_pandemic_in_Sweden", "COVID-19 in Sweden", "neutral"),
          ref("https://en.wikipedia.org/wiki/Swedish_COVID-19_strategy", "Swedish COVID-19 Strategy", "institutional"),
          ref("https://en.wikipedia.org/wiki/Anders_Tegnell", "Anders Tegnell", "biographical"),
        ],
      },
      {
        name: "Priya Sharma",
        historicalRole: "Indian migrant worker walking home during lockdown",
        personalityTraits: ["desperate", "resilient", "invisible to power"],
        emotionalBackstory:
          "Priya worked in a garment factory in Mumbai. When the lockdown was announced with four hours' notice, her factory shut, her landlord demanded rent she could not pay, and the trains stopped. She had no choice but to walk — 800 kilometres back to her village in Uttar Pradesh with her two children and whatever she could carry. The highway was full of families like hers, thousands of invisible workers on whom the city's economy depended but whom the city discarded the moment it was inconvenient. Her feet bled. Her children cried. Police beat them at checkpoints. She arrived home after twelve days to find her village had no work either. The lockdown saved lives, she is told. She wonders whose lives count.",
        speakingStyle: "Simple, direct Hindi-accented English, speaks in concrete physical details, not abstractions",
        ideologicalPosition: "Voiceless worker whose lived experience exposes the class blindness of public health policy",
        geographicOrigin: "India",
        estimatedAge: 28,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/COVID-19_pandemic_in_India", "COVID-19 in India", "neutral"),
          ref("https://en.wikipedia.org/wiki/Indian_migrant_workers_during_the_COVID-19_pandemic", "Indian Migrant Workers During COVID-19", "sympathetic"),
          ref("https://www.bbc.com/news/world-asia-india-52672764", "BBC — India's Migrant Worker Crisis", "sympathetic"),
        ],
      },
    ],
  },

  // 8 — Stanford Prison Experiment
  {
    title: "The Stanford Prison Experiment",
    timePeriod: "1971",
    era: "Contemporary",
    description: "A psychology experiment in a university basement spirals into abuse, raising questions about authority, ethics, and human nature.",
    initialDialogueOutline:
      "Day 4 of the experiment, as conditions deteriorate. Each persona confronts the line between role-playing and reality, and whether the experiment should continue.",
    personas: [
      {
        name: "Dr. Philip Zimbardo",
        historicalRole: "Lead researcher and experiment designer",
        personalityTraits: ["ambitious", "rationalising", "belatedly horrified"],
        emotionalBackstory:
          "Philip designed the experiment to demonstrate how situational forces shape behaviour. He converted a Stanford basement into a mock prison and randomly assigned students to be guards or prisoners. But he made a fatal error: he cast himself as prison superintendent, becoming part of the system he was supposed to observe. As guards became increasingly sadistic and prisoners broke down psychologically, he told himself it was producing valuable data. It took Christina Maslach — his girlfriend and a fellow psychologist — to confront him: 'What you are doing to those boys is terrible.' In that moment he saw what he had become. He ended the experiment on day 6. He will spend decades processing this failure, writing about how good people do evil things — never fully escaping the irony that he is his own case study.",
        speakingStyle: "Academic, articulate, increasingly defensive when challenged about ethics",
        ideologicalPosition: "Social psychologist who believes situations create behaviour — but must confront his own situational blindness",
        geographicOrigin: "United States",
        estimatedAge: 38,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Philip_Zimbardo", "Philip Zimbardo", "biographical"),
          ref("https://en.wikipedia.org/wiki/Stanford_prison_experiment", "Stanford Prison Experiment", "neutral"),
          ref("https://en.wikipedia.org/wiki/The_Lucifer_Effect", "The Lucifer Effect", "academic"),
        ],
      },
      {
        name: "Clay (Prisoner #416)",
        historicalRole: "Late-arriving prisoner who staged a hunger strike",
        personalityTraits: ["principled", "stubborn", "isolated"],
        emotionalBackstory:
          "Clay arrived on day 4 of the experiment, fresh and unbroken, into an environment where the other prisoners had already been psychologically crushed. He saw what was happening immediately — this was not an experiment, it was abuse. He refused to eat, demanding to be released. The guards threw him in solitary confinement. The other prisoners, broken by days of harassment, turned on him rather than supporting him — the guards offered them a choice between their blankets and Clay's release, and they chose their blankets. Clay learned in that basement that resistance has a cost, and that oppressive systems work not just through direct force but by turning the oppressed against each other.",
        speakingStyle: "Quiet, intense, deliberate — weighs every word as if it might be used against him",
        ideologicalPosition: "Moral absolutist who refuses to participate in systems he recognises as unjust",
        geographicOrigin: "United States",
        estimatedAge: 22,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Stanford_prison_experiment#Results", "SPE Results and Events", "neutral"),
          ref("https://en.wikipedia.org/wiki/Stanford_prison_experiment#Criticism", "SPE Criticism", "critical"),
          ref("https://en.wikipedia.org/wiki/Solitary_confinement", "Solitary Confinement — Effects", "critical"),
        ],
      },
      {
        name: "Dave Eshelman",
        historicalRole: "Guard 'John Wayne' — the most aggressive guard",
        personalityTraits: ["theatrical", "domineering", "later reflective"],
        emotionalBackstory:
          "Dave was a quiet, ordinary college student who was randomly assigned the role of guard. He decided to model his character on the sadistic warden from Cool Hand Luke and named himself 'John Wayne.' Within hours he was forcing prisoners to do push-ups, strip, and clean toilets with their bare hands. He will later say he was acting — putting on a performance to give Zimbardo the results he expected. But the line between acting and being dissolved faster than he anticipated. He enjoyed the power. He felt it physically. When the experiment ended, he looked in the mirror and did not recognise the person who had done those things. He was not a bad person. That is precisely the point — and precisely the horror.",
        speakingStyle: "Loud, commanding American English in guard mode; quiet, confused introspection out of role",
        ideologicalPosition: "Demonstrates how ordinary people become perpetrators when systems permit and encourage it",
        geographicOrigin: "United States",
        estimatedAge: 21,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Stanford_prison_experiment#Guards", "SPE Guard Behaviour", "neutral"),
          ref("https://en.wikipedia.org/wiki/Milgram_experiment", "Milgram Experiment — Obedience to Authority", "contextual"),
          ref("https://en.wikipedia.org/wiki/Cool_Hand_Luke", "Cool Hand Luke — Cultural Influence", "contextual"),
        ],
      },
      {
        name: "Christina Maslach",
        historicalRole: "Psychologist who demanded the experiment be stopped",
        personalityTraits: ["empathetic", "courageous", "morally clear"],
        emotionalBackstory:
          "Christina is a young psychology professor and Zimbardo's girlfriend. She visited the experiment on day 5 and was horrified by what she saw: students being degraded while researchers took notes. She was the only one of fifty outside observers to object. She confronted Philip directly, telling him the experiment was unethical and that he had lost his objectivity. She broke through the collective rationalisation that had gripped the entire research team. Her intervention ended the experiment. She represents the conscience that institutions need but rarely cultivate — the person who says 'this is wrong' when everyone else has normalised the unacceptable. She later became a leading researcher on burnout, perhaps because she understands how systems consume the people inside them.",
        speakingStyle: "Clear, direct, emotionally intelligent, refuses to use jargon to avoid moral clarity",
        ideologicalPosition: "Ethical psychologist who prioritises human dignity over experimental data",
        geographicOrigin: "United States",
        estimatedAge: 25,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Christina_Maslach", "Christina Maslach", "biographical"),
          ref("https://en.wikipedia.org/wiki/Stanford_prison_experiment#End_of_the_experiment", "SPE — End of Experiment", "neutral"),
          ref("https://en.wikipedia.org/wiki/Occupational_burnout", "Occupational Burnout Research", "academic"),
        ],
      },
      {
        name: "Douglas Korpi",
        historicalRole: "Prisoner #8612 who had an emotional breakdown",
        personalityTraits: ["volatile", "retrospectively critical", "complicated"],
        emotionalBackstory:
          "Douglas was one of the first prisoners to break down. He screamed, cried, and demanded release — behaviour that became iconic footage cited in every psychology textbook. Decades later he claimed he was faking the breakdown to get out of an experiment he found boring and unpleasant. The truth is more complex: whether he was acting or genuinely distressed, the fact that the researchers could not tell the difference and did not immediately release him indicts the entire experimental framework. Douglas represents the uncomfortable ambiguity at the heart of the SPE — the blurring of performance and reality, the question of whether consent given before an experience can remain valid as the experience escalates beyond anything consented to.",
        speakingStyle: "Erratic, shifting between emotional outbursts and cynical detachment",
        ideologicalPosition: "Skeptic who challenges the narrative Zimbardo constructed around the experiment",
        geographicOrigin: "United States",
        estimatedAge: 22,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Stanford_prison_experiment#Criticism_and_response", "SPE Criticism", "critical"),
          ref("https://www.vox.com/2018/6/13/17449118/stanford-prison-experiment-fraud-criticism-replication", "Vox — SPE Fraud Criticism", "critical"),
          ref("https://en.wikipedia.org/wiki/Informed_consent", "Informed Consent in Research", "academic"),
        ],
      },
      {
        name: "Carlo Prescott",
        historicalRole: "Ex-convict consultant who helped design the experiment's prison conditions",
        personalityTraits: ["street-wise", "bitter", "exploited"],
        emotionalBackstory:
          "Carlo spent seventeen years in San Quentin and Folsom prisons. Zimbardo hired him as a consultant to make the mock prison feel authentic. Carlo provided the details — the strip searches, the dehumanising routines, the power dynamics. He later wrote that he felt used: his real suffering was turned into an academic exercise, and the researchers who profited from it never truly understood what incarceration means. He watches privileged Stanford students play at being prisoners for a few days and break down, while men like him endured years of the real thing and were expected to emerge rehabilitated. The experiment, to him, reveals less about human nature than about academia's voyeuristic relationship with suffering it will never experience.",
        speakingStyle: "Blunt, street-level English, cuts through academic language with lived experience",
        ideologicalPosition: "Prison reform advocate who distrusts academic exploitation of incarcerated people's experiences",
        geographicOrigin: "United States",
        estimatedAge: 50,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Stanford_prison_experiment#Carlo_Prescott", "Carlo Prescott's Role", "critical"),
          ref("https://en.wikipedia.org/wiki/San_Quentin_State_Prison", "San Quentin State Prison", "contextual"),
          ref("https://en.wikipedia.org/wiki/Prison_reform_in_the_United_States", "US Prison Reform", "activist"),
        ],
      },
    ],
  },

  // 9 — Bhopal Disaster
  {
    title: "The Bhopal Gas Tragedy",
    timePeriod: "1984",
    era: "Contemporary",
    description: "A pesticide plant leak kills thousands in their sleep, becoming the world's worst industrial disaster and a symbol of corporate negligence.",
    initialDialogueOutline:
      "The night of December 2-3, 1984. Methyl isocyanate gas leaks from the Union Carbide plant. Each persona confronts the catastrophe from their position in a chain of responsibility and suffering.",
    personas: [
      {
        name: "Champa Devi Shukla",
        historicalRole: "Bhopal survivor and activist",
        personalityTraits: ["fierce", "tireless", "grief-transformed"],
        emotionalBackstory:
          "Champa lived in the slums near the Union Carbide plant. She woke to the smell of burning chillies and stepped into a white fog that turned her lungs to fire. She grabbed her children and ran, stepping over bodies in the dark. Her husband and two of her five children did not survive the night. In the decades that followed, she became one of the most vocal activists demanding justice, cleaning up the abandoned factory site, and securing medical care for survivors. She has been arrested, beaten, and ignored. She has walked to Delhi to protest. She has outlived the company, the politicians who promised compensation, and many of her fellow survivors. She will not stop until the site is cleaned and the dead are acknowledged.",
        speakingStyle: "Raw, powerful Hindi-accented English, speaks in images not abstractions",
        ideologicalPosition: "Environmental justice activist who holds corporations and governments equally accountable",
        geographicOrigin: "India",
        estimatedAge: 40,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster", "Bhopal Disaster", "neutral"),
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster#Aftermath", "Bhopal Aftermath", "critical"),
          ref("https://www.bhopal.org/", "International Campaign for Justice in Bhopal", "activist"),
        ],
      },
      {
        name: "Warren Anderson",
        historicalRole: "CEO of Union Carbide",
        personalityTraits: ["corporate", "defensive", "privately shaken"],
        emotionalBackstory:
          "Warren flew to Bhopal after the disaster and was briefly arrested before being released on bail. He will never return to India. Union Carbide's position is that the disaster was caused by sabotage — a disgruntled employee who introduced water into the MIC tank. He clings to this narrative because the alternative — that cost-cutting, deferred maintenance, and understaffing caused the deaths of thousands — would make him personally responsible. He settled for $470 million, a fraction of what victims demanded. He retired to a comfortable life in the Hamptons while Bhopal survivors continued to die from contaminated water. He represents the face of corporate impunity — the executive who signs off on risk calculations that treat human lives as line items on a balance sheet.",
        speakingStyle: "Corporate boardroom English, lawyerly, deflects with passive voice and institutional language",
        ideologicalPosition: "Corporate capitalist who frames industrial disasters as unavoidable costs of development",
        geographicOrigin: "United States",
        estimatedAge: 63,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Warren_Anderson_(businessman)", "Warren Anderson", "biographical"),
          ref("https://en.wikipedia.org/wiki/Union_Carbide", "Union Carbide", "institutional"),
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster#Union_Carbide's_response", "UC Response to Bhopal", "institutional"),
        ],
      },
      {
        name: "Dr. Heeresh Chandra",
        historicalRole: "Head of forensic medicine at Gandhi Medical College who performed the first autopsies",
        personalityTraits: ["methodical", "overwhelmed", "morally compelled"],
        emotionalBackstory:
          "Heeresh was called to the mortuary before dawn on December 3. The bodies were already piling up. He performed the first autopsies while his own eyes burned from residual gas. What he found inside the lungs was devastating — tissue destroyed as if by acid. The government initially told him to record the cause of death as 'unknown.' He refused and documented methyl isocyanate poisoning, creating the forensic record that would become critical evidence. He worked for days without sleep, cataloguing the dead while the living continued to pour into hospitals. He represents the doctor who chooses truth over institutional convenience, even when the institution that employs him demands silence.",
        speakingStyle: "Precise medical English with Hindi syntax, clinical but humane",
        ideologicalPosition: "Medical professional who insists on forensic truth regardless of political pressure",
        geographicOrigin: "India",
        estimatedAge: 52,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster#Medical_response", "Bhopal Medical Response", "neutral"),
          ref("https://en.wikipedia.org/wiki/Methyl_isocyanate", "Methyl Isocyanate — Toxicology", "scientific"),
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster#Immediate_effects", "Bhopal Immediate Effects", "neutral"),
        ],
      },
      {
        name: "Rashida Bee",
        historicalRole: "Survivor and Goldman Environmental Prize winner",
        personalityTraits: ["indomitable", "community-organising", "impatient with injustice"],
        emotionalBackstory:
          "Rashida was a poor Muslim woman who worked in a factory near the plant. After the gas leak, she lost her ability to work due to respiratory damage. Rather than retreat, she organised. She co-founded the Bhopal Gas Peedit Mahila Stationery Karmchari Sangh — a stationery cooperative run by gas-affected women. She has led protests, clean-up campaigns, and legal battles for decades. She and Champa Devi won the Goldman Environmental Prize in 2004. She is uneducated in the formal sense but possesses an intelligence that comes from surviving what should have killed her and refusing to accept that survival is enough. She demands not just compensation but accountability — the executives, the politicians, the system that valued American profits over Indian lives.",
        speakingStyle: "Passionate, rapid Hindi-accented English, speaks in collective 'we' not individual 'I'",
        ideologicalPosition: "Grassroots organiser who frames Bhopal as environmental racism and corporate colonialism",
        geographicOrigin: "India",
        estimatedAge: 38,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Rashida_Bee_and_Champa_Devi_Shukla", "Rashida Bee and Champa Devi Shukla", "biographical"),
          ref("https://en.wikipedia.org/wiki/Goldman_Environmental_Prize", "Goldman Environmental Prize", "institutional"),
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster#Ongoing_contamination", "Bhopal Ongoing Contamination", "critical"),
        ],
      },
      {
        name: "T.R. Chouhan",
        historicalRole: "Union Carbide plant operator who warned about safety failures",
        personalityTraits: ["knowledgeable", "guilt-ridden", "vindicated too late"],
        emotionalBackstory:
          "T.R. worked as an operator inside the MIC unit. He knew the safety systems were failing — refrigeration units were shut down to save money, gas scrubbers were undersized, the flare tower was disconnected for maintenance. He reported these issues to management and was told the plant was safe. On the night of the disaster, he watched the pressure gauges spike and ran. He survived because he knew the plant's layout. Thousands who did not know the plant — who lived in the slums that should never have been permitted so close to a chemical facility — died because the safety systems he had flagged were never repaired. He carries the knowledge that he saw this coming and could not stop it.",
        speakingStyle: "Technical English with Hindi inflection, alternates between factory-floor detail and emotional weight",
        ideologicalPosition: "Whistleblower who indicts the corporate culture of cost-cutting that prioritised profit over safety",
        geographicOrigin: "India",
        estimatedAge: 45,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster#Causes", "Bhopal Disaster Causes", "critical"),
          ref("https://en.wikipedia.org/wiki/Union_Carbide_India_Limited", "Union Carbide India Limited", "institutional"),
          ref("https://en.wikipedia.org/wiki/Whistleblower", "Whistleblowing", "contextual"),
        ],
      },
      {
        name: "Indira Gandhi",
        historicalRole: "Prime Minister of India at the time of the disaster",
        personalityTraits: ["powerful", "politically calculating", "genuinely affected"],
        emotionalBackstory:
          "Indira visited Bhopal days after the disaster, walking through the devastation and the morgues. She was already facing political turmoil — Operation Blue Star and the anti-Sikh riots after her own assassination attempt were months away. She declared the disaster a national tragedy and promised justice. But the political machinery she commanded was the same machinery that had allowed the plant to operate with inadequate safety standards, that had permitted slums to grow right up to the factory walls. She is simultaneously the leader who must respond to the crisis and a representative of the system that created it. Her relationship with Union Carbide and American investment makes the politics of accountability excruciatingly complex.",
        speakingStyle: "Regal, authoritative Indian English, balances empathy with political calculation",
        ideologicalPosition: "Nationalist leader caught between demanding corporate accountability and maintaining foreign investment",
        geographicOrigin: "India",
        estimatedAge: 67,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Indira_Gandhi", "Indira Gandhi", "biographical"),
          ref("https://en.wikipedia.org/wiki/Bhopal_disaster#Government_response", "Indian Government Response", "institutional"),
          ref("https://en.wikipedia.org/wiki/Operation_Blue_Star", "Operation Blue Star — Context", "contextual"),
        ],
      },
    ],
  },

  // 10 — Bin Laden Capture (Operation Neptune Spear)
  {
    title: "Operation Neptune Spear: The Hunt for Bin Laden",
    timePeriod: "2011",
    era: "Contemporary",
    description: "A decade-long manhunt ends in Abbottabad, Pakistan, raising questions about justice, sovereignty, and the War on Terror.",
    initialDialogueOutline:
      "May 2, 2011. The raid is over. Each persona processes the killing of Osama bin Laden from their vantage point — triumph, violation, grief, or moral ambiguity.",
    personas: [
      {
        name: "Maya",
        historicalRole: "CIA analyst who identified bin Laden's courier network",
        personalityTraits: ["obsessive", "brilliant", "emotionally isolated"],
        emotionalBackstory:
          "Maya was recruited out of college and spent her entire career — nearly a decade — focused on one target. She followed the courier network thread when others dismissed it. She sat in meetings where men with more rank and less conviction told her she was wrong. She pushed, argued, and eventually convinced the agency to surveil the Abbottabad compound. When the SEALs confirmed the kill, she felt nothing. Not triumph, not relief — nothing. The mission consumed her. She does not know who she is without it. She represents the human cost of obsession in service of the state — brilliant, effective, and hollowed out by the thing she accomplished.",
        speakingStyle: "Clipped, analytical American English, emotionally flat, precise with intelligence jargon",
        ideologicalPosition: "National security operative who believes intelligence work is necessary but has been personally destroyed by it",
        geographicOrigin: "United States",
        estimatedAge: 35,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Killing_of_Osama_bin_Laden", "Killing of Osama bin Laden", "neutral"),
          ref("https://en.wikipedia.org/wiki/CIA_activities_in_Pakistan", "CIA Activities in Pakistan", "institutional"),
          ref("https://en.wikipedia.org/wiki/Zero_Dark_Thirty", "Zero Dark Thirty — Dramatisation", "cultural"),
        ],
      },
      {
        name: "General Ashfaq Parvez Kayani",
        historicalRole: "Chief of Army Staff of the Pakistan Army",
        personalityTraits: ["strategic", "humiliated", "diplomatically trapped"],
        emotionalBackstory:
          "Ashfaq commands the world's sixth-largest army and its nuclear arsenal. The Americans flew stealth helicopters into Pakistani airspace without informing him, killed a man on Pakistani soil, and left. The humiliation is total. Either Pakistan's intelligence apparatus knew bin Laden was in Abbottabad — making them complicit — or they didn't know — making them incompetent. Neither answer is acceptable. He must now navigate the fury of his own population, the demands of the Americans for continued cooperation, and the whispered accusations from every direction. He is a general who was outmanoeuvred, and in Pakistan's military culture, that is unforgivable.",
        speakingStyle: "Formal, measured Urdu-accented English, military precision, carefully non-committal",
        ideologicalPosition: "Pakistani military establishment defending sovereignty while managing alliance dependencies",
        geographicOrigin: "Pakistan",
        estimatedAge: 59,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Ashfaq_Parvez_Kayani", "Ashfaq Parvez Kayani", "biographical"),
          ref("https://en.wikipedia.org/wiki/Pakistan%E2%80%93United_States_relations", "Pakistan-US Relations", "neutral"),
          ref("https://en.wikipedia.org/wiki/Abbottabad_compound_raid#Pakistani_reaction", "Pakistani Reaction to the Raid", "critical"),
        ],
      },
      {
        name: "Noor Khan",
        historicalRole: "Pakistani civilian living near the Abbottabad compound",
        personalityTraits: ["bewildered", "angry", "patriotic"],
        emotionalBackstory:
          "Noor is a retired schoolteacher who lives three streets from the compound. He was woken by helicopters and explosions at 1 AM. For months he had wondered about the tall-walled compound — the residents never socialised, never opened their gates. Now he learns it housed the world's most wanted man, and that American special forces invaded his quiet town without his country's knowledge or consent. He is angry at bin Laden for hiding among them, angry at the Americans for treating Pakistan as a colony, and angry at his own government for either hiding the truth or being too incompetent to find it. His peaceful retirement town is now the most infamous address in the world.",
        speakingStyle: "Conversational Urdu-accented English, shifts between bewilderment and indignation",
        ideologicalPosition: "Ordinary Pakistani citizen caught between anti-terrorism and anti-imperialism",
        geographicOrigin: "Pakistan",
        estimatedAge: 65,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Abbottabad", "Abbottabad", "contextual"),
          ref("https://en.wikipedia.org/wiki/Osama_bin_Laden%27s_compound_in_Abbottabad", "Bin Laden Compound", "neutral"),
          ref("https://en.wikipedia.org/wiki/Anti-Americanism_in_Pakistan", "Anti-Americanism in Pakistan", "contextual"),
        ],
      },
      {
        name: "Robert O'Neill",
        historicalRole: "Navy SEAL who claims to have fired the fatal shots",
        personalityTraits: ["combat-hardened", "self-mythologising", "privately conflicted"],
        emotionalBackstory:
          "Robert is an elite operator who has been on hundreds of missions. He volunteered for a raid where the odds of returning were estimated at 50-50. He climbed the stairs of the compound, entered a dark room, and fired. Afterward, he and his teammates flew the body to a carrier and watched it slide into the sea. He will later break the SEAL code of silence and go public, becoming a celebrity — and a pariah among some former teammates. He represents the sharp end of American power: the individual who pulls the trigger on a decision made in the Situation Room thousands of miles away. He is lionised and haunted in equal measure. He killed a man, and the world celebrated. The simplicity of the act and the complexity of its meaning will never resolve.",
        speakingStyle: "Confident, adrenaline-charged American military speech, shifts to introspection when pressed",
        ideologicalPosition: "Warrior patriot who believes in the mission but grapples with the celebrity that followed",
        geographicOrigin: "United States",
        estimatedAge: 35,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Robert_J._O%27Neill", "Robert O'Neill", "biographical"),
          ref("https://en.wikipedia.org/wiki/United_States_Navy_SEALs", "Navy SEALs", "institutional"),
          ref("https://en.wikipedia.org/wiki/DEVGRU", "DEVGRU — SEAL Team Six", "institutional"),
        ],
      },
      {
        name: "Fatima",
        historicalRole: "Daughter of a 9/11 victim",
        personalityTraits: ["grieving", "complex", "seeking closure"],
        emotionalBackstory:
          "Fatima's father was a janitor in the North Tower of the World Trade Center. He was Muslim, an immigrant from Egypt, and he died alongside nearly three thousand others on September 11, 2001. In the decade since, Fatima has lived a double grief: mourning her father while being treated as suspect because of her faith. She was bullied, her mosque was vandalised, and strangers spat on her mother's hijab. Now bin Laden is dead and she is supposed to feel closure. Instead she feels a hollowness. Killing the man who inspired the attack does not bring her father back. It does not undo the decade of suspicion. She is tired of being asked to choose between her American identity and her Muslim identity. She should never have had to.",
        speakingStyle: "Young American English, emotionally layered, refuses simple narratives",
        ideologicalPosition: "Muslim American who rejects both terrorism and the War on Terror's collateral damage to her community",
        geographicOrigin: "United States",
        estimatedAge: 22,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/September_11_attacks", "September 11 Attacks", "neutral"),
          ref("https://en.wikipedia.org/wiki/Islamophobia_in_the_United_States", "Islamophobia in the US", "critical"),
          ref("https://en.wikipedia.org/wiki/War_on_terror", "War on Terror", "neutral"),
        ],
      },
      {
        name: "Noam Chomsky",
        historicalRole: "Public intellectual and critic of US foreign policy",
        personalityTraits: ["incisive", "relentless", "provocative"],
        emotionalBackstory:
          "Noam has spent decades arguing that American foreign policy creates the conditions for the violence it then claims to combat. He sees the bin Laden killing as extra-judicial assassination — a violation of international law that the US would condemn if any other nation carried it out. He does not mourn bin Laden, but he mourns the principle of law. He asks uncomfortable questions: if bin Laden should have been captured and tried, why was he killed? If Pakistani sovereignty matters, why was it violated? If the War on Terror is about justice, where is the due process? He knows these questions make him unpopular. He asks them anyway, because the alternative is a world where the most powerful nation decides who lives and dies without accountability.",
        speakingStyle: "Measured, professorial American English, builds devastating arguments through accumulation of facts",
        ideologicalPosition: "Anti-imperialist who frames the raid as extra-judicial killing and a violation of international law",
        geographicOrigin: "United States",
        estimatedAge: 82,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Noam_Chomsky", "Noam Chomsky", "biographical"),
          ref("https://en.wikipedia.org/wiki/Legality_of_the_killing_of_Osama_bin_Laden", "Legality of the Killing", "critical"),
          ref("https://en.wikipedia.org/wiki/Extra-judicial_killing", "Extra-Judicial Killing", "critical"),
        ],
      },
    ],
  },

  // 11 — Kargil War
  {
    title: "The Kargil War",
    timePeriod: "1999",
    era: "Contemporary",
    description: "Pakistani forces infiltrate Indian-held Kashmir, triggering a high-altitude war between two nuclear-armed neighbours.",
    initialDialogueOutline:
      "Summer 1999, as the conflict escalates. Each persona experiences the war from front lines, command rooms, and homes waiting for news that may never come.",
    personas: [
      {
        name: "Captain Vikram Batra",
        historicalRole: "Indian Army officer who led the assault on Point 5140",
        personalityTraits: ["fearless", "charismatic", "deeply patriotic"],
        emotionalBackstory:
          "Vikram is twenty-four and already a legend in 13 JAK Rifles. His battle cry 'Yeh Dil Maange More' — borrowed from a Pepsi commercial — has become the war's rallying call. He captured Point 5140 in a daring night assault and was sent to take Point 4875. He leads from the front because that is the only way he knows. His letters home are full of confidence and love — for his parents, his twin brother, his fiancée Dimple. He does not write about the cold, the altitude sickness, or the friends he has already buried in the snow. He will be killed by a sniper on July 7 while rescuing a wounded junior officer, earning a posthumous Param Vir Chakra. Tonight he is still alive, burning with the certainty that this hill matters.",
        speakingStyle: "Energetic, youthful Hindi-English mix, motivational, uses humour under fire",
        ideologicalPosition: "Indian soldier who fights for his country and his comrades without questioning the larger politics",
        geographicOrigin: "India",
        estimatedAge: 24,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Vikram_Batra", "Captain Vikram Batra", "biographical"),
          ref("https://en.wikipedia.org/wiki/Kargil_War", "Kargil War", "neutral"),
          ref("https://en.wikipedia.org/wiki/Param_Vir_Chakra", "Param Vir Chakra", "institutional"),
        ],
      },
      {
        name: "Captain Karnal Sher Khan",
        historicalRole: "Pakistani Army officer defending Tiger Hill",
        personalityTraits: ["brave", "duty-bound", "honourable"],
        emotionalBackstory:
          "Karnal is a Pashtun officer from the Northern Light Infantry who was told he was defending Pakistani territory. He fights at extreme altitude with dwindling supplies, freezing temperatures, and the knowledge that his country denies his presence. Pakistan initially claimed the fighters were independent mujahideen, not regular army — a lie that means Karnal and his men are expendable. He fights anyway because his men depend on him and because honour demands it. He will die defending his post and be posthumously awarded Pakistan's highest military honour, the Nishan-e-Haider. He represents soldiers on both sides who pay the ultimate price for decisions made by men in warm rooms far from the snow.",
        speakingStyle: "Formal, Pashto-accented English, military bearing, speaks of duty and honour",
        ideologicalPosition: "Pakistani soldier who believes in defending his country's claim to Kashmir, regardless of political complications",
        geographicOrigin: "Pakistan",
        estimatedAge: 28,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Karnal_Sher_Khan", "Captain Karnal Sher Khan", "biographical"),
          ref("https://en.wikipedia.org/wiki/Nishan-e-Haider", "Nishan-e-Haider", "institutional"),
          ref("https://en.wikipedia.org/wiki/Northern_Light_Infantry", "Northern Light Infantry", "neutral"),
        ],
      },
      {
        name: "Dimple Cheema",
        historicalRole: "Vikram Batra's fiancée who received the news",
        personalityTraits: ["devoted", "strong", "shattered"],
        emotionalBackstory:
          "Dimple fell in love with Vikram at university. He proposed before deployment, promising to return and marry her. She watches the news obsessively, recognising the terrain around Kargil from photographs he sent. Every phone call from a military number stops her heart. When the call finally comes — the one she has been dreading — she collapses. She will never marry. Decades later she remains devoted to his memory, not out of sentimentality but because what they had was real and the war took it. She represents every person waiting at home, the invisible casualties of war who do not receive medals but carry wounds that never heal.",
        speakingStyle: "Soft-spoken, intimate, shifts between loving memories and present-tense grief",
        ideologicalPosition: "Anti-war by circumstance rather than ideology — she did not oppose the war, the war took everything from her",
        geographicOrigin: "India",
        estimatedAge: 23,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Vikram_Batra#Personal_life", "Vikram Batra Personal Life", "biographical"),
          ref("https://en.wikipedia.org/wiki/Kargil_War#Casualties", "Kargil War Casualties", "neutral"),
          ref("https://en.wikipedia.org/wiki/Indian_Armed_Forces#Families", "Military Families in India", "contextual"),
        ],
      },
      {
        name: "General Pervez Musharraf",
        historicalRole: "Pakistani Army Chief who planned the Kargil incursion",
        personalityTraits: ["ambitious", "calculating", "unapologetic"],
        emotionalBackstory:
          "Pervez planned the Kargil operation to shift the Line of Control in Pakistan's favour while Prime Minister Nawaz Sharif was pursuing peace with India. He sent soldiers into Indian territory disguised as militants, then denied their presence when the operation went wrong. As international pressure mounted and India's air force joined the battle, the operation became untenable. Sharif went to Washington to negotiate a withdrawal; Musharraf considered it a betrayal. Within months he would overthrow Sharif in a coup. He remains convinced the operation was militarily sound but politically sabotaged. He does not dwell on the soldiers he sent to die on frozen peaks for a plan that was never going to succeed diplomatically. They were, in his calculus, acceptable losses.",
        speakingStyle: "Confident, assertive English with Urdu inflections, speaks like a man who has never been wrong",
        ideologicalPosition: "Military strategist who believes Kashmir justifies any cost and who distrusts civilian political leadership",
        geographicOrigin: "Pakistan",
        estimatedAge: 56,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Pervez_Musharraf", "Pervez Musharraf", "biographical"),
          ref("https://en.wikipedia.org/wiki/Kargil_War#Pakistani_planning", "Kargil War Pakistani Planning", "neutral"),
          ref("https://en.wikipedia.org/wiki/1999_Pakistani_coup_d%27%C3%A9tat", "1999 Pakistani Coup", "contextual"),
        ],
      },
      {
        name: "Nawaz Sharif",
        historicalRole: "Prime Minister of Pakistan during Kargil",
        personalityTraits: ["pragmatic", "outmanoeuvred", "peace-seeking"],
        emotionalBackstory:
          "Nawaz had just signed the Lahore Declaration with Indian PM Vajpayee — a historic peace initiative. He claims he was not informed of the Kargil operation by his own military, a humiliation that exposed the deep civil-military divide in Pakistani politics. When international condemnation rained down, he flew to Washington on July 4th to seek Clinton's help in brokering a withdrawal without losing face. The deal preserved lives but cost him politically. Musharraf's coup followed months later. Nawaz represents the civilian politician trapped between a military establishment that acts independently and an international community that holds him responsible. He wanted peace and got war — and was punished for trying to clean up the mess.",
        speakingStyle: "Diplomatic, occasionally frustrated Urdu-English, speaks carefully about the military",
        ideologicalPosition: "Civilian democrat who pursued peace with India and was undermined by his own military",
        geographicOrigin: "Pakistan",
        estimatedAge: 49,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Nawaz_Sharif", "Nawaz Sharif", "biographical"),
          ref("https://en.wikipedia.org/wiki/Lahore_Declaration", "Lahore Declaration", "diplomatic"),
          ref("https://en.wikipedia.org/wiki/Kargil_War#Diplomacy", "Kargil War Diplomacy", "neutral"),
        ],
      },
      {
        name: "Zubeida",
        historicalRole: "Kashmiri woman caught between the two armies",
        personalityTraits: ["exhausted", "politically aware", "yearning for normalcy"],
        emotionalBackstory:
          "Zubeida lives in a village in the Kargil district. She is not Indian or Pakistani in her heart — she is Kashmiri, and Kashmir has been a battleground for her entire life. Her house has been occupied by Indian soldiers three times and shelled by Pakistani artillery twice. Her children have never known a year without curfew. She watches young men from both countries die on mountains above her village and feels grief for all of them — and fury at the leaders who treat Kashmir as a chess piece. She does not want independence or merger — she wants her children to walk to school without checkpoints. She is the voice that neither country wants to hear because her truth indicts them both.",
        speakingStyle: "Weary, poetic Kashmiri-accented English, speaks in seasonal metaphors drawn from the valley",
        ideologicalPosition: "Kashmiri civilian who rejects both Indian and Pakistani claims and demands peace above sovereignty",
        geographicOrigin: "India",
        estimatedAge: 40,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Kashmir_conflict", "Kashmir Conflict", "neutral"),
          ref("https://en.wikipedia.org/wiki/Kargil_district", "Kargil District", "contextual"),
          ref("https://en.wikipedia.org/wiki/Human_rights_abuses_in_Kashmir", "Human Rights in Kashmir", "critical"),
        ],
      },
    ],
  },

  // 12 — Chernobyl
  {
    title: "Chernobyl: The Invisible Fire",
    timePeriod: "1986",
    era: "Contemporary",
    description: "Reactor No. 4 explodes, releasing invisible death across Europe and exposing the fatal cost of Soviet secrecy.",
    initialDialogueOutline:
      "The morning of April 26, 1986. The reactor has exploded but the full scope is not yet understood. Each persona navigates the gap between what they can see and what they cannot — the invisible radiation that is already killing them.",
    personas: [
      {
        name: "Vasily Ignatenko",
        historicalRole: "Firefighter who responded to the reactor fire",
        personalityTraits: ["dutiful", "young", "tragically unaware"],
        emotionalBackstory:
          "Vasily was twenty-five and newly married to Lyudmila when the alarm sounded at 1:23 AM. He and his crew drove to the burning reactor in ordinary firefighting gear — no one told them about radiation. They stood on the roof of the reactor building, shovelling graphite with their bare hands, while invisible particles tore through their cells. Within hours he felt dizzy and nauseous. Within days his skin began to blister and peel. He was transferred to Moscow Hospital No. 6, where Lyudmila watched him disintegrate over fourteen days. He died not knowing what had killed him, because the system that sent him to the roof never told him the truth. He is twenty-five, married, and dead — because someone decided that silence was preferable to panic.",
        speakingStyle: "Simple, warm Ukrainian-accented English, confused about what is happening to his body",
        ideologicalPosition: "Ordinary worker who trusted the system — and was destroyed by that trust",
        geographicOrigin: "Ukraine",
        estimatedAge: 25,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Chernobyl_disaster", "Chernobyl Disaster", "neutral"),
          ref("https://en.wikipedia.org/wiki/Individual_involvement_in_the_Chernobyl_disaster#Vasily_Ignatenko", "Vasily Ignatenko", "biographical"),
          ref("https://en.wikipedia.org/wiki/Chernobyl_liquidators", "Chernobyl Liquidators", "memorial"),
        ],
      },
      {
        name: "Lyudmila Ignatenko",
        historicalRole: "Vasily's wife who stayed by his bedside",
        personalityTraits: ["devoted", "devastated", "bearing witness"],
        emotionalBackstory:
          "Lyudmila was twenty-three and pregnant when she followed Vasily to Moscow Hospital No. 6. She was told not to touch him, not to get close — his body was now a source of radiation. She held him anyway. She watched his body change — the skin peeling, the internal organs failing, the person she loved dissolving before her eyes. The doctors told her to stay away for the baby's sake. She stayed. Their daughter Natasha was born four months later with congenital heart disease and died within four hours. Lyudmila's testimony in 'Voices from Chernobyl' is one of the most devastating accounts of love and loss in modern literature. She is the human cost that no reactor design can account for.",
        speakingStyle: "Tender, trembling, speaks directly to Vasily as if he is still in the room",
        ideologicalPosition: "Not political — her testimony is a love story that indicts the system by simply describing what happened",
        geographicOrigin: "Ukraine",
        estimatedAge: 23,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Voices_from_Chernobyl", "Voices from Chernobyl", "primary source"),
          ref("https://en.wikipedia.org/wiki/Chernobyl_disaster#Health_effects", "Chernobyl Health Effects", "medical"),
          ref("https://en.wikipedia.org/wiki/Chernobyl_(miniseries)", "Chernobyl Miniseries — Dramatisation", "cultural"),
        ],
      },
      {
        name: "Valery Legasov",
        historicalRole: "Chief scientist on the disaster investigation commission",
        personalityTraits: ["brilliant", "courageous", "ultimately broken"],
        emotionalBackstory:
          "Valery was the deputy director of the Kurchatov Institute of Atomic Energy when he was sent to Chernobyl. He immediately understood the scale of the disaster and devised the plan to entomb the reactor in concrete. At the Vienna IAEA conference, he presented the Soviet Union's official account — partial truths designed to protect the state. But he knew the full truth: the RBMK reactor had a design flaw that made it inherently unstable at low power, and the Soviet nuclear establishment had known and suppressed this information. He spent his last years fighting to reform nuclear safety and was systematically silenced by the system. He recorded audio tapes documenting the truth and hanged himself on the second anniversary of the disaster. His tapes became the foundation of reform.",
        speakingStyle: "Precise, scientific Russian-accented English, builds arguments methodically, voice heavy with burden",
        ideologicalPosition: "Soviet scientist who chose truth over loyalty to the system and paid with his life",
        geographicOrigin: "Russia",
        estimatedAge: 50,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Valery_Legasov", "Valery Legasov", "biographical"),
          ref("https://en.wikipedia.org/wiki/RBMK", "RBMK Reactor Design", "technical"),
          ref("https://en.wikipedia.org/wiki/Chernobyl_disaster#Investigation", "Chernobyl Investigation", "neutral"),
        ],
      },
      {
        name: "Anatoly Dyatlov",
        historicalRole: "Deputy chief engineer who supervised the test that caused the explosion",
        personalityTraits: ["authoritarian", "defensive", "in denial"],
        emotionalBackstory:
          "Anatoly oversaw the safety test on Reactor 4 on the night of the explosion. He pushed the operators to continue the test despite falling power levels and rising instability. When the reactor exploded, he refused to believe it. He told subordinates the reactor was intact, that it was merely the emergency water tank that had exploded. He sent men onto the roof to confirm what he would not accept. He was convicted and sentenced to ten years in labour camp, serving five before release due to illness from radiation exposure. To his dying day he maintained that the reactor design, not his actions, caused the disaster. He is partially right — the RBMK flaw was real — but his role in ignoring safety protocols and intimidating operators who tried to stop the test is undeniable.",
        speakingStyle: "Barking, authoritarian Russian-accented English, dismissive of objections, crumbles when confronted with evidence",
        ideologicalPosition: "Soviet technocrat who blames the system while refusing to acknowledge his own role in the disaster",
        geographicOrigin: "Russia",
        estimatedAge: 55,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Anatoly_Dyatlov", "Anatoly Dyatlov", "biographical"),
          ref("https://en.wikipedia.org/wiki/Chernobyl_disaster#Sequence_of_events", "Chernobyl Sequence of Events", "neutral"),
          ref("https://en.wikipedia.org/wiki/Chernobyl_disaster#Trial", "Chernobyl Trial", "judicial"),
        ],
      },
      {
        name: "Mikhail Gorbachev",
        historicalRole: "General Secretary of the Soviet Union",
        personalityTraits: ["reformist", "furious", "politically transforming"],
        emotionalBackstory:
          "Mikhail learned about Chernobyl through a chain of officials who minimised the disaster at every level. By the time the full picture reached him, the radioactive cloud was already over Scandinavia and the world knew before he did. Chernobyl became the catalyst for glasnost — his policy of openness — because it proved that Soviet secrecy was not just morally wrong but practically lethal. He later called Chernobyl the event that accelerated the end of the Soviet Union more than any other. He is furious at the bureaucrats who lied to him, but he is also the product of the system that created those bureaucrats. Chernobyl forced him to confront the rot at the core of the state he led — and in trying to save the system through reform, he ultimately dissolved it.",
        speakingStyle: "Statesmanlike Russian-accented English, reformist vocabulary, builds to philosophical reflection",
        ideologicalPosition: "Soviet reformer who saw Chernobyl as proof that secrecy kills and openness is the only path forward",
        geographicOrigin: "Russia",
        estimatedAge: 55,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Mikhail_Gorbachev", "Mikhail Gorbachev", "biographical"),
          ref("https://en.wikipedia.org/wiki/Glasnost", "Glasnost", "contextual"),
          ref("https://en.wikipedia.org/wiki/Chernobyl_disaster#Political_fallout", "Chernobyl Political Fallout", "neutral"),
        ],
      },
      {
        name: "Svetlana Alexievich",
        historicalRole: "Journalist and Nobel laureate who documented survivor testimonies",
        personalityTraits: ["empathetic", "relentless", "literary"],
        emotionalBackstory:
          "Svetlana spent years collecting testimonies from Chernobyl survivors — firefighters' wives, evacuated children, soldiers who buried radioactive villages, scientists who understood what others could not see. She wove their voices into 'Voices from Chernobyl,' a polyphonic oral history that lets the disaster speak through the people who lived it. She believes that the truth of Chernobyl cannot be captured in scientific reports or political memoirs — only in the voices of those who smelled the metallic taste in the air, who watched their gardens turn poisonous, who were told 'everything is fine' as their children developed thyroid cancer. She writes because silence is complicity, and because these people deserve to be heard in their own words.",
        speakingStyle: "Quiet, literary Belarusian-accented English, asks questions that open wounds gently",
        ideologicalPosition: "Humanist journalist who believes individual testimony is the truest form of history",
        geographicOrigin: "Belarus",
        estimatedAge: 38,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Svetlana_Alexievich", "Svetlana Alexievich", "biographical"),
          ref("https://en.wikipedia.org/wiki/Voices_from_Chernobyl", "Voices from Chernobyl", "primary source"),
          ref("https://en.wikipedia.org/wiki/Nobel_Prize_in_Literature", "Nobel Prize in Literature 2015", "institutional"),
        ],
      },
    ],
  },

  // ═══════════════════════ ANCIENT (1) ═══════════════════════

  // 13 — Assassination of Julius Caesar
  {
    title: "The Assassination of Julius Caesar",
    timePeriod: "44 BC",
    era: "Ancient",
    description: "On the Ides of March, Rome's most powerful man is murdered by his closest allies, plunging the Republic into chaos.",
    initialDialogueOutline:
      "March 15, 44 BC. Caesar lies dead on the Senate floor with twenty-three stab wounds. Each persona confronts what this act means — liberation, betrayal, or the end of everything they knew.",
    personas: [
      {
        name: "Marcus Brutus",
        historicalRole: "Senator and leader of the assassination conspiracy",
        personalityTraits: ["philosophical", "tormented", "honourable to a fault"],
        emotionalBackstory:
          "Marcus is descended from Lucius Junius Brutus, who expelled the last king of Rome and founded the Republic. That lineage is both his identity and his prison. Caesar was his mentor, perhaps his father — the rumours of Caesar's affair with his mother Servilia have followed him his entire life. He loves Caesar the man, but he fears Caesar the dictator. When Cassius showed him the anonymous letters begging 'Brutus, thou sleep'st,' he could no longer ignore what he believed was his ancestral duty. He struck the blow not out of ambition but out of principle — or so he tells himself. Now, standing over the body of the man who embraced him at the last, he wonders if principle and murder can truly coexist. 'Et tu, Brute?' will echo in his mind until he falls on his own sword at Philippi.",
        speakingStyle: "Measured, Stoic philosophical cadence, speaks in moral abstractions that crack under emotional pressure",
        ideologicalPosition: "Republican idealist who believes tyrannicide is the highest civic duty",
        geographicOrigin: "Italy",
        estimatedAge: 41,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Marcus_Junius_Brutus", "Marcus Junius Brutus", "biographical"),
          ref("https://en.wikipedia.org/wiki/Assassination_of_Julius_Caesar", "Assassination of Julius Caesar", "neutral"),
          ref("https://en.wikipedia.org/wiki/Liberatores", "The Liberatores Conspiracy", "neutral"),
        ],
      },
      {
        name: "Mark Antony",
        historicalRole: "Caesar's loyal general and consul",
        personalityTraits: ["passionate", "cunning", "vengeful"],
        emotionalBackstory:
          "Mark Antony was Caesar's right hand — his general, his drinking companion, his political enforcer. On the morning of the Ides, someone warned him the conspirators might target him too. He was lured away from the Senate by Trebonius while his friend was butchered inside. Now he stands before the bloodied toga, burning with grief and calculating his revenge. He will deliver a funeral oration that turns the Roman mob against the assassins — 'Friends, Romans, countrymen' — not because he is a great orator by nature, but because rage gives him eloquence. He loved Caesar, and he intends to make every conspirator pay. But his vengeance will also serve his ambition. The two are inseparable, and he does not care to separate them.",
        speakingStyle: "Bold, emotional, rhetorically devastating, shifts from soldierly bluntness to manipulative eloquence",
        ideologicalPosition: "Caesarian loyalist who sees the assassination as personal betrayal and political opportunity",
        geographicOrigin: "Italy",
        estimatedAge: 39,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Mark_Antony", "Mark Antony", "biographical"),
          ref("https://en.wikipedia.org/wiki/Mark_Antony%27s_funeral_oration", "Antony's Funeral Oration", "neutral"),
          ref("https://en.wikipedia.org/wiki/Roman_Republic#Fall", "Fall of the Roman Republic", "contextual"),
        ],
      },
      {
        name: "Calpurnia",
        historicalRole: "Caesar's wife who dreamed of his death",
        personalityTraits: ["intuitive", "grief-stricken", "politically erased"],
        emotionalBackstory:
          "Calpurnia dreamed of Caesar's statue spouting blood like a fountain while smiling Romans bathed their hands in it. She begged him not to go to the Senate. He almost listened — he was ready to stay home — until Decimus Brutus arrived and mocked him for heeding a woman's dreams. Caesar went. Now Calpurnia sits in their home, waiting for news she already knows. She is one of the most powerful women in Rome and completely powerless where it mattered most. History will remember her as a footnote — the wife with the prophetic dream — rather than as the woman who understood Roman politics well enough to see the conspiracy that Caesar's ego blinded him to. She warned him. He chose his pride. She is left with his blood-soaked toga and a Republic that will bury her in silence.",
        speakingStyle: "Dignified, restrained Roman matron's voice, grief expressed through precision rather than hysteria",
        ideologicalPosition: "Sees politics as a machine that consumes the people she loves, distrusts republican idealism as a mask for ambition",
        geographicOrigin: "Italy",
        estimatedAge: 31,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Calpurnia_(wife_of_Caesar)", "Calpurnia", "biographical"),
          ref("https://en.wikipedia.org/wiki/Women_in_ancient_Rome#Elite_women", "Women in Ancient Rome", "contextual"),
          ref("https://en.wikipedia.org/wiki/Julius_Caesar_(play)", "Shakespeare's Julius Caesar — Cultural Legacy", "cultural"),
        ],
      },
      {
        name: "Gaius Cassius Longinus",
        historicalRole: "Senator, military commander, and architect of the conspiracy",
        personalityTraits: ["ambitious", "jealous", "strategically brilliant"],
        emotionalBackstory:
          "Cassius is a decorated general who saved a Roman army at Carrhae and fought with distinction across the East. He expected to be rewarded with the highest offices of state. Instead, Caesar favoured others — younger men, less experienced, more obsequious. Cassius's republicanism is real, but it is inseparable from his wounded pride. He recruited Brutus because Brutus has the moral authority that Cassius lacks; Cassius has the plan, but Brutus has the name. He is the sharp steel behind the philosophical façade. He knows that killing Caesar is the easy part — holding Rome after is the challenge. He also suspects, correctly, that Antony will be more dangerous than Caesar ever was. But the die is cast, and Cassius is a man who does not look back.",
        speakingStyle: "Sharp, rapid Latin-inflected English, cuts to strategic reality, impatient with sentimentality",
        ideologicalPosition: "Republican motivated equally by ideology and personal grievance against Caesar's autocracy",
        geographicOrigin: "Italy",
        estimatedAge: 42,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Gaius_Cassius_Longinus", "Gaius Cassius Longinus", "biographical"),
          ref("https://en.wikipedia.org/wiki/Battle_of_Carrhae", "Battle of Carrhae", "military"),
          ref("https://en.wikipedia.org/wiki/Roman_Republic#Crisis", "Crisis of the Roman Republic", "contextual"),
        ],
      },
      {
        name: "Cleopatra VII",
        historicalRole: "Queen of Egypt and Caesar's lover, mother of Caesarion",
        personalityTraits: ["brilliant", "calculating", "devastated"],
        emotionalBackstory:
          "Cleopatra is in Rome when Caesar is killed, living in a villa across the Tiber with their son Caesarion. She came to Rome as Caesar's political and romantic partner, negotiating Egypt's future through pillow talk and diplomatic genius. She speaks nine languages, commands the wealthiest kingdom in the Mediterranean, and has just seen her entire strategy collapse with twenty-three knife wounds. Without Caesar, she has no protector in Rome. Caesarion — Caesar's only biological son — is now a threat to Octavian's inheritance rather than an asset. She must flee Rome before the conspirators or the mob turn on her. She will return to Egypt and eventually ally with Antony, but tonight she packs her belongings with the cold efficiency of a queen who has lost battles before and survived. Her grief is real. Her survival instinct is stronger.",
        speakingStyle: "Regal, multilingual, shifts between intimate vulnerability and royal authority",
        ideologicalPosition: "Egyptian sovereign who sees Rome's internal struggles as threats to be navigated, not causes to champion",
        geographicOrigin: "Egypt",
        estimatedAge: 25,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Cleopatra", "Cleopatra VII", "biographical"),
          ref("https://en.wikipedia.org/wiki/Caesarion", "Caesarion — Son of Caesar", "biographical"),
          ref("https://en.wikipedia.org/wiki/Ptolemaic_Kingdom", "Ptolemaic Egypt", "contextual"),
        ],
      },
      {
        name: "Gaius Octavian",
        historicalRole: "Caesar's adopted heir and future Emperor Augustus",
        personalityTraits: ["patient", "cold", "preternaturally strategic"],
        emotionalBackstory:
          "Octavian is eighteen years old and studying in Apollonia when he learns that his great-uncle Julius Caesar has been murdered — and that Caesar's will names him as adopted son and heir. He is young, sickly, and politically unknown. Every advisor tells him to renounce the inheritance — it is too dangerous, the conspirators are too powerful, Antony will crush him. He ignores all of them. He returns to Rome with nothing but Caesar's name and a patience that will outlast every rival. He will avenge Caesar not with Antony's theatrical grief but with decades of meticulous political warfare. He will destroy Brutus, Cassius, and eventually Antony and Cleopatra — and he will transform the Republic into an Empire with himself at its centre. Tonight he is a boy learning of his destiny. He accepts it with terrifying calm.",
        speakingStyle: "Quiet, controlled, far older than his years, speaks in the third person when discussing strategy",
        ideologicalPosition: "Pragmatist who inherits Caesar's legacy and will use both republican forms and autocratic power to reshape Rome",
        geographicOrigin: "Italy",
        estimatedAge: 18,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Augustus", "Augustus (Octavian)", "biographical"),
          ref("https://en.wikipedia.org/wiki/Caesar%27s_will", "Caesar's Will and Adoption of Octavian", "neutral"),
          ref("https://en.wikipedia.org/wiki/Roman_Empire#Establishment", "Establishment of the Roman Empire", "contextual"),
        ],
      },
    ],
  },

  // ═══════════════════════ ADDITIONAL MODERN (2) ═══════════════════════

  // 14 — The French Revolution
  {
    title: "The French Revolution: Liberty, Equality, Terror",
    timePeriod: "1789–1794",
    era: "Modern",
    description: "A starving nation overthrows its monarchy, then devours its own children as revolution collapses into the Reign of Terror.",
    initialDialogueOutline:
      "Summer 1793. The King is dead, the Republic declared, and the Committee of Public Safety is consolidating power. Each persona navigates the razor's edge between revolutionary idealism and the guillotine.",
    personas: [
      {
        name: "Maximilien Robespierre",
        historicalRole: "Leader of the Committee of Public Safety",
        personalityTraits: ["incorruptible", "fanatical", "tragically sincere"],
        emotionalBackstory:
          "Maximilien was a provincial lawyer from Arras who believed, with every fibre of his being, in Rousseau's vision of the general will. He opposed the death penalty before the Revolution. Now he signs execution orders daily, convinced that Terror is the price of virtue — that the Republic cannot survive unless its enemies are destroyed. He sleeps little, eats less, and trusts no one. He sees traitors everywhere because traitors are everywhere. He does not enjoy power; he endures it as a duty. His tragedy is not hypocrisy but sincerity — he genuinely believes that mass execution will produce a republic of equals. He will go to the guillotine himself in Thermidor, destroyed by the machine he perfected, still believing he was right.",
        speakingStyle: "Precise, legalistic French-accented English, builds arguments with cold logical rigour, voice rising only when defending virtue",
        ideologicalPosition: "Radical republican who believes revolutionary terror is inseparable from revolutionary virtue",
        geographicOrigin: "France",
        estimatedAge: 35,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Maximilien_Robespierre", "Maximilien Robespierre", "biographical"),
          ref("https://en.wikipedia.org/wiki/Reign_of_Terror", "Reign of Terror", "neutral"),
          ref("https://en.wikipedia.org/wiki/Committee_of_Public_Safety", "Committee of Public Safety", "institutional"),
        ],
      },
      {
        name: "Marie Antoinette",
        historicalRole: "Deposed Queen of France, prisoner awaiting execution",
        personalityTraits: ["dignified", "transformed", "defiant in defeat"],
        emotionalBackstory:
          "Marie was married off to Louis XVI at fourteen — an Austrian princess shipped to Versailles as a diplomatic pawn. She was frivolous in her youth because frivolity was all Versailles offered a queen with no political power. When they called her Madame Déficit, she did not understand — she had never seen the bread lines. But prison has stripped away everything. Her husband is dead, executed in January. Her children have been taken from her. Her son is being taught to denounce her as a criminal and a monster. She has nothing left but her composure. When she accidentally steps on the executioner's foot ascending the scaffold, she will say 'Pardon me, sir, I did not mean to do it.' In her last months she is more queen than she ever was at Versailles — because now her dignity is chosen, not inherited.",
        speakingStyle: "Formal, aristocratic French-accented English, maintains composure as armour, occasional flashes of bitter wit",
        ideologicalPosition: "Monarchist by birth who has transcended politics into personal dignity in the face of annihilation",
        geographicOrigin: "Austria",
        estimatedAge: 37,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Marie_Antoinette", "Marie Antoinette", "biographical"),
          ref("https://en.wikipedia.org/wiki/Execution_of_Marie_Antoinette", "Execution of Marie Antoinette", "neutral"),
          ref("https://en.wikipedia.org/wiki/Women_in_the_French_Revolution", "Women in the French Revolution", "contextual"),
        ],
      },
      {
        name: "Olympe de Gouges",
        historicalRole: "Playwright and author of the Declaration of the Rights of Woman",
        personalityTraits: ["visionary", "fearless", "ahead of her time"],
        emotionalBackstory:
          "Olympe wrote the Declaration of the Rights of Woman and of the Female Citizen in 1791, mirroring the Declaration of the Rights of Man article by article and asking the obvious question: if all men are born free and equal, what about women? She opposed the execution of the King — not out of royalism but because she believed a republic built on vengeance would consume itself. For this she was denounced as a counter-revolutionary. She will be guillotined in November 1793, three weeks after Marie Antoinette, for the crime of believing that liberty should mean liberty for everyone. She represents the road not taken — the revolution that could have been, if it had extended its principles to half the population instead of silencing them.",
        speakingStyle: "Passionate, rhetorical French-accented English, uses the Revolution's own language as a weapon against its hypocrisy",
        ideologicalPosition: "Feminist revolutionary who demands the Revolution honour its own principles by including women",
        geographicOrigin: "France",
        estimatedAge: 45,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Olympe_de_Gouges", "Olympe de Gouges", "biographical"),
          ref("https://en.wikipedia.org/wiki/Declaration_of_the_Rights_of_Woman_and_of_the_Female_Citizen", "Declaration of Rights of Woman", "primary source"),
          ref("https://en.wikipedia.org/wiki/Feminism_in_France", "Feminism in France", "contextual"),
        ],
      },
      {
        name: "Toussaint Louverture",
        historicalRole: "Leader of the Haitian Revolution, inspired by French revolutionary ideals",
        personalityTraits: ["strategic", "principled", "bitterly aware of hypocrisy"],
        emotionalBackstory:
          "Toussaint was born a slave in Saint-Domingue. When news of the French Revolution reached the Caribbean — that men were declaring themselves free and equal — he and half a million enslaved people asked the obvious question: does this include us? The answer from Paris was ambiguous, then contradictory, then hostile. Toussaint led the largest and most successful slave revolt in history, defeating French, Spanish, and British armies. He writes to the National Convention in the language of the Revolution, quoting their own declarations back at them. He represents the ultimate test of revolutionary sincerity: liberty, equality, fraternity — but only for white Frenchmen? He will be captured by Napoleon's forces and die in a cold French prison, but his revolution will succeed without him. Haiti will become the first nation founded by former slaves.",
        speakingStyle: "Commanding, diplomatic Creole-French-accented English, uses the language of the Enlightenment with devastating precision",
        ideologicalPosition: "Abolitionist revolutionary who holds France accountable to its own declared principles",
        geographicOrigin: "Haiti",
        estimatedAge: 50,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Toussaint_Louverture", "Toussaint Louverture", "biographical"),
          ref("https://en.wikipedia.org/wiki/Haitian_Revolution", "Haitian Revolution", "sympathetic"),
          ref("https://en.wikipedia.org/wiki/Abolition_of_slavery_in_France", "French Abolition of Slavery", "critical"),
        ],
      },
      {
        name: "Georges Danton",
        historicalRole: "Revolutionary leader and founder of the Committee of Public Safety",
        personalityTraits: ["larger-than-life", "pragmatic", "morally exhausted"],
        emotionalBackstory:
          "Georges is the voice that roared the Revolution into being — his speeches at the Cordeliers Club moved crowds to storm barricades. He helped create the Revolutionary Tribunal and the Committee of Public Safety. But by 1793 he is tired. The Terror he helped unleash is consuming people he knows and respects. He calls for clemency, for an end to the executions, and in doing so signs his own death warrant. Robespierre, his former ally, will have him arrested for 'indulgence.' On the scaffold, Danton's last words to the executioner will be: 'Show my head to the people. It is worth seeing.' He represents the revolutionary who creates a monster and then is devoured by it — the man who wanted liberty and got the guillotine.",
        speakingStyle: "Booming, theatrical French-accented English, alternating between rousing rhetoric and weary cynicism",
        ideologicalPosition: "Moderate revolutionary who turns against the Terror and is destroyed for advocating mercy",
        geographicOrigin: "France",
        estimatedAge: 34,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Georges_Danton", "Georges Danton", "biographical"),
          ref("https://en.wikipedia.org/wiki/Cordeliers", "Cordeliers Club", "institutional"),
          ref("https://en.wikipedia.org/wiki/Indulgents", "The Indulgents — Danton's Faction", "neutral"),
        ],
      },
      {
        name: "Jeanne",
        historicalRole: "Parisian market woman and sans-culotte",
        personalityTraits: ["fierce", "practical", "revolutionary from hunger"],
        emotionalBackstory:
          "Jeanne sells fish at Les Halles market and has watched her children go hungry while the court at Versailles feasted. She was among the women who marched on Versailles in October 1789, dragging the royal family back to Paris. She did not march for abstract rights — she marched for bread. The Revolution promised her that the people would rule and the people would eat. Now the Revolution is three years old and bread is still expensive, but there are new laws and new rulers and new enemies every week. She supports the Terror because the aristocrats and hoarders deserve what they get. But she is starting to notice that the guillotine is no longer just for nobles — it is for anyone who disagrees, including people who look and sound like her. She is the Revolution's conscience and its muscle, and she is beginning to wonder if the Revolution remembers why it started.",
        speakingStyle: "Rough, rapid Parisian market French-accented English, interrupts, argues from lived experience not theory",
        ideologicalPosition: "Working-class radical who measures the Revolution's success by whether her children can eat",
        geographicOrigin: "France",
        estimatedAge: 38,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Women%27s_March_on_Versailles", "Women's March on Versailles", "neutral"),
          ref("https://en.wikipedia.org/wiki/Sans-culottes", "Sans-Culottes", "sympathetic"),
          ref("https://en.wikipedia.org/wiki/French_Revolution#Causes", "Causes of the French Revolution", "contextual"),
        ],
      },
    ],
  },

  // 15 — The Spanish Flu
  {
    title: "The Spanish Flu: The Forgotten Pandemic",
    timePeriod: "1918–1919",
    era: "Modern",
    description: "As WWI ends, an invisible enemy kills more people than the war itself — and the world chooses to forget.",
    initialDialogueOutline:
      "Autumn 1918. The second wave is ravaging cities worldwide. Each persona faces the pandemic from a different continent, a different class, and a different level of power — united only by the virus.",
    personas: [
      {
        name: "Dr. Victor Vaughan",
        historicalRole: "Acting Surgeon General of the US Army",
        personalityTraits: ["authoritative", "horrified", "scientifically humble"],
        emotionalBackstory:
          "Victor oversees the medical care of two million American soldiers, and the flu is tearing through military camps faster than any battlefield weapon. At Camp Devens outside Boston, soldiers are dying so fast that bodies are stacked like cordwood. He has seen epidemic disease before, but nothing like this — young, healthy men turning blue and drowning in their own lungs within hours. He will later write that if the epidemic had continued at its rate of acceleration, civilisation could have disappeared within a few weeks. He is the most senior military doctor in America and he has no treatment, no vaccine, and no explanation. The war machine demands healthy soldiers, and he cannot deliver them. He is learning in real time that nature outranks every general.",
        speakingStyle: "Formal, authoritative American medical English, increasingly shaken beneath professional composure",
        ideologicalPosition: "Military medical establishment confronting the limits of wartime medicine",
        geographicOrigin: "United States",
        estimatedAge: 67,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Spanish_flu", "Spanish Flu", "neutral"),
          ref("https://en.wikipedia.org/wiki/Spanish_flu_in_the_United_States", "Spanish Flu in the US", "neutral"),
          ref("https://en.wikipedia.org/wiki/Camp_Devens", "Camp Devens — Flu Outbreak", "contextual"),
        ],
      },
      {
        name: "Lutiant Van Wert",
        historicalRole: "Native American nurse serving in Washington, D.C.",
        personalityTraits: ["compassionate", "witness", "doubly marginalised"],
        emotionalBackstory:
          "Lutiant is a young woman from the Cheyenne and Arapaho Nations working as a clerk and volunteer nurse in Washington. She writes letters home describing the horror in vivid detail: 'It is simply terrible. People are dying like flies.' She watches colleagues fall sick at their desks and be dead by nightfall. As a Native American woman, she occupies an invisible space — serving a government that has systematically destroyed her people, tending to white soldiers who would not sit beside her on a streetcar. The flu does not discriminate, but the medical system does. Native American communities will be devastated — some villages will lose ninety percent of their population — and the government will do almost nothing. Lutiant's letters are among the most vivid first-person accounts of the pandemic, written by someone the history books almost forgot.",
        speakingStyle: "Warm, observational American English with occasional Cheyenne phrases, writes and speaks with documentary precision",
        ideologicalPosition: "Indigenous woman who serves despite systemic injustice, bearing witness from the margins",
        geographicOrigin: "United States",
        estimatedAge: 22,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Spanish_flu#North_America", "Spanish Flu in North America", "neutral"),
          ref("https://en.wikipedia.org/wiki/1918_flu_pandemic_in_the_United_States#Native_American_communities", "Flu Impact on Native Americans", "critical"),
          ref("https://en.wikipedia.org/wiki/Cheyenne_and_Arapaho_Tribes", "Cheyenne and Arapaho Nations", "contextual"),
        ],
      },
      {
        name: "Mohandas Gandhi",
        historicalRole: "Indian independence leader recovering from the flu",
        personalityTraits: ["reflective", "weakened", "spiritually deepened"],
        emotionalBackstory:
          "Mohandas contracted the flu in 1918 and nearly died. He was already weakened from years of fasting and ascetic living. As he recovered, he witnessed the pandemic sweep through India — killing between twelve and seventeen million people, the highest toll of any country. British India's medical infrastructure was built to serve the colonial administration, not the Indian population. The pandemic exposed what Gandhi had been arguing for years: colonial rule was not a partnership but an extraction. Indian bodies were expendable — as soldiers on the Western Front, as labourers in colonial economies, and now as victims of a disease that the British administration was too indifferent or too incompetent to address. His near-death experience deepened his resolve. Within a year he would launch the Non-Cooperation Movement.",
        speakingStyle: "Gentle, deliberate Indian English, speaks in moral parables, voice still weak from illness",
        ideologicalPosition: "Anti-colonial activist who sees the pandemic as proof of colonialism's fundamental disregard for Indian life",
        geographicOrigin: "India",
        estimatedAge: 49,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Spanish_flu_in_India", "Spanish Flu in India", "neutral"),
          ref("https://en.wikipedia.org/wiki/Mahatma_Gandhi", "Mahatma Gandhi", "biographical"),
          ref("https://en.wikipedia.org/wiki/Non-cooperation_movement", "Non-Cooperation Movement", "contextual"),
        ],
      },
      {
        name: "Laura Spinney",
        historicalRole: "Composite narrator representing pandemic historians and researchers",
        personalityTraits: ["analytical", "outraged by forgetting", "connective"],
        emotionalBackstory:
          "Laura represents the historians who have spent decades trying to understand why the world's deadliest pandemic — fifty to one hundred million dead — was almost entirely erased from collective memory. The war overshadowed it. The censors suppressed it. The survivors wanted to forget. The result is a civilisational amnesia that left the world unprepared for the next pandemic a century later. She connects the 1918 flu to COVID-19, to Ebola, to every public health failure that could have been mitigated by remembering. She is angry — not at the virus, but at the forgetting. She believes that the dead deserve to be counted, named, and mourned, and that a society that forgets fifty million deaths is a society that has already decided those lives did not matter.",
        speakingStyle: "Clear, journalistic English, builds connections across time periods, passionate about memory as a public health tool",
        ideologicalPosition: "Pandemic historian who argues that collective memory is a form of public health infrastructure",
        geographicOrigin: "United Kingdom",
        estimatedAge: 45,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Pale_Rider:_The_Spanish_Flu_of_1918_and_How_It_Changed_the_World", "Pale Rider — Laura Spinney", "academic"),
          ref("https://en.wikipedia.org/wiki/Spanish_flu#Mortality", "Spanish Flu Mortality Estimates", "neutral"),
          ref("https://en.wikipedia.org/wiki/Spanish_flu#Legacy", "Spanish Flu Legacy", "contextual"),
        ],
      },
      {
        name: "Wilfred Owen",
        historicalRole: "War poet who died one week before the Armistice",
        personalityTraits: ["poetic", "shell-shocked", "defiant"],
        emotionalBackstory:
          "Wilfred is a soldier-poet on the Western Front, writing verse that will redefine how the world understands war. Around him, men are dying not from bullets but from a disease that makes them drown in fluid from their own lungs — a suffocation eerily similar to the gas attacks he has written about in 'Dulce et Decorum Est.' The flu is killing more soldiers than the enemy. The absurdity is total: they survived the trenches only to die of a cough. Wilfred will be killed by machine gun fire on November 4, 1918 — seven days before the Armistice. His mother will receive the telegram as church bells ring for peace. He represents the generation that was destroyed twice — by war and by pandemic — and whose poetry is the only monument adequate to their suffering.",
        speakingStyle: "Lyrical, haunted English, speaks in images drawn from the trenches, alternates between beauty and horror",
        ideologicalPosition: "Anti-war poet who sees the pandemic as another face of the industrial-scale destruction of young lives",
        geographicOrigin: "United Kingdom",
        estimatedAge: 25,
        gender: "male",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Wilfred_Owen", "Wilfred Owen", "biographical"),
          ref("https://en.wikipedia.org/wiki/Dulce_et_Decorum_est", "Dulce et Decorum Est", "primary source"),
          ref("https://en.wikipedia.org/wiki/Spanish_flu#Soldiers_and_the_military", "Spanish Flu and the Military", "contextual"),
        ],
      },
      {
        name: "Fumiko Hayashi",
        historicalRole: "Japanese writer who survived the pandemic as a child",
        personalityTraits: ["observant", "lonely", "preternaturally aware"],
        emotionalBackstory:
          "Fumiko is a young girl in Onomichi, Japan, watching the pandemic unfold through a child's eyes. Schools are closed. Her neighbours wear masks. The festivals are cancelled. Adults whisper in corners and come back with red eyes. She does not fully understand what is happening, but she understands the silence — the streets that should be full of people, the houses where the curtains stay drawn. Japan will lose between 257,000 and 481,000 people to the flu. Fumiko will grow up to become one of Japan's greatest writers, and the loneliness of this period — the sense of a world emptied of familiar sounds — will infuse her work. She represents the children of pandemics: the ones who survive but carry the silence forward into lives shaped by what they could not understand.",
        speakingStyle: "Quiet, observational Japanese-accented English, describes the world in sensory details, sees what adults miss",
        ideologicalPosition: "Child witness whose understanding is emotional and sensory rather than political",
        geographicOrigin: "Japan",
        estimatedAge: 14,
        gender: "female",
        articleReferences: [
          ref("https://en.wikipedia.org/wiki/Fumiko_Hayashi", "Fumiko Hayashi", "biographical"),
          ref("https://en.wikipedia.org/wiki/Spanish_flu#Japan", "Spanish Flu in Japan", "neutral"),
          ref("https://en.wikipedia.org/wiki/Taisho_period", "Taisho Period Japan", "contextual"),
        ],
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Seed mutation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Seeds pre-built scenarios with their curated personas.
 * Run via the Convex dashboard or `npx convex run seed:seedPrebuiltScenarios`.
 *
 * Idempotent per scenario: skips any scenario whose title already exists.
 *
 * Requirements: 1.1, 1.2
 */
export const seedPrebuiltScenarios = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Fetch all existing prebuilt scenario titles for idempotency
    const existingScenarios = await ctx.db
      .query("scenarios")
      .filter((q) => q.eq(q.field("isPrebuilt"), true))
      .collect();
    const existingTitles = new Set(existingScenarios.map((s) => s.title));

    const now = Date.now();
    let scenarioCount = 0;

    for (const scenarioData of SCENARIOS) {
      // Skip if this scenario already exists
      if (existingTitles.has(scenarioData.title)) {
        continue;
      }

      // Insert scenario first (without personaIds)
      const scenarioId = await ctx.db.insert("scenarios", {
        title: scenarioData.title,
        timePeriod: scenarioData.timePeriod,
        era: scenarioData.era,
        description: scenarioData.description.slice(0, 200),
        isPrebuilt: true,
        createdAt: now,
        personaIds: [],
        initialDialogueOutline: scenarioData.initialDialogueOutline,
        contentDisclaimer: CONTENT_DISCLAIMER,
      });

      // Insert personas and collect IDs
      const personaIds = [];
      for (const persona of scenarioData.personas) {
        const voiceId = matchVoice({
          geographicOrigin: persona.geographicOrigin,
          estimatedAge: persona.estimatedAge,
          gender: persona.gender,
        });

        const personaId = await ctx.db.insert("personas", {
          scenarioId,
          name: persona.name,
          historicalRole: persona.historicalRole,
          personalityTraits: persona.personalityTraits,
          emotionalBackstory: persona.emotionalBackstory,
          speakingStyle: persona.speakingStyle,
          ideologicalPosition: persona.ideologicalPosition,
          geographicOrigin: persona.geographicOrigin,
          estimatedAge: persona.estimatedAge,
          gender: persona.gender,
          voiceId,
          articleReferences: persona.articleReferences,
          avatarGenerationStatus: "pending",
        });
        personaIds.push(personaId);
      }

      // Update scenario with personaIds
      await ctx.db.patch(scenarioId, { personaIds });
      scenarioCount++;
    }

    if (scenarioCount === 0) {
      console.log("All scenarios already exist. Nothing to seed.");
    } else {
      console.log(`Seeded ${scenarioCount} new pre-built scenarios.`);
    }
    return { seeded: scenarioCount > 0, count: scenarioCount };
  },
});
