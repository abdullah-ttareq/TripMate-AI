import { distanceKm } from "@/lib/geo";

/**
 * Verified photographs for resolved places.
 *
 * The rule this module exists to enforce: a photograph shown beside a named
 * place must actually depict that place. An earlier version of this project
 * failed it — a card labelled "AlUla" displayed a Dubai hotel, because the
 * image URL had been checked for loading but never for subject.
 *
 * So a keyword image search is not good enough. A search for "Hegra" returns
 * something plausible whether or not it is Hegra. Instead this pins down one
 * specific encyclopedia article and then only uses images that article's own
 * subject owns.
 *
 * ## Finding the article
 *
 * Two independent routes, because each alone leaves real places uncovered:
 *
 * 1. **By name.** Ask Wikipedia for the exact titles we already hold, letting
 *    it follow redirects. Redirects are the alias mechanism: they are how
 *    "Senso-ji" reaches "Sensō-ji", "Masmak Fortress" reaches the fortress,
 *    and Arabic or transliterated spellings reach the same article. They are
 *    curated by people, so they encode name variation far better than any
 *    string-similarity rule could.
 *
 * 2. **By position.** Articles geotagged near the coordinates, on both the
 *    English and Arabic Wikipedias. This catches places whose article is
 *    titled nothing like the name the geocoder returned.
 *
 * Route 1 is what this pass added, and it is where most of the gain came from:
 * many real articles are simply not geotagged, or sit outside the radius, or
 * are crowded out of a nearby-articles list.
 *
 * ## Confirming it is the right article
 *
 * A candidate is only accepted with **both** a name agreement and geographic
 * agreement:
 *
 * - Name: for route 1 the title *is* the name we asked for, after redirects.
 *   For route 2 the title, minus any "(qualifier)", must equal a name we hold.
 * - Place: the article's own coordinates must be within a few kilometres of
 *   the resolved place. Where an article carries no coordinates, its Wikidata
 *   description must name the city the place is in.
 *
 * Neither test alone is enough. Name alone matches Hegra in Norway; position
 * alone matches whatever happens to stand nearby.
 *
 * ## Finding an image for it
 *
 * Four sources, in falling order of certainty, stopping at the first answer:
 * the article's own lead image; the image Wikidata records as *the* image of
 * that entity (P18); the lead image of the **same entity's article on another
 * Wikipedia**, reached through its sitelinks; then a photograph from the
 * Commons category Wikidata ties to it.
 *
 * The sitelink step matters more than it sounds. Souq Okadh has an English
 * article with no picture at all, while the Arabic article on the same
 * Wikidata item is illustrated — and a sitelink is that item's own assertion
 * that the two articles describe one subject, so it needs no name matching to
 * be safe.
 *
 * All four are bound to the identified entity rather than to a search term.
 * When none answers, the caller shows the gradient placeholder.
 *
 * Everything here is Wikimedia — Wikipedia, Wikidata and Commons. No key, no
 * account, no billing.
 */

export type PhotoSource = "wikipedia" | "commons";

export type PlacePhoto = {
  /** Wikimedia-hosted image URL. Only ever referenced, never copied. */
  url: string;
  /** The page carrying the image's authorship and licence. */
  articleUrl: string;
  articleTitle: string;
  /** Which credit line to show. */
  source: PhotoSource;
};

/** What the geocoder established about the place we want a photograph of. */
export type PhotoQuery = {
  /** Every name we hold: the itinerary's and the geocoder's official one. */
  names: string[];
  lat: number;
  lon: number;
  /** Used to vouch for an article that carries no coordinates of its own. */
  city: string | null;
  country: string | null;
};

/**
 * Wikipedias consulted, in preference order.
 *
 * English first for coverage. Arabic second because this app's home region is
 * Saudi Arabia, where a place may have a good Arabic article and no English
 * one at all — Jabal Ikmah and Souk Okaz are both like this.
 */
const WIKIS = ["en", "ar"] as const;

type Wiki = (typeof WIKIS)[number];

