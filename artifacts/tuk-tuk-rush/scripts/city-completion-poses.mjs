import {
  CITY_QA_LOCATIONS,
  designToWorld,
  inspectionPose,
} from "./city-reconstruction-poses.mjs";
export { designToWorld, inspectionPose };
/** Paired world-space poses. Relocated sites get an additional new-site view;
 * the old location remains in the gallery, rather than hiding relocation cost.
 * This is a capture manifest, never evidence that a capture has been taken. */
export const CITY_COMPLETION_LOCATIONS = [
  ...structuredClone(CITY_QA_LOCATIONS),
  {
    id: "terminal-northwest",
    title: "Terminal 21 corrected northwest Asok site",
    target: [918, 499],
    approach: [945, 530],
    height: 85,
    radius: 180,
    views: ["elevated", "road", "night"],
  },
  {
    id: "asok-intersection",
    title: "Asok intersection and MRT/BTS context",
    target: [945, 550],
    approach: [927, 535],
    height: 25,
    radius: 180,
    views: ["road", "elevated"],
  },
  {
    id: "victory-commercial",
    title: "Victory commercial/bus quarter",
    target: [735, 258],
    approach: [727, 247],
    height: 20,
    radius: 175,
    views: ["road", "elevated"],
  },
  {
    id: "icon-riverfront",
    title: "ICONSIAM river-facing architecture",
    target: [338, 833],
    approach: [390, 835],
    height: 40,
    radius: 230,
    views: ["river", "elevated", "night"],
  },
  {
    id: "oriental-surroundings",
    title: "Mandarin Oriental and Charoen Krung",
    target: [450, 860],
    approach: [490, 860],
    height: 35,
    radius: 190,
    views: ["road", "elevated", "night"],
  },
  {
    id: "shangri-surroundings",
    title: "Shangri-La and Saphan Taksin context",
    target: [460, 931],
    approach: [498, 931],
    height: 45,
    radius: 210,
    views: ["road", "elevated", "night"],
  },
  {
    id: "yaowarat-street",
    title: "Chinatown driving corridor",
    target: [468, 568],
    approach: [450, 555],
    height: 16,
    radius: 130,
    views: ["road", "night"],
  },
  {
    id: "benjakitti-wetlands",
    title: "Benjakitti western forest/wetland topology",
    target: [883, 714],
    approach: [925, 716],
    height: 15,
    radius: 230,
    views: ["elevated", "road", "night"],
  },
];
