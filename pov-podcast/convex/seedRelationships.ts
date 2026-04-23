import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Seeds pairwise persona relationships for all pre-built scenarios.
 *
 * Relationships are defined by persona name pairs within each scenario.
 * The mutation is idempotent — it skips scenarios that already have relationships.
 *
 * Requirements: 20.1, 20.2
 */

type RelationshipType =
  | "alliance"
  | "rivalry"
  | "mentor_student"
  | "ideological_kinship"
  | "historical_enmity";

interface RelationshipSeed {
  personaAName: string;
  personaBName: string;
  relationshipType: RelationshipType;
  description: string;
}

interface ScenarioRelationshipSeed {
  scenarioTitle: string;
  relationships: RelationshipSeed[];
}

// ─── Relationship definitions for all 12 pre-built scenarios ─────────────────

const SCENARIO_RELATIONSHIPS: ScenarioRelationshipSeed[] = [
  // 1 — World War II
  {
    scenarioTitle: "World War II: The Fall of Berlin",
    relationships: [
      {
        personaAName: "Hans Müller",
        personaBName: "Natalya Petrova",
        relationshipType: "historical_enmity",
        description:
          "Hans is a German deserter; Natalya is a Soviet nurse who survived the siege of Leningrad. Their nations fought each other with extraordinary brutality on the Eastern Front.",
      },
      {
        personaAName: "Hans Müller",
        personaBName: "James Crawford",
        relationshipType: "historical_enmity",
        description:
          "Hans served the Wehrmacht that James's SOE networks actively sabotaged. Though Hans deserted, he still represents the enemy James spent years fighting.",
      },
      {
        personaAName: "Natalya Petrova",
        personaBName: "James Crawford",
        relationshipType: "alliance",
        description:
          "Soviet and British forces were Allied powers fighting the same enemy. Though ideologically different, they share the bond of having fought and bled for the same cause.",
      },
      {
        personaAName: "Ruth Goldberg",
        personaBName: "Hans Müller",
        relationshipType: "historical_enmity",
        description:
          "Ruth is a Holocaust survivor liberated from Bergen-Belsen. Hans served the regime that imprisoned and murdered her family, even if he later deserted.",
      },
      {
        personaAName: "Ruth Goldberg",
        personaBName: "Natalya Petrova",
        relationshipType: "ideological_kinship",
        description:
          "Both women are survivors who lost family to the war. Ruth was liberated by British forces; Soviet forces liberated other camps. They share the bond of survival and loss.",
      },
      {
        personaAName: "Hiroshi Tanaka",
        personaBName: "James Crawford",
        relationshipType: "alliance",
        description:
          "Both fought for the Allied cause — Hiroshi with the 442nd Regiment in Europe, James with the SOE. They share the experience of fighting for a democracy that treated them as second-class.",
      },
      {
        personaAName: "Marie Leclerc",
        personaBName: "James Crawford",
        relationshipType: "ideological_kinship",
        description:
          "Both worked in the French Resistance network, though from different angles — Marie as a communist FTP organiser, James as a British SOE coordinator. They share operational history but ideological tension.",
      },
      {
        personaAName: "Marie Leclerc",
        personaBName: "Hans Müller",
        relationshipType: "historical_enmity",
        description:
          "Marie fought against the German occupation that Hans served. His desertion does not erase the years of resistance violence she witnessed at German hands.",
      },
    ],
  },

  // 2 — India-Pakistan Partition
  {
    scenarioTitle: "The Partition of India",
    relationships: [
      {
        personaAName: "Amrit Singh",
        personaBName: "Fatima Begum",
        relationshipType: "historical_enmity",
        description:
          "Amrit is a Sikh refugee who lost his son fleeing Lahore; Fatima is a Muslim who chose to stay in Delhi. Their communities were on opposite sides of the communal violence.",
      },
      {
        personaAName: "Amrit Singh",
        personaBName: "Cyril Radcliffe",
        relationshipType: "historical_enmity",
        description:
          "Radcliffe drew the line that destroyed Amrit's world. Amrit holds him personally responsible for the loss of his land, his son, and his community.",
      },
      {
        personaAName: "Fatima Begum",
        personaBName: "Begum Jahanara Shah",
        relationshipType: "rivalry",
        description:
          "Fatima is a secular Indian nationalist who opposed the two-nation theory; Jahanara is a Muslim League activist who campaigned for Pakistan. They represent the fundamental ideological split within the Muslim community.",
      },
      {
        personaAName: "Fatima Begum",
        personaBName: "Cyril Radcliffe",
        relationshipType: "historical_enmity",
        description:
          "Fatima blames British colonial policy — embodied by Radcliffe — for creating the conditions that made Partition inevitable and catastrophic.",
      },
      {
        personaAName: "Begum Jahanara Shah",
        personaBName: "Amrit Singh",
        relationshipType: "historical_enmity",
        description:
          "Jahanara campaigned for the Pakistan that displaced Amrit and killed his son. She represents the political movement he holds responsible for his suffering.",
      },
      {
        personaAName: "Baldev Kumar",
        personaBName: "Begum Jahanara Shah",
        relationshipType: "historical_enmity",
        description:
          "Baldev lost his wife and everything he owned in the Rawalpindi riots. Jahanara's Muslim League activism contributed to the political climate that enabled that violence.",
      },
      {
        personaAName: "Baldev Kumar",
        personaBName: "Cyril Radcliffe",
        relationshipType: "historical_enmity",
        description:
          "Baldev distrusts all politicians and colonial administrators equally. Radcliffe represents the British indifference that treated Indian lives as administrative problems.",
      },
      {
        personaAName: "Ayesha Nawaz",
        personaBName: "Begum Jahanara Shah",
        relationshipType: "ideological_kinship",
        description:
          "Both are Muslim women who supported Pakistan, though Ayesha's idealism is being tested by the reality of the journey while Jahanara's is being tested by the violence.",
      },
    ],
  },

  // 3 — Titanic
  {
    scenarioTitle: "The Sinking of the Titanic",
    relationships: [
      {
        personaAName: "Margaret Whitfield",
        personaBName: "Padraig O'Brien",
        relationshipType: "historical_enmity",
        description:
          "Margaret is a first-class American socialite; Padraig is an Irish steerage passenger. The locked gates between their decks make their class divide literal and lethal.",
      },
      {
        personaAName: "Thomas Andrews",
        personaBName: "J. Bruce Ismay",
        relationshipType: "rivalry",
        description:
          "Andrews designed the ship and pushed for more safety features; Ismay overruled him to cut costs. Andrews's engineering conscience is in direct conflict with Ismay's commercial priorities.",
      },
      {
        personaAName: "Violet Jessop",
        personaBName: "Margaret Whitfield",
        relationshipType: "mentor_student",
        description:
          "Violet is a stewardess who has seen the class system from the inside; Margaret is a first-class passenger beginning to see it for the first time. Violet's calm professionalism is teaching Margaret something about survival and dignity.",
      },
      {
        personaAName: "Padraig O'Brien",
        personaBName: "Mei Chen",
        relationshipType: "ideological_kinship",
        description:
          "Both are steerage passengers from marginalised communities being denied access to lifeboats. They share the experience of being treated as expendable by the ship's hierarchy.",
      },
      {
        personaAName: "J. Bruce Ismay",
        personaBName: "Margaret Whitfield",
        relationshipType: "ideological_kinship",
        description:
          "Both are wealthy passengers whose privilege is being exposed by the disaster. Ismay represents the system Margaret is beginning to question.",
      },
      {
        personaAName: "Thomas Andrews",
        personaBName: "Violet Jessop",
        relationshipType: "alliance",
        description:
          "Both are professionals who served the ship faithfully and are now watching it die. Andrews built it; Violet serves it. Both feel a profound sense of responsibility to the passengers.",
      },
    ],
  },

  // 4 — Moon Landing
  {
    scenarioTitle: "The Moon Landing",
    relationships: [
      {
        personaAName: "Apollo 11 Astronaut",
        personaBName: "Mission Control Flight Director",
        relationshipType: "alliance",
        description:
          "The astronaut and flight director are bound by absolute mutual trust — the mission's success depends on their seamless coordination across 240,000 miles of space.",
      },
      {
        personaAName: "Apollo 11 Astronaut",
        personaBName: "Soviet Space Program Scientist",
        relationshipType: "rivalry",
        description:
          "The Space Race was a direct competition between American and Soviet programs. The astronaut's success is the Soviet scientist's defeat — though both share a deeper kinship as explorers.",
      },
      {
        personaAName: "NASA Engineer",
        personaBName: "Mission Control Flight Director",
        relationshipType: "alliance",
        description:
          "The engineer built the spacecraft; the flight director flew it. Their collaboration represents the thousands of people whose work made the mission possible.",
      },
      {
        personaAName: "Soviet Space Program Scientist",
        personaBName: "NASA Engineer",
        relationshipType: "rivalry",
        description:
          "Both are engineers who dedicated their careers to the same goal — reaching the Moon — but for competing superpowers. They share technical respect and political opposition.",
      },
      {
        personaAName: "American Citizen",
        personaBName: "Journalist",
        relationshipType: "ideological_kinship",
        description:
          "Both are civilians experiencing the Moon landing as a shared national moment, though the journalist's professional distance gives them a more analytical perspective.",
      },
    ],
  },

  // 5 — Hiroshima
  {
    scenarioTitle: "The Hiroshima Atomic Bombing",
    relationships: [
      {
        personaAName: "Hiroshima Survivor (Hibakusha)",
        personaBName: "American Pilot",
        relationshipType: "historical_enmity",
        description:
          "The survivor lived through the bomb the pilot dropped. Their relationship is the most direct and devastating possible — perpetrator and victim of the same act.",
      },
      {
        personaAName: "American Pilot",
        personaBName: "American Military Commander",
        relationshipType: "mentor_student",
        description:
          "The commander ordered the mission; the pilot executed it. The pilot followed orders he may not have fully understood; the commander bears the strategic responsibility.",
      },
      {
        personaAName: "Hiroshima Survivor (Hibakusha)",
        personaBName: "Japanese Doctor",
        relationshipType: "alliance",
        description:
          "The survivor and the doctor are both Japanese civilians dealing with the aftermath. The doctor treated the survivor's wounds; they share the experience of the city's destruction.",
      },
      {
        personaAName: "Relative of Victim",
        personaBName: "American Military Commander",
        relationshipType: "historical_enmity",
        description:
          "The relative lost someone to the bomb the commander ordered. Their grief is the direct human cost of his strategic calculation.",
      },
      {
        personaAName: "International Observer",
        personaBName: "American Military Commander",
        relationshipType: "rivalry",
        description:
          "The observer represents the international community's moral scrutiny of the bombing decision. The commander must defend his choice to a world that is beginning to understand what nuclear weapons mean.",
      },
    ],
  },

  // 6 — COVID-19
  {
    scenarioTitle: "The COVID-19 Pandemic",
    relationships: [
      {
        personaAName: "ICU Doctor",
        personaBName: "Government Health Official",
        relationshipType: "rivalry",
        description:
          "The doctor sees the human cost of policy decisions in real time; the official makes those decisions from a distance. Their relationship is defined by the gap between clinical reality and political calculation.",
      },
      {
        personaAName: "Small Business Owner",
        personaBName: "Government Health Official",
        relationshipType: "historical_enmity",
        description:
          "The lockdown policies the official implemented destroyed the business owner's livelihood. They represent the economic cost of public health decisions.",
      },
      {
        personaAName: "Daily Wage Worker",
        personaBName: "Middle-Class Professional",
        relationshipType: "historical_enmity",
        description:
          "The professional can work from home; the daily wage worker cannot. The pandemic exposed and deepened the class divide between those who could shelter safely and those who could not.",
      },
      {
        personaAName: "Vaccine Scientist",
        personaBName: "Government Health Official",
        relationshipType: "alliance",
        description:
          "The scientist developed the vaccine; the official deployed it. Their collaboration represents the public health system working as intended, even under extraordinary pressure.",
      },
      {
        personaAName: "ICU Doctor",
        personaBName: "Daily Wage Worker",
        relationshipType: "ideological_kinship",
        description:
          "Both are essential workers who could not stay home. The doctor treats the sick; the worker keeps the economy moving. Both were exposed to the virus while others sheltered.",
      },
    ],
  },

  // 7 — Stanford Prison Experiment
  {
    scenarioTitle: "The Stanford Prison Experiment",
    relationships: [
      {
        personaAName: "Lead Researcher",
        personaBName: "Outside Observer",
        relationshipType: "rivalry",
        description:
          "Zimbardo designed and ran the experiment; the outside observer represents the ethical scrutiny that eventually shut it down. Their conflict is between scientific ambition and moral responsibility.",
      },
      {
        personaAName: "Guard Participant",
        personaBName: "Prisoner Participant",
        relationshipType: "historical_enmity",
        description:
          "The guard and prisoner were assigned roles that became real. The guard exercised power over the prisoner in ways that caused genuine psychological harm.",
      },
      {
        personaAName: "Lead Researcher",
        personaBName: "Participant Who Suffered",
        relationshipType: "mentor_student",
        description:
          "Zimbardo recruited and supervised the participant who broke down. His failure to protect them represents the experiment's most damning ethical failure.",
      },
      {
        personaAName: "Journalist",
        personaBName: "Lead Researcher",
        relationshipType: "rivalry",
        description:
          "The journalist investigated the experiment's legacy and exposed its methodological flaws. Zimbardo spent decades defending his work against exactly this kind of scrutiny.",
      },
      {
        personaAName: "Outside Observer",
        personaBName: "Participant Who Suffered",
        relationshipType: "alliance",
        description:
          "The observer eventually intervened to stop the experiment. They represent the ethical conscience that the participant needed and that Zimbardo failed to provide.",
      },
    ],
  },

  // 8 — Jack the Ripper
  {
    scenarioTitle: "The Jack the Ripper Murders",
    relationships: [
      {
        personaAName: "Metropolitan Police Detective",
        personaBName: "Journalist",
        relationshipType: "rivalry",
        description:
          "The detective is trying to solve the case; the journalist is publishing sensational coverage that hampers the investigation and inflames public panic.",
      },
      {
        personaAName: "Victim's Family Member",
        personaBName: "Metropolitan Police Detective",
        relationshipType: "historical_enmity",
        description:
          "The family member holds the police responsible for failing to protect their loved one and for the slow, inadequate investigation that followed.",
      },
      {
        personaAName: "East End Resident",
        personaBName: "Metropolitan Police Detective",
        relationshipType: "rivalry",
        description:
          "The resident distrusts the police, who are seen as agents of class control rather than community protection. The murders have exposed the police's indifference to working-class victims.",
      },
      {
        personaAName: "Coroner",
        personaBName: "Metropolitan Police Detective",
        relationshipType: "alliance",
        description:
          "The coroner and detective work together on the forensic evidence. Their collaboration represents the emerging science of criminal investigation.",
      },
      {
        personaAName: "Suspect",
        personaBName: "Metropolitan Police Detective",
        relationshipType: "historical_enmity",
        description:
          "The suspect (representing the various theories) is the object of the detective's investigation. Their relationship is defined by pursuit and evasion.",
      },
    ],
  },

  // 9 — Bhopal
  {
    scenarioTitle: "The Bhopal Gas Tragedy",
    relationships: [
      {
        personaAName: "Bhopal Resident / Survivor",
        personaBName: "Union Carbide Executive",
        relationshipType: "historical_enmity",
        description:
          "The survivor lost family and health to the gas leak caused by the executive's company. Their relationship is the direct human cost of corporate negligence.",
      },
      {
        personaAName: "Union Carbide Factory Worker",
        personaBName: "Union Carbide Executive",
        relationshipType: "historical_enmity",
        description:
          "The worker was employed by the company and exposed to the gas. The executive's cost-cutting decisions created the conditions that killed and injured the workers they employed.",
      },
      {
        personaAName: "Investigative Journalist",
        personaBName: "Union Carbide Executive",
        relationshipType: "rivalry",
        description:
          "The journalist is exposing the corporate negligence and cover-up that the executive is trying to manage. Their conflict is between accountability and damage control.",
      },
      {
        personaAName: "Doctor",
        personaBName: "Bhopal Resident / Survivor",
        relationshipType: "alliance",
        description:
          "The doctor treated the survivor's injuries and continues to document the long-term health effects. They share the experience of the disaster's ongoing human cost.",
      },
      {
        personaAName: "Rescue Worker",
        personaBName: "Doctor",
        relationshipType: "alliance",
        description:
          "Both are first responders who worked in the immediate aftermath of the disaster. They share the trauma of the rescue operation and the inadequacy of available resources.",
      },
    ],
  },

  // 10 — Bin Laden
  {
    scenarioTitle: "The Assassination of Osama bin Laden",
    relationships: [
      {
        personaAName: "US Navy SEAL",
        personaBName: "CIA Intelligence Analyst",
        relationshipType: "alliance",
        description:
          "The SEAL executed the mission; the analyst spent years building the intelligence case that made it possible. Their collaboration represents the full chain from intelligence to action.",
      },
      {
        personaAName: "Pakistani Resident",
        personaBName: "US Navy SEAL",
        relationshipType: "historical_enmity",
        description:
          "The resident lives near the compound where the operation took place. The unilateral American military action on Pakistani soil represents a violation of sovereignty that the resident experiences directly.",
      },
      {
        personaAName: "American Politician",
        personaBName: "CIA Intelligence Analyst",
        relationshipType: "mentor_student",
        description:
          "The politician authorised the mission based on the analyst's intelligence assessment. Their relationship is defined by the chain of command and the weight of the decision.",
      },
      {
        personaAName: "Al-Qaeda Associate",
        personaBName: "US Navy SEAL",
        relationshipType: "historical_enmity",
        description:
          "The associate represents the ideological movement the SEAL was sent to destroy. Their conflict is the direct expression of the War on Terror.",
      },
      {
        personaAName: "Journalist",
        personaBName: "American Politician",
        relationshipType: "rivalry",
        description:
          "The journalist is pressing for details about the operation's legality and the decision-making process. The politician is managing the narrative of a successful mission.",
      },
    ],
  },

  // 11 — Kargil War
  {
    scenarioTitle: "The Kargil War",
    relationships: [
      {
        personaAName: "Indian Army Soldier",
        personaBName: "Pakistani Army Soldier",
        relationshipType: "historical_enmity",
        description:
          "The Indian and Pakistani soldiers are fighting each other directly in the Kargil mountains. Their enmity is immediate and lethal, though both are also victims of their governments' decisions.",
      },
      {
        personaAName: "Indian Politician",
        personaBName: "Pakistani Politician",
        relationshipType: "rivalry",
        description:
          "The Indian and Pakistani politicians are managing the diplomatic and military crisis from opposite sides. Their rivalry is the political expression of the conflict their soldiers are dying in.",
      },
      {
        personaAName: "War Journalist",
        personaBName: "Indian Politician",
        relationshipType: "rivalry",
        description:
          "The journalist is reporting from the front lines in ways that complicate the politician's narrative management. Their conflict is between truth and strategic communication.",
      },
      {
        personaAName: "Family Member",
        personaBName: "Indian Army Soldier",
        relationshipType: "alliance",
        description:
          "The family member is waiting at home for news of the soldier they love. Their relationship represents the human cost of the war beyond the battlefield.",
      },
      {
        personaAName: "Indian Army Soldier",
        personaBName: "Indian Politician",
        relationshipType: "mentor_student",
        description:
          "The soldier follows orders from the political and military leadership. Their relationship is defined by the chain of command and the question of whether the politicians understand what they are asking soldiers to do.",
      },
    ],
  },

  // 12 — Chernobyl
  {
    scenarioTitle: "The Chernobyl Disaster",
    relationships: [
      {
        personaAName: "Nuclear Plant Operator",
        personaBName: "Soviet Government Official",
        relationshipType: "historical_enmity",
        description:
          "The operator was blamed for the disaster by the Soviet government, which used him as a scapegoat to avoid acknowledging systemic design flaws. The official represents the cover-up that destroyed the operator's reputation.",
      },
      {
        personaAName: "Nuclear Scientist",
        personaBName: "Soviet Government Official",
        relationshipType: "rivalry",
        description:
          "The scientist knows the truth about the reactor design flaws; the official is suppressing it. Their conflict is between scientific honesty and political survival.",
      },
      {
        personaAName: "Liquidator",
        personaBName: "Soviet Government Official",
        relationshipType: "historical_enmity",
        description:
          "The liquidator was sent into the exclusion zone without adequate protection, on orders from the government. The official's decisions directly caused the liquidator's radiation exposure and long-term health damage.",
      },
      {
        personaAName: "Local Resident",
        personaBName: "Soviet Government Official",
        relationshipType: "historical_enmity",
        description:
          "The resident was evacuated from Pripyat and told 'everything is fine' while the government knew the truth. The official's lies cost the resident their home and potentially their health.",
      },
      {
        personaAName: "International Observer",
        personaBName: "Soviet Government Official",
        relationshipType: "rivalry",
        description:
          "The observer represents the international community demanding transparency about the disaster's true scale. The official is managing the information to protect Soviet prestige.",
      },
      {
        personaAName: "Nuclear Scientist",
        personaBName: "Nuclear Plant Operator",
        relationshipType: "mentor_student",
        description:
          "The scientist understands the reactor design that the operator was trained to run. Their relationship is defined by the gap between theoretical knowledge and operational reality.",
      },
    ],
  },
];