const COMMONS_HOST = "https://commons.wikimedia.org";
const WIKIDATA_HOST = "https://www.wikidata.org";

function wikiHost(wiki: Wiki): string {
  return `https://${wiki}.wikipedia.org`;
}

/**
 * Wikimedia's user-agent policy asks clients to identify themselves and give a
 * way to be contacted. Anonymous or generic agents get throttled first, and a
 * throttled lookup silently costs every photograph on the page.
 *
 * Replace the URL with the deployed site before going live.
 */
const USER_AGENT =
  "TripMate-AI/1.0 (https://github.com/tripmate-ai; place photo lookup)";

/**
 * How far an article's own pin may sit from the geocoder's before they stop
 * describing the same place.
 *
 * Five kilometres because the two sources pin large sites differently — an
 * archaeological area, a park, a shrine complex — and because the geocoder
 * often returns a street address while the encyclopedia marks the centre of
 * the site. It can afford to be generous: the name still has to agree exactly,
 * and two distinct places within five kilometres sharing an identical name
 * does not happen.
 */
const MAX_DISTANCE_KM = 5;

/** Radius for the nearby-articles route, in metres. */
const SEARCH_RADIUS_METRES = 5000;

const THUMB_WIDTH = 400;

/** Extensions that render as a photograph in an ordinary `img` tag. */
const DISPLAYABLE = /\.(jpe?g|png|webp)$/i;

/**
 * Files in a category that are not photographs of the place.
 *
 * A Commons category reliably contains coats of arms, locator maps and street
 * plans alongside actual photographs. A map where a photograph belongs is not
 * harmful the way a wrong place is, but it looks broken, so they are skipped.
 */
const NOT_A_PHOTOGRAPH =
  /map|locator|logo|seal|flag|coat[_ ]of[_ ]arms|icon|diagram|plan|chart|banner|symbol/i;

/** One Wikipedia page, from either route, with everything needed to judge it. */
type Candidate = {
  wiki: Wiki;
  title: string;
  lat: number | null;
  lon: number | null;
  thumbnail: string | null;
  entityId: string | null;
  isDisambiguation: boolean;
  /** True when we asked for this page by name, so the name already agrees. */
  matchedByName: boolean;
};

type ApiPage = {
  title?: string;
  missing?: boolean;
  coordinates?: { lat?: number; lon?: number }[];
  thumbnail?: { source?: string };
  pageprops?: { wikibase_item?: string; disambiguation?: string };
};

/**
 * Finds a photograph for a place already resolved to coordinates.
 * Returns null whenever the match is not certain enough to display.
 */
export async function findPlacePhoto(query: PhotoQuery): Promise<PlacePhoto | null> {
  try {
    const candidates = await gatherCandidates(query);
    const accepted = await firstAcceptable(candidates, query);

    if (!accepted) return null;

    return await imageFor(accepted);
  } catch (error) {
    console.error("Wikimedia photo lookup failed.", error);
    return null;
  }
}

/** Both routes, English first, deduplicated. */
async function gatherCandidates(query: PhotoQuery): Promise<Candidate[]> {
  const names = [...new Set(query.names.map((n) => n.trim()).filter(Boolean))];

  // Both routes for both wikis run together: they are independent reads and
  // waiting for each in turn would triple the time a photograph takes to
  // appear.
  const batches = await Promise.all([
    ...WIKIS.map((wiki) => pagesByTitle(wiki, names)),
    ...WIKIS.map((wiki) => pagesNearby(wiki, query.lat, query.lon)),
  ]);

  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const batch of batches) {
    for (const candidate of batch) {
      const key = `${candidate.wiki}:${candidate.title}`;
      if (seen.has(key)) continue;

      seen.add(key);
      candidates.push(candidate);
    }
  }

  // Pages we asked for by name are the stronger evidence, and a page that
  // already carries a lead image saves a round trip, so both sort first.
  return candidates.sort(
    (a, b) =>
      Number(b.matchedByName) - Number(a.matchedByName) ||
      Number(Boolean(b.thumbnail)) - Number(Boolean(a.thumbnail)),
  );
}

