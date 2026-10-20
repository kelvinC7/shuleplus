export type SchoolProfileInput = {
  organizationName: string;
  establishedDate?: string;
  provinceName?: string;
  districtName?: string;
  sectorName?: string;
  schoolCategory?: string;
  schoolProgram?: string;
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
};

export function formatEstablishedDisplay(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatProgramLabel(program?: string): string {
  if (program === "Mixed") return "Mixed — Day & Boarding";
  if (program === "Boarding") return "Boarding";
  if (program === "Day") return "Day";
  return program?.trim() || "—";
}

export function formatLocationLine(input: SchoolProfileInput): string {
  const parts: string[] = [];
  if (input.provinceName) parts.push(`${input.provinceName} Province`);
  if (input.districtName) parts.push(`${input.districtName} District`);
  if (input.sectorName) parts.push(`${input.sectorName} Sector`);
  return parts.length ? parts.join(" · ") : "—";
}

export function formatDotList(items: string[]): string {
  return items.length ? items.join(" · ") : "—";
}

function formatNaturalList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function categoryPhrase(category?: string): string {
  if (!category) return "registered";
  if (category === "Government-Aided") return "government-aided";
  return category.toLowerCase();
}

function programPhrase(program?: string): string {
  if (program === "Mixed") return "mixed day and boarding learning environment";
  if (program === "Boarding") return "boarding-focused learning environment";
  return "day learning environment";
}

function locationSentence(input: SchoolProfileInput): string {
  if (input.sectorName && input.districtName && input.provinceName) {
    return `${input.sectorName} Sector, ${input.districtName} District, ${input.provinceName} Province`;
  }
  if (input.districtName && input.provinceName) {
    return `${input.districtName} District, ${input.provinceName} Province`;
  }
  if (input.districtName) return `${input.districtName} District`;
  if (input.provinceName) return `${input.provinceName} Province`;
  return "Rwanda";
}

export function generateSchoolDescription(input: SchoolProfileInput): string {
  const name = input.organizationName.trim();
  if (!name) return "";

  const paragraphs: string[] = [];
  const category = categoryPhrase(input.schoolCategory);
  const location = locationSentence(input);
  const established = formatEstablishedDisplay(input.establishedDate);

  let intro = `${name} is a ${category} school located in ${location}.`;
  if (established) {
    intro += ` Established on ${established}, the school provides a ${programPhrase(input.schoolProgram)} designed to support students throughout their educational journey.`;
  } else if (input.schoolProgram) {
    intro += ` The school provides a ${programPhrase(input.schoolProgram)} designed to support students throughout their educational journey.`;
  }
  paragraphs.push(intro);

  const levels = input.educationLevels;
  if (levels.length > 0) {
    let levelsParagraph = `The school offers education across multiple levels, including ${formatNaturalList(levels)}.`;
    if (input.aLevelCombinations.length > 0) {
      levelsParagraph += ` At A-Level, students can pursue combinations such as ${formatNaturalList(input.aLevelCombinations)}, providing opportunities to develop knowledge and skills in different academic fields.`;
    }
    paragraphs.push(levelsParagraph);
  }

  if (input.tvetTrades.length === 1) {
    paragraphs.push(
      `The school also provides technical and vocational education through its ${input.tvetTrades[0]} trade, helping students develop practical skills relevant to technology and future career opportunities.`,
    );
  } else if (input.tvetTrades.length > 1) {
    paragraphs.push(
      `The school also provides technical and vocational education through trades including ${formatNaturalList(input.tvetTrades)}, helping students develop practical skills relevant to technology and future career opportunities.`,
    );
  }

  if (levels.length > 0 || input.tvetTrades.length > 0) {
    paragraphs.push(
      `${name} serves learners across ${levels.length > 1 ? "these levels" : "this level"} with programs aligned to national education standards.`,
    );
  }

  return paragraphs.join("\n\n");
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
