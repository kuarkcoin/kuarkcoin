// data/levels/c2_topics.ts

export type C2TopicSlug =
  | "inversion-advanced"
  | "cleft-sentences"
  | "elliptical-structures"
  | "advanced-conditionals"
  | "complex-passives"
  | "modal-perfect-complex";

export type C2Topic = {
  slug: C2TopicSlug;
  title: string;
  description: string;
};

export const c2Topics: C2Topic[] = [
  {
    slug: "inversion-advanced",
    title: "Advanced Inversion",
    description:
      "Rare and formal inversion structures used for emphasis, including negative adverbials, conditional inversion, and literary-style inversion.",
  },
  {
    slug: "cleft-sentences",
    title: "Cleft Sentences",
    description:
      "Highly advanced focus structures such as ‘It-clefts’, ‘Wh-clefts’, and ‘All-clefts’ used to emphasize specific parts of a sentence.",
  },
  {
    slug: "elliptical-structures",
    title: "Elliptical Structures",
    description:
      "Ellipsis patterns such as clause reduction, verbless clauses, and omission techniques common in native academic writing.",
  },
  {
    slug: "advanced-conditionals",
    title: "Advanced Conditionals",
    description:
      "Mixed conditionals, implied conditionals, and non-standard conditional forms used in native-level English.",
  },
  {
    slug: "complex-passives",
    title: "Complex Passives",
    description:
      "Advanced passive forms including reporting passives, modal passives, and multi-clause passive constructions.",
  },
  {
    slug: "modal-perfect-complex",
    title: "Modal Perfect (C2)",
    description:
      "Highly nuanced modal perfect forms expressing speculation, deduction, and unreal past meanings at a C2-native level.",
  },
];