/**
 * Asks one wiki for exact titles, following redirects.
 *
 * This is the alias mechanism. "Senso-ji", "Sensoji" and "Asakusa Kannon" all
 * redirect to the same article, and every one of those redirects was written
 * by someone asserting they name the same place — a far better source of name
 * variation than any similarity heuristic.
 */
async function pagesByTitle(wiki: Wiki, names: string[]): Promise<Candidate[]> {
  if (names.length === 0) return [];

  const url = new URL(`${wikiHost(wiki)}/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", names.join("|"));
  url.searchParams.set("redirects", "1");
  url.searchParams.set("prop", "coordinates|pageimages|pageprops");
  url.searchParams.set("pithumbsize", String(THUMB_WIDTH));
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");

  const pages = await queryPages(url.toString());

  return pages.map((page) => toCandidate(wiki, page, true));
}

/** Articles geotagged near a point on one wiki. */
async function pagesNearby(
  wiki: Wiki,
  lat: number,
  lon: number,
): Promise<Candidate[]> {
  const url = new URL(`${wikiHost(wiki)}/w/api.php`);
  url.searchParams.set("action", "query");
  // A generator returns the nearby articles *and* their details in one
  // request, rather than a list of titles that then have to be looked up.
  url.searchParams.set("generator", "geosearch");
  url.searchParams.set("ggscoord", `${lat}|${lon}`);
  url.searchParams.set("ggsradius", String(SEARCH_RADIUS_METRES));
  url.searchParams.set("ggslimit", "20");
  url.searchParams.set("prop", "coordinates|pageimages|pageprops");
  url.searchParams.set("pithumbsize", String(THUMB_WIDTH));
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");

  const pages = await queryPages(url.toString());

  return pages.map((page) => toCandidate(wiki, page, false));
}

function toCandidate(wiki: Wiki, page: ApiPage, matchedByName: boolean): Candidate {
  const coordinate = page.coordinates?.[0];

  return {
    wiki,
    title: page.title ?? "",
    lat: coordinate?.lat ?? null,
    lon: coordinate?.lon ?? null,
    thumbnail: page.thumbnail?.source ?? null,
    entityId: page.pageprops?.wikibase_item ?? null,
    isDisambiguation: page.pageprops?.disambiguation !== undefined,
    matchedByName,
  };
}

/** The first candidate that passes both the name and the place test. */
async function firstAcceptable(
  candidates: Candidate[],
  query: PhotoQuery,
): Promise<Candidate | null> {
  for (const candidate of candidates) {
    if (!candidate.title) continue;

    // A disambiguation page is not about one place, so nothing it holds can be
    // trusted as a photograph of this one.
    if (candidate.isDisambiguation) continue;

    if (!candidate.matchedByName && !titleMatchesAny(candidate.title, query.names)) {
      continue;
    }

    if (await isSamePlace(candidate, query)) return candidate;
  }

  return null;
}

/**
 * Whether an article describes the place the geocoder found.
 *
 * The article's own coordinates settle it when it has them. When it does not —
 * common for restaurants, buildings and smaller sites — the fallback is its
 * Wikidata description, which has to name the city. That is weaker than a
 * coordinate, so it is only ever reached for a candidate whose name already
 * matched exactly.
 */
async function isSamePlace(candidate: Candidate, query: PhotoQuery): Promise<boolean> {
  if (candidate.lat !== null && candidate.lon !== null) {
    return (
      distanceKm(query.lat, query.lon, candidate.lat, candidate.lon) <=
      MAX_DISTANCE_KM
    );
  }

  // Only a name-matched candidate earns the weaker test. A nearby article with
  // no coordinates tells us nothing at all.
  if (!candidate.matchedByName || !candidate.entityId) return false;

  const description = await entityDescription(candidate.entityId);
  if (!description) return false;

  const haystack = normalise(description);

  // The city is the discriminating part. A country alone would let a
  // same-named place at the other end of it through.
  const city = query.city ? normalise(query.city) : "";

  return city.length > 2 && haystack.includes(city);
}

/** Resolves the accepted article to an actual image, or null. */
async function imageFor(candidate: Candidate): Promise<PlacePhoto | null> {
  const articleUrl = `${wikiHost(candidate.wiki)}/wiki/${encodeURIComponent(candidate.title)}`;

  // 1. The article's own lead image — the strongest signal available.
  if (candidate.thumbnail) {
    return {
      url: candidate.thumbnail,
      articleTitle: candidate.title,
      articleUrl,
      source: "wikipedia",
    };
  }

  // Plenty of real articles carry no lead image. Wikidata often still knows
  // one for the same entity, which is why coverage does not stop here.
  if (!candidate.entityId) return null;

  const entity = await entityImages(candidate.entityId);
  if (!entity) return null;

  // 2. The entity's designated image.
  if (entity.image && DISPLAYABLE.test(entity.image)) {
    return commonsPhoto(entity.image, candidate.title);
  }

  // 3. The same entity's article on another Wikipedia. Often the only
  //    illustrated one: plenty of places have a bare English stub and a
  //    photographed Arabic article, or the reverse.
  const sibling = await siblingArticleImage(entity.sitelinks, candidate.wiki);

  if (sibling) {
    return {
      url: sibling.url,
      articleTitle: sibling.title,
      articleUrl: `${wikiHost(sibling.wiki)}/wiki/${encodeURIComponent(sibling.title)}`,
      source: "wikipedia",
    };
  }

  // 4. A photograph from the entity's own Commons category. Curated by people
  //    for this exact subject, so still entity-bound rather than a keyword
  //    match, though looser than the three above.
  if (entity.commonsCategory) {
    const file = await firstPhotographIn(entity.commonsCategory);
    if (file) return commonsPhoto(file, candidate.title);
  }

  return null;
}

/** The entity's designated image (P18), Commons category (P373), sitelinks. */
async function entityImages(entityId: string): Promise<{
  image: string | null;
  commonsCategory: string | null;
  sitelinks: Record<string, { title?: string }>;
} | null> {
  const entity = await entityData(entityId);
  if (!entity) return null;

  const claimValue = (property: string): string | null => {
    const value = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
    return typeof value === "string" ? value : null;
  };

  return {
    image: claimValue("P18"),
    commonsCategory: claimValue("P373"),
    sitelinks: entity.sitelinks ?? {},
  };
}

/**
 * The lead image of the same entity's article on a different Wikipedia.
 *
 * No name check is needed or wanted here: the sitelink comes from the Wikidata
 * item we already accepted, so the article is the same subject by definition.
 */
async function siblingArticleImage(
  sitelinks: Record<string, { title?: string }>,
  currentWiki: Wiki,
): Promise<{ url: string; wiki: Wiki; title: string } | null> {
  for (const wiki of WIKIS) {
    if (wiki === currentWiki) continue;

    const title = sitelinks[`${wiki}wiki`]?.title;
    if (!title) continue;

    const [page] = await pagesByTitle(wiki, [title]);

    if (page?.thumbnail) {
      return { url: page.thumbnail, wiki, title: page.title };
    }
  }

  return null;
}

/** The entity's English description, e.g. "sushi restaurant in Tokyo, Japan". */
async function entityDescription(entityId: string): Promise<string | null> {
  const entity = await entityData(entityId);

  return entity?.descriptions?.en?.value ?? null;
}

type Entity = {
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
  descriptions?: Record<string, { value?: string }>;
  /** e.g. { arwiki: { title: "سوق عكاظ" } } — the same subject elsewhere. */
  sitelinks?: Record<string, { title?: string }>;
};

/**
 * One entity, fetched at most once per process.
 *
 * The same entity is asked for its description and then its images, and the
 * same landmark recurs across trips, so this saves a great many requests to a
 * service that throttles anonymous clients.
 */
const entityCache = new Map<string, Entity | null>();

async function entityData(entityId: string): Promise<Entity | null> {
  const cached = entityCache.get(entityId);
  if (cached !== undefined) return cached;

  const body = await getJson(
    `${WIKIDATA_HOST}/wiki/Special:EntityData/${encodeURIComponent(entityId)}.json`,
  );

  const entity =
    (body as { entities?: Record<string, Entity> })?.entities?.[entityId] ?? null;

  if (entityCache.size > 500) entityCache.clear();
  entityCache.set(entityId, entity);

  return entity;
}

/** The first file in a Commons category that looks like an actual photograph. */
async function firstPhotographIn(category: string): Promise<string | null> {
  const url = new URL(`${COMMONS_HOST}/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "categorymembers");
  url.searchParams.set("cmtitle", `Category:${category}`);
  url.searchParams.set("cmtype", "file");
  url.searchParams.set("cmlimit", "30");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");

  const body = await getJson(url.toString());
  if (!body) return null;

  const members =
    (body as { query?: { categorymembers?: { title?: string }[] } }).query
      ?.categorymembers ?? [];

  for (const member of members) {
    // "File:Hegra tomb.jpg" -> "Hegra tomb.jpg"
    const name = (member.title ?? "").replace(/^File:/, "");

    if (!DISPLAYABLE.test(name)) continue;
    if (NOT_A_PHOTOGRAPH.test(name)) continue;

    return name;
  }

  return null;
}

