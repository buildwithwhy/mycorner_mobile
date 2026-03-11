import { londonExploreSummaries } from './london';
import { newYorkExploreSummaries } from './new-york';

export interface ExploreSummary {
  blurb: string;
  highlightChips: string[];
}

const allSummaries: Record<string, ExploreSummary> = {
  ...londonExploreSummaries,
  ...newYorkExploreSummaries,
};

export const getExploreSummary = (
  neighborhoodId: string,
): ExploreSummary | undefined => {
  return allSummaries[neighborhoodId];
};