// ─── Seed mutation ────────────────────────────────────────────────────────────

export const seedPersonaRelationships = internalMutation({
  args: {},
  handler: async (ctx) => {
    let totalSeeded = 0;

    for (const scenarioRelData of SCENARIO_RELATIONSHIPS) {
      // Find the scenario by title
      const scenario = await ctx.db
        .query("scenarios")
        .filter((q) => q.eq(q.field("title"), scenarioRelData.scenarioTitle))
        .first();

      if (!scenario) {
        console.log(`Scenario not found: ${scenarioRelData.scenarioTitle} — skipping`);
        continue;
      }

      // Check if relationships already exist for this scenario
      const existingRels = await ctx.db
        .query("personaRelationships")
        .withIndex("by_scenarioId", (q) => q.eq("scenarioId", scenario._id))
        .collect();

      if (existingRels.length > 0) {
        console.log(
          `Relationships already seeded for: ${scenarioRelData.scenarioTitle} — skipping`
        );
        continue;
      }

      // Load all personas for this scenario
      const personas = await ctx.db
        .query("personas")
        .withIndex("by_scenarioId", (q) => q.eq("scenarioId", scenario._id))
        .collect();

      const personaByName = new Map(personas.map((p) => [p.name, p._id]));

      // Insert each relationship
      for (const rel of scenarioRelData.relationships) {
        const personaAId = personaByName.get(rel.personaAName);
        const personaBId = personaByName.get(rel.personaBName);

        if (!personaAId) {
          console.log(
            `Persona not found: "${rel.personaAName}" in "${scenarioRelData.scenarioTitle}" — skipping relationship`
          );
          continue;
        }
        if (!personaBId) {
          console.log(
            `Persona not found: "${rel.personaBName}" in "${scenarioRelData.scenarioTitle}" — skipping relationship`
          );
          continue;
        }

        await ctx.db.insert("personaRelationships", {
          scenarioId: scenario._id,
          personaAId,
          personaBId,
          relationshipType: rel.relationshipType,
          description: rel.description,
        });
        totalSeeded++;
      }
    }

    console.log(`Seeded ${totalSeeded} persona relationships.`);
    return { seeded: totalSeeded };
  },
});