/**
 * A Commons file rendered at thumbnail width.
 *
 * `Special:FilePath` resolves a file name to the current image without needing
 * to know which server or hash directory holds it, and `width` makes it return
 * a resized copy rather than a full-resolution original.
 */
function commonsPhoto(fileName: string, articleTitle: string): PlacePhoto {
  const encoded = encodeURIComponent(fileName.replace(/ /g, "_"));

  return {
    url: `${COMMONS_HOST}/wiki/Special:FilePath/${encoded}?width=${THUMB_WIDTH}`,
    // The file page, not the article: that is where the photographer and
    // licence are recorded, which is what attribution has to point at.
    articleUrl: `${COMMONS_HOST}/wiki/File:${encoded}`,
    articleTitle,
    source: "commons",
  };
}

/** Runs a query and returns its pages, dropping the ones that do not exist. */
async function queryPages(url: string): Promise<ApiPage[]> {
  const body = await getJson(url);
  if (!body) return [];

  const pages = (body as { query?: { pages?: ApiPage[] } }).query?.pages ?? [];

  return pages.filter((page) => !page.missing && page.title);
}

/** One JSON GET with the shared headers, timeout and error reporting. */
async function getJson(url: string): Promise<unknown | null> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    // Worth logging rather than swallowing: a throttled lookup looks exactly
    // like "this place has no article", and would quietly turn every
    // photograph on the page into a placeholder.
    console.error(`Wikimedia request returned ${response.status}: ${url}`);
    return null;
  }

  return response.json();
}

/**
 * Whether an article title names the same place as any of the names we hold.
 *
 * Used only for the nearby-articles route, where nothing yet ties the article
 * to our name. The comparison is exact once a trailing parenthetical qualifier
 * is dropped, because Wikipedia disambiguates titles in a way geocoders do
 * not: "Hegra (Mada'in Salih)" and "Hegra" are the same place.
 *
 * Anything looser was tried and rejected. Allowing one title to merely
 * *contain* the other matched the article "Shibuya" — the whole district — to
 * the place "Shibuya Scramble Crossing", and produced a skyline photograph
 * captioned as a specific street crossing. A broader article is exactly the
 * kind of plausible-but-wrong image this module exists to keep out, so the
 * rule is equality or nothing.
 */
function titleMatchesAny(articleTitle: string, names: string[]): boolean {
  const article = normalise(stripQualifier(articleTitle));
  if (!article) return false;

  return names.some((name) => {
    const candidate = normalise(name);
    return candidate.length > 0 && candidate === article;
  });
}

/** "Hegra (Mada'in Salih)" -> "Hegra". */
function stripQualifier(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "");
}

/** Lowercase, strip accents, and drop anything that is not a letter or digit. */
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]/g, "");
}
