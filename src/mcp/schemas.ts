import { toStandardJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";

export const getCalendarOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        weekday: v.optional(
          v.object({
            en: v.optional(v.string()),
            cn: v.optional(v.string()),
            ja: v.optional(v.string()),
            id: v.optional(v.number()),
          }),
        ),
        items: v.optional(
          v.array(
            v.object({
              id: v.optional(v.number()),
              url: v.optional(v.string()),
              type: v.optional(v.picklist([1, 2, 3, 4, 6])),
              name: v.optional(v.string()),
              name_cn: v.optional(v.string()),
              summary: v.optional(v.string()),
              air_date: v.optional(v.string()),
              air_weekday: v.optional(v.number()),
              images: v.optional(
                v.object({
                  large: v.optional(v.string()),
                  common: v.optional(v.string()),
                  medium: v.optional(v.string()),
                  small: v.optional(v.string()),
                  grid: v.optional(v.string()),
                }),
              ),
              eps: v.optional(v.number()),
              eps_count: v.optional(v.number()),
              rating: v.optional(
                v.object({
                  total: v.optional(v.number()),
                  score: v.optional(v.number()),
                  count: v.optional(
                    v.object({
                      "1": v.optional(v.number()),
                      "2": v.optional(v.number()),
                      "3": v.optional(v.number()),
                      "4": v.optional(v.number()),
                      "5": v.optional(v.number()),
                      "6": v.optional(v.number()),
                      "7": v.optional(v.number()),
                      "8": v.optional(v.number()),
                      "9": v.optional(v.number()),
                      "10": v.optional(v.number()),
                    }),
                  ),
                }),
              ),
              rank: v.optional(v.number()),
              collection: v.optional(
                v.object({
                  wish: v.optional(v.number()),
                  collect: v.optional(v.number()),
                  doing: v.optional(v.number()),
                  on_hold: v.optional(v.number()),
                  dropped: v.optional(v.number()),
                }),
              ),
            }),
          ),
        ),
      }),
    ),
  }),
);

export const searchSubjectsInputSchema = toStandardJsonSchema(
  v.object({
    limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Pagination limit"))),
    offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Pagination offset"))),
    keyword: v.pipe(v.string(), v.description("Search keyword")),
    sort: v.optional(
      v.pipe(
        v.picklist(["match", "heat", "rank", "score"]),
        v.description(
          "Sort order:\n- `match`: Default, by relevance match\n- `heat`: By number of users tracking/collecting\n- `rank`: By ranking (highest to lowest)\n- `score`: By rating score",
        ),
      ),
    ),
    filter: v.optional(
      v.pipe(
        v.object({
          type: v.optional(
            v.pipe(
              v.array(
                v.pipe(
                  v.picklist([1, 2, 3, 4, 6]),
                  v.description(
                    "Media type: 1=Book/Manga/Novel, 2=Anime, 3=Music, 4=Game, 6=Live-action/Real (no 5)",
                  ),
                ),
              ),
              v.description(
                "Media types list (1=Book/Manga/Novel, 2=Anime, 3=Music, 4=Game, 6=Live-action/Real). Multiple values are combined with OR.",
              ),
            ),
          ),
          meta_tags: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "Official meta tags list, combined with AND. Prefix with `-` to exclude a tag (e.g., `-科幻`).",
              ),
            ),
          ),
          tag: v.optional(
            v.pipe(v.array(v.string()), v.description("User tags list, combined with AND.")),
          ),
          air_date: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "Air/release date filter (`YYYY-MM-DD` with comparison prefix like `>=2020-07-01` or `<2020-10-01`), combined with AND.",
              ),
            ),
          ),
          rating: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "Rating score filter (with comparison prefix like `>=6` or `<=8`), combined with AND.",
              ),
            ),
          ),
          rating_count: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "Rating vote count filter (with comparison prefix like `>=200` or `<=5000`), combined with AND.",
              ),
            ),
          ),
          rank: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "Ranking filter (with comparison prefix like `>100` or `<=200`), combined with AND.",
              ),
            ),
          ),
          nsfw: v.optional(
            v.pipe(
              v.boolean(),
              v.description(
                "NSFW/R18 filter: omit to include all; `true` for R18 only; `false` for non-R18 only (ignored for unprivileged users, who never receive R18 results).",
              ),
            ),
          ),
        }),
        v.description("Filter conditions, combined across fields with AND."),
      ),
    ),
  }),
);

export const searchSubjectsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        type: v.picklist([1, 2, 3, 4, 6]),
        name: v.string(),
        name_cn: v.string(),
        summary: v.string(),
        series: v.boolean(),
        nsfw: v.boolean(),
        locked: v.boolean(),
        date: v.nullish(v.string()),
        platform: v.string(),
        images: v.object({
          large: v.string(),
          common: v.string(),
          medium: v.string(),
          small: v.string(),
          grid: v.string(),
        }),
        infobox: v.optional(
          v.array(
            v.object({
              key: v.string(),
              value: v.union([
                v.string(),
                v.array(v.object({ k: v.optional(v.string()), v: v.string() })),
              ]),
            }),
          ),
        ),
        volumes: v.number(),
        eps: v.number(),
        total_episodes: v.number(),
        rating: v.object({
          rank: v.number(),
          total: v.number(),
          score: v.number(),
          count: v.object({
            "1": v.optional(v.number()),
            "2": v.optional(v.number()),
            "3": v.optional(v.number()),
            "4": v.optional(v.number()),
            "5": v.optional(v.number()),
            "6": v.optional(v.number()),
            "7": v.optional(v.number()),
            "8": v.optional(v.number()),
            "9": v.optional(v.number()),
            "10": v.optional(v.number()),
          }),
        }),
        collection: v.object({
          wish: v.number(),
          collect: v.number(),
          doing: v.number(),
          on_hold: v.number(),
          dropped: v.number(),
        }),
        meta_tags: v.array(v.string()),
        tags: v.array(v.object({ name: v.string(), count: v.number(), total_count: v.number() })),
      }),
    ),
  }),
);

export const searchCharactersInputSchema = toStandardJsonSchema(
  v.object({
    limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Pagination limit"))),
    offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Pagination offset"))),
    keyword: v.pipe(v.string(), v.description("Search keyword")),
    filter: v.optional(
      v.pipe(
        v.object({
          nsfw: v.optional(
            v.pipe(
              v.boolean(),
              v.description(
                "NSFW/R18 filter: omit to include all; `true` for R18 characters only; `false` for non-R18 characters only (ignored for unprivileged users).",
              ),
            ),
          ),
        }),
        v.description("Filter conditions, combined across fields with AND."),
      ),
    ),
  }),
);

export const searchCharactersOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3, 4]),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        summary: v.string(),
        locked: v.boolean(),
        infobox: v.nullish(v.array(v.record(v.string(), v.unknown()))),
        gender: v.nullish(v.string()),
        blood_type: v.nullish(v.picklist([1, 2, 3, 4])),
        birth_year: v.nullish(v.number()),
        birth_mon: v.nullish(v.number()),
        birth_day: v.nullish(v.number()),
        stat: v.object({ comments: v.number(), collects: v.number() }),
      }),
    ),
  }),
);

export const searchPersonsInputSchema = toStandardJsonSchema(
  v.object({
    limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Pagination limit"))),
    offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Pagination offset"))),
    keyword: v.pipe(v.string(), v.description("Search keyword")),
    filter: v.optional(
      v.pipe(
        v.object({
          career: v.optional(
            v.pipe(
              v.array(
                v.picklist([
                  "producer",
                  "mangaka",
                  "artist",
                  "seiyu",
                  "writer",
                  "illustrator",
                  "actor",
                ]),
              ),
              v.description("Career/role filter list, combined with AND."),
            ),
          ),
        }),
        v.description("Filter conditions, combined across fields with AND."),
      ),
    ),
  }),
);

export const searchPersonsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3]),
        career: v.array(
          v.picklist(["producer", "mangaka", "artist", "seiyu", "writer", "illustrator", "actor"]),
        ),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        short_summary: v.string(),
        locked: v.boolean(),
      }),
    ),
  }),
);

export const getSubjectsInputSchema = toStandardJsonSchema(
  v.object({
    type: v.pipe(
      v.picklist([1, 2, 3, 4, 6]),
      v.description("Media type: 1=Book/Manga/Novel, 2=Anime, 3=Music, 4=Game, 6=Live-action/Real"),
    ),
    cat: v.optional(
      v.pipe(
        v.union([
          v.pipe(
            v.picklist([0, 1001, 1002, 1003]),
            v.description(
              "Book subcategory: 0=Other, 1001=Comic/Manga, 1002=Novel, 1003=Illustration/Artbook",
            ),
          ),
          v.pipe(
            v.picklist([0, 1, 2, 3, 5]),
            v.description("Anime subcategory: 0=Other, 1=TV, 2=OVA, 3=Movie, 5=WEB"),
          ),
          v.pipe(
            v.picklist([0, 4001, 4003, 4002, 4005]),
            v.description(
              "Game subcategory: 0=Other, 4001=Games, 4002=Software, 4003=DLC/Expansion, 4005=Tabletop",
            ),
          ),
          v.pipe(
            v.picklist([0, 1, 2, 3, 6001, 6002, 6003, 6004]),
            v.description(
              "Live-action subcategory: 0=Other, 1=JP Drama, 2=Western/US-EU Drama, 3=Chinese Drama, 6001=TV Drama, 6002=Movie, 6003=Live/Performance, 6004=Variety Show",
            ),
          ),
        ]),
        v.description("Media subcategory (must match `type`)"),
      ),
    ),
    series: v.optional(
      v.pipe(
        v.boolean(),
        v.description("Whether to filter for book series entries (only valid for Book type)"),
      ),
    ),
    platform: v.optional(
      v.pipe(v.string(), v.description("Game platform filter (only valid for Game type)")),
    ),
    sort: v.optional(
      v.pipe(v.picklist(["date", "rank"]), v.description("Sort order (`date` or `rank`)")),
    ),
    year: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Release/air year"))),
    month: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("Release/air month"))),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(50),
        v.description("Pagination limit (1-50)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getSubjectsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        type: v.picklist([1, 2, 3, 4, 6]),
        name: v.string(),
        name_cn: v.string(),
        summary: v.string(),
        series: v.boolean(),
        nsfw: v.boolean(),
        locked: v.boolean(),
        date: v.nullish(v.string()),
        platform: v.string(),
        images: v.object({
          large: v.string(),
          common: v.string(),
          medium: v.string(),
          small: v.string(),
          grid: v.string(),
        }),
        infobox: v.optional(
          v.array(
            v.object({
              key: v.string(),
              value: v.union([
                v.string(),
                v.array(v.object({ k: v.optional(v.string()), v: v.string() })),
              ]),
            }),
          ),
        ),
        volumes: v.number(),
        eps: v.number(),
        total_episodes: v.number(),
        rating: v.object({
          rank: v.number(),
          total: v.number(),
          score: v.number(),
          count: v.object({
            "1": v.optional(v.number()),
            "2": v.optional(v.number()),
            "3": v.optional(v.number()),
            "4": v.optional(v.number()),
            "5": v.optional(v.number()),
            "6": v.optional(v.number()),
            "7": v.optional(v.number()),
            "8": v.optional(v.number()),
            "9": v.optional(v.number()),
            "10": v.optional(v.number()),
          }),
        }),
        collection: v.object({
          wish: v.number(),
          collect: v.number(),
          doing: v.number(),
          on_hold: v.number(),
          dropped: v.number(),
        }),
        meta_tags: v.array(v.string()),
        tags: v.array(v.object({ name: v.string(), count: v.number(), total_count: v.number() })),
      }),
    ),
  }),
);

export const getSubjectByIdInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Media entry ID (anime, manga, book, music, game, or show)"),
    ),
  }),
);

export const getSubjectByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    type: v.picklist([1, 2, 3, 4, 6]),
    name: v.string(),
    name_cn: v.string(),
    summary: v.string(),
    series: v.boolean(),
    nsfw: v.boolean(),
    locked: v.boolean(),
    date: v.nullish(v.string()),
    platform: v.string(),
    images: v.object({
      large: v.string(),
      common: v.string(),
      medium: v.string(),
      small: v.string(),
      grid: v.string(),
    }),
    infobox: v.optional(
      v.array(
        v.object({
          key: v.string(),
          value: v.union([
            v.string(),
            v.array(v.object({ k: v.optional(v.string()), v: v.string() })),
          ]),
        }),
      ),
    ),
    volumes: v.number(),
    eps: v.number(),
    total_episodes: v.number(),
    rating: v.object({
      rank: v.number(),
      total: v.number(),
      score: v.number(),
      count: v.object({
        "1": v.optional(v.number()),
        "2": v.optional(v.number()),
        "3": v.optional(v.number()),
        "4": v.optional(v.number()),
        "5": v.optional(v.number()),
        "6": v.optional(v.number()),
        "7": v.optional(v.number()),
        "8": v.optional(v.number()),
        "9": v.optional(v.number()),
        "10": v.optional(v.number()),
      }),
    }),
    collection: v.object({
      wish: v.number(),
      collect: v.number(),
      doing: v.number(),
      on_hold: v.number(),
      dropped: v.number(),
    }),
    meta_tags: v.array(v.string()),
    tags: v.array(v.object({ name: v.string(), count: v.number(), total_count: v.number() })),
  }),
);

export const getSubjectImageByIdInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    type: v.pipe(
      v.picklist(["small", "grid", "large", "medium", "common"]),
      v.description("Image size"),
    ),
  }),
);

export const getSubjectImageByIdOutputSchema = toStandardJsonSchema(
  v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
);

export const getRelatedPersonsBySubjectIdInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
  }),
);

export const getRelatedPersonsBySubjectIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3]),
        career: v.array(
          v.picklist(["producer", "mangaka", "artist", "seiyu", "writer", "illustrator", "actor"]),
        ),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        relation: v.string(),
        eps: v.string(),
      }),
    ),
  }),
);

export const getRelatedCharactersBySubjectIdInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
  }),
);

export const getRelatedCharactersBySubjectIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        summary: v.string(),
        type: v.picklist([1, 2, 3, 4]),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        relation: v.string(),
        actors: v.array(
          v.object({
            id: v.number(),
            name: v.string(),
            type: v.picklist([1, 2, 3]),
            career: v.array(
              v.picklist([
                "producer",
                "mangaka",
                "artist",
                "seiyu",
                "writer",
                "illustrator",
                "actor",
              ]),
            ),
            images: v.nullish(
              v.object({
                large: v.string(),
                medium: v.string(),
                small: v.string(),
                grid: v.string(),
              }),
            ),
            short_summary: v.string(),
            locked: v.boolean(),
          }),
        ),
      }),
    ),
  }),
);

export const getRelatedSubjectsBySubjectIdInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
  }),
);

export const getRelatedSubjectsBySubjectIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        type: v.number(),
        name: v.string(),
        name_cn: v.string(),
        images: v.optional(
          v.object({
            large: v.string(),
            common: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        relation: v.string(),
      }),
    ),
  }),
);

export const getEpisodesInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    type: v.optional(
      v.pipe(
        v.picklist([0, 1, 2, 3, 4, 5, 6]),
        v.description(
          "Episode type: 0=Main story, 1=Special/OVA, 2=OP (Opening), 3=ED (Ending), 4=PV/Trailer/Promo/Ad, 5=MAD, 6=Other",
        ),
      ),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(200),
        v.description("Pagination limit (1-200)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getEpisodesOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        type: v.number(),
        name: v.string(),
        name_cn: v.string(),
        sort: v.number(),
        ep: v.optional(v.number()),
        airdate: v.string(),
        comment: v.number(),
        duration: v.string(),
        desc: v.string(),
        disc: v.number(),
        duration_seconds: v.optional(v.number()),
      }),
    ),
  }),
);

export const getEpisodeByIdInputSchema = toStandardJsonSchema(
  v.object({
    episode_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Episode or track ID"),
    ),
  }),
);

export const getEpisodeByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    type: v.picklist([0, 1, 2, 3, 4, 5, 6]),
    name: v.string(),
    name_cn: v.string(),
    sort: v.number(),
    ep: v.optional(v.number()),
    airdate: v.string(),
    comment: v.number(),
    duration: v.string(),
    desc: v.string(),
    disc: v.number(),
    subject_id: v.number(),
  }),
);

export const getCharacterByIdInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
  }),
);

export const getCharacterByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    name: v.string(),
    type: v.picklist([1, 2, 3, 4]),
    images: v.nullish(
      v.object({
        large: v.string(),
        medium: v.string(),
        small: v.string(),
        grid: v.string(),
      }),
    ),
    summary: v.string(),
    locked: v.boolean(),
    infobox: v.nullish(v.array(v.record(v.string(), v.unknown()))),
    gender: v.nullish(v.string()),
    blood_type: v.nullish(v.picklist([1, 2, 3, 4])),
    birth_year: v.nullish(v.number()),
    birth_mon: v.nullish(v.number()),
    birth_day: v.nullish(v.number()),
    stat: v.object({ comments: v.number(), collects: v.number() }),
  }),
);

export const getCharacterImageByIdInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
    type: v.pipe(v.picklist(["small", "grid", "large", "medium"]), v.description("Image size")),
  }),
);

export const getCharacterImageByIdOutputSchema = toStandardJsonSchema(
  v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
);

export const getRelatedSubjectsByCharacterIdInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
  }),
);

export const getRelatedSubjectsByCharacterIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        type: v.picklist([1, 2, 3, 4, 6]),
        staff: v.string(),
        eps: v.string(),
        name: v.string(),
        name_cn: v.string(),
        image: v.optional(v.string()),
      }),
    ),
  }),
);

export const getRelatedPersonsByCharacterIdInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
  }),
);

export const getRelatedPersonsByCharacterIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3, 4]),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        subject_id: v.number(),
        subject_type: v.picklist([1, 2, 3, 4, 6]),
        subject_name: v.string(),
        subject_name_cn: v.string(),
        staff: v.optional(v.string()),
      }),
    ),
  }),
);

export const collectCharacterInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
  }),
);

export const collectCharacterOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const uncollectCharacterInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
  }),
);

export const uncollectCharacterOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getPersonByIdInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or studio ID"),
    ),
  }),
);

export const getPersonByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    name: v.string(),
    type: v.picklist([1, 2, 3]),
    career: v.array(
      v.picklist(["producer", "mangaka", "artist", "seiyu", "writer", "illustrator", "actor"]),
    ),
    images: v.nullish(
      v.object({
        large: v.string(),
        medium: v.string(),
        small: v.string(),
        grid: v.string(),
      }),
    ),
    summary: v.string(),
    locked: v.boolean(),
    last_modified: v.string(),
    infobox: v.nullish(v.array(v.record(v.string(), v.unknown()))),
    gender: v.nullish(v.string()),
    blood_type: v.nullish(v.picklist([1, 2, 3, 4])),
    birth_year: v.nullish(v.number()),
    birth_mon: v.nullish(v.number()),
    birth_day: v.nullish(v.number()),
    stat: v.object({ comments: v.number(), collects: v.number() }),
  }),
);

export const getPersonImageByIdInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or studio ID"),
    ),
    type: v.pipe(v.picklist(["small", "grid", "large", "medium"]), v.description("Image size")),
  }),
);

export const getPersonImageByIdOutputSchema = toStandardJsonSchema(
  v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
);

export const getRelatedSubjectsByPersonIdInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or studio ID"),
    ),
  }),
);

export const getRelatedSubjectsByPersonIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        type: v.picklist([1, 2, 3, 4, 6]),
        staff: v.string(),
        eps: v.string(),
        name: v.string(),
        name_cn: v.string(),
        image: v.optional(v.string()),
      }),
    ),
  }),
);

export const getRelatedCharactersByPersonIdInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or voice actor ID"),
    ),
  }),
);

export const getRelatedCharactersByPersonIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3, 4]),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        subject_id: v.number(),
        subject_type: v.picklist([1, 2, 3, 4, 6]),
        subject_name: v.string(),
        subject_name_cn: v.string(),
        staff: v.optional(v.string()),
      }),
    ),
  }),
);

export const collectPersonInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or studio ID"),
    ),
  }),
);

export const collectPersonOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const uncollectPersonInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or studio ID"),
    ),
  }),
);

export const uncollectPersonOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getUserByNameInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
  }),
);

export const getUserByNameOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    username: v.string(),
    nickname: v.string(),
    user_group: v.picklist([1, 2, 3, 4, 5, 8, 9, 10, 11]),
    avatar: v.object({ large: v.string(), medium: v.string(), small: v.string() }),
    sign: v.string(),
  }),
);

export const getUserAvatarByNameInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
    type: v.pipe(v.picklist(["small", "large", "medium"]), v.description("Avatar image size")),
  }),
);

export const getUserAvatarByNameOutputSchema = toStandardJsonSchema(
  v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
);

export const getMeOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    username: v.string(),
    nickname: v.string(),
    user_group: v.picklist([1, 2, 3, 4, 5, 8, 9, 10, 11]),
    avatar: v.object({ large: v.string(), medium: v.string(), small: v.string() }),
    sign: v.string(),
    email: v.optional(v.string()),
    reg_time: v.optional(v.string()),
    time_offset: v.optional(v.number()),
  }),
);

export const getUserCollectionsInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
    subject_type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 6]),
        v.description(
          "Media type filter (defaults to all): 1=Book/Manga/Novel, 2=Anime, 3=Music, 4=Game, 6=Live-action/Real",
        ),
      ),
    ),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 5]),
        v.description(
          "Tracking/watch status filter (defaults to all): 1=Wish (Plan to watch/read), 2=Collect (Completed/Watched), 3=Doing (Watching/Reading), 4=On hold, 5=Dropped",
        ),
      ),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(50),
        v.description("Pagination limit (1-50)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getUserCollectionsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        subject_id: v.number(),
        subject_type: v.picklist([1, 2, 3, 4, 6]),
        rate: v.number(),
        type: v.picklist([1, 2, 3, 4, 5]),
        comment: v.optional(v.string()),
        tags: v.array(v.string()),
        ep_status: v.number(),
        vol_status: v.number(),
        updated_at: v.string(),
        private: v.boolean(),
        subject: v.optional(
          v.object({
            id: v.number(),
            type: v.picklist([1, 2, 3, 4, 6]),
            name: v.string(),
            name_cn: v.string(),
            short_summary: v.string(),
            date: v.nullish(v.string()),
            images: v.object({
              large: v.string(),
              common: v.string(),
              medium: v.string(),
              small: v.string(),
              grid: v.string(),
            }),
            volumes: v.number(),
            eps: v.number(),
            collection_total: v.number(),
            score: v.number(),
            rank: v.number(),
            tags: v.array(
              v.object({ name: v.string(), count: v.number(), total_count: v.number() }),
            ),
          }),
        ),
      }),
    ),
  }),
);

export const getUserCollectionInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
  }),
);

export const getUserCollectionOutputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.number(),
    subject_type: v.picklist([1, 2, 3, 4, 6]),
    rate: v.number(),
    type: v.picklist([1, 2, 3, 4, 5]),
    comment: v.optional(v.string()),
    tags: v.array(v.string()),
    ep_status: v.number(),
    vol_status: v.number(),
    updated_at: v.string(),
    private: v.boolean(),
    subject: v.optional(
      v.object({
        id: v.number(),
        type: v.picklist([1, 2, 3, 4, 6]),
        name: v.string(),
        name_cn: v.string(),
        short_summary: v.string(),
        date: v.nullish(v.string()),
        images: v.object({
          large: v.string(),
          common: v.string(),
          medium: v.string(),
          small: v.string(),
          grid: v.string(),
        }),
        volumes: v.number(),
        eps: v.number(),
        collection_total: v.number(),
        score: v.number(),
        rank: v.number(),
        tags: v.array(v.object({ name: v.string(), count: v.number(), total_count: v.number() })),
      }),
    ),
  }),
);

export const postUserCollectionInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 5]),
        v.description(
          "Tracking/watch status: 1=Wish (Plan to watch/read), 2=Collect (Completed/Watched), 3=Doing (Watching/Reading), 4=On hold, 5=Dropped",
        ),
      ),
    ),
    rate: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.maxValue(10),
        v.description("Rating score (1-10, `0` removes the rating)"),
      ),
    ),
    ep_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("Chapters read progress (only applicable to Book/Manga entries)"),
      ),
    ),
    vol_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("Volumes read progress (only applicable to Book/Manga entries)"),
      ),
    ),
    comment: v.optional(v.pipe(v.string(), v.description("Short review / comment"))),
    private: v.optional(v.pipe(v.boolean(), v.description("Whether visible only to yourself"))),
    tags: v.optional(
      v.pipe(
        v.array(v.pipe(v.string(), v.description("Single tag (must not contain spaces)"))),
        v.description(
          "Tags list (omit to leave unchanged; pass empty array `[]` to clear all tags)",
        ),
      ),
    ),
  }),
);

export const postUserCollectionOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const patchUserCollectionInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 5]),
        v.description(
          "Tracking/watch status: 1=Wish (Plan to watch/read), 2=Collect (Completed/Watched), 3=Doing (Watching/Reading), 4=On hold, 5=Dropped",
        ),
      ),
    ),
    rate: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.maxValue(10),
        v.description("Rating score (1-10, `0` removes the rating)"),
      ),
    ),
    ep_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("Chapters read progress (only applicable to Book/Manga entries)"),
      ),
    ),
    vol_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("Volumes read progress (only applicable to Book/Manga entries)"),
      ),
    ),
    comment: v.optional(v.pipe(v.string(), v.description("Short review / comment"))),
    private: v.optional(v.pipe(v.boolean(), v.description("Whether visible only to yourself"))),
    tags: v.optional(
      v.pipe(
        v.array(v.pipe(v.string(), v.description("Single tag (must not contain spaces)"))),
        v.description(
          "Tags list (omit to leave unchanged; pass empty array `[]` to clear all tags)",
        ),
      ),
    ),
  }),
);

export const patchUserCollectionOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getUserSubjectEpisodeCollectionInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(1000),
        v.description("Pagination limit (1-1000)"),
      ),
    ),
    episode_type: v.optional(
      v.pipe(
        v.picklist([0, 1, 2, 3, 4, 5, 6]),
        v.description(
          "Episode type filter (omit for all): 0=Main story, 1=Special/OVA, 2=OP, 3=ED, 4=PV/Trailer/Promo, 5=MAD, 6=Other",
        ),
      ),
    ),
  }),
);

export const getUserSubjectEpisodeCollectionOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.optional(
      v.array(
        v.object({
          episode: v.object({
            id: v.number(),
            type: v.number(),
            name: v.string(),
            name_cn: v.string(),
            sort: v.number(),
            ep: v.optional(v.number()),
            airdate: v.string(),
            comment: v.number(),
            duration: v.string(),
            desc: v.string(),
            disc: v.number(),
            duration_seconds: v.optional(v.number()),
          }),
          type: v.picklist([0, 1, 2, 3]),
          updated_at: v.number(),
        }),
      ),
    ),
  }),
);

export const patchUserSubjectEpisodeCollectionInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    episode_id: v.pipe(
      v.array(v.pipe(v.number(), v.safeInteger())),
      v.description("List of episode IDs to update"),
    ),
    type: v.pipe(
      v.picklist([0, 1, 2, 3]),
      v.description(
        "Episode watch status: 0=Unwatched/Uncollected, 1=Wish to watch, 2=Watched, 3=Dropped",
      ),
    ),
  }),
);

export const patchUserSubjectEpisodeCollectionOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getUserEpisodeCollectionInputSchema = toStandardJsonSchema(
  v.object({
    episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Episode ID")),
  }),
);

export const getUserEpisodeCollectionOutputSchema = toStandardJsonSchema(
  v.object({
    episode: v.object({
      id: v.number(),
      type: v.number(),
      name: v.string(),
      name_cn: v.string(),
      sort: v.number(),
      ep: v.optional(v.number()),
      airdate: v.string(),
      comment: v.number(),
      duration: v.string(),
      desc: v.string(),
      disc: v.number(),
      duration_seconds: v.optional(v.number()),
    }),
    type: v.picklist([0, 1, 2, 3]),
    updated_at: v.number(),
  }),
);

export const putUserEpisodeCollectionInputSchema = toStandardJsonSchema(
  v.object({
    episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Episode ID")),
    type: v.pipe(
      v.picklist([0, 1, 2, 3]),
      v.description(
        "Episode watch status: 0=Unwatched/Uncollected, 1=Wish to watch, 2=Watched, 3=Dropped",
      ),
    ),
  }),
);

export const putUserEpisodeCollectionOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getUserCharacterCollectionsInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
  }),
);

export const getUserCharacterCollectionsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3, 4]),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        created_at: v.string(),
      }),
    ),
  }),
);

export const getUserCharacterCollectionInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
  }),
);

export const getUserCharacterCollectionOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    name: v.string(),
    type: v.picklist([1, 2, 3, 4]),
    images: v.nullish(
      v.object({
        large: v.string(),
        medium: v.string(),
        small: v.string(),
        grid: v.string(),
      }),
    ),
    created_at: v.string(),
  }),
);

export const getUserPersonCollectionsInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
  }),
);

export const getUserPersonCollectionsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3]),
        career: v.array(
          v.picklist(["producer", "mangaka", "artist", "seiyu", "writer", "illustrator", "actor"]),
        ),
        images: v.nullish(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        created_at: v.string(),
      }),
    ),
  }),
);

export const getUserPersonCollectionInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("Username (numeric UID cannot be used if the user has set a custom username)"),
    ),
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or studio ID"),
    ),
  }),
);

export const getUserPersonCollectionOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    name: v.string(),
    type: v.picklist([1, 2, 3]),
    career: v.array(
      v.picklist(["producer", "mangaka", "artist", "seiyu", "writer", "illustrator", "actor"]),
    ),
    images: v.nullish(
      v.object({
        large: v.string(),
        medium: v.string(),
        small: v.string(),
        grid: v.string(),
      }),
    ),
    created_at: v.string(),
  }),
);

export const getPersonRevisionsInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Person or studio ID"),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(50),
        v.description("Pagination limit (1-50)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getPersonRevisionsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        type: v.number(),
        creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
        summary: v.string(),
        created_at: v.string(),
      }),
    ),
  }),
);

export const getPersonRevisionByIdInputSchema = toStandardJsonSchema(
  v.object({
    revision_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Wiki revision ID"),
    ),
  }),
);

export const getPersonRevisionByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    type: v.number(),
    creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
    summary: v.string(),
    created_at: v.string(),
    data: v.optional(
      v.record(
        v.string(),
        v.object({
          prsn_infobox: v.string(),
          prsn_summary: v.string(),
          prsn_name: v.string(),
          profession: v.object({
            producer: v.optional(v.string()),
            mangaka: v.optional(v.string()),
            artist: v.optional(v.string()),
            seiyu: v.optional(v.string()),
            writer: v.optional(v.string()),
            illustrator: v.optional(v.string()),
            actor: v.optional(v.string()),
          }),
          extra: v.object({ img: v.optional(v.string()) }),
        }),
      ),
    ),
  }),
);

export const getCharacterRevisionsInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Fictional character ID"),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(50),
        v.description("Pagination limit (1-50)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getCharacterRevisionsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        type: v.number(),
        creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
        summary: v.string(),
        created_at: v.string(),
      }),
    ),
  }),
);

export const getCharacterRevisionByIdInputSchema = toStandardJsonSchema(
  v.object({
    revision_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Wiki revision ID"),
    ),
  }),
);

export const getCharacterRevisionByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    type: v.number(),
    creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
    summary: v.string(),
    created_at: v.string(),
    data: v.optional(
      v.record(
        v.string(),
        v.object({
          infobox: v.string(),
          summary: v.string(),
          name: v.string(),
          extra: v.object({ img: v.optional(v.string()) }),
        }),
      ),
    ),
  }),
);

export const getSubjectRevisionsInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(50),
        v.description("Pagination limit (1-50)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getSubjectRevisionsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        type: v.number(),
        creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
        summary: v.string(),
        created_at: v.string(),
      }),
    ),
  }),
);

export const getSubjectRevisionByIdInputSchema = toStandardJsonSchema(
  v.object({
    revision_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Wiki revision ID"),
    ),
  }),
);

export const getSubjectRevisionByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    type: v.number(),
    creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
    summary: v.string(),
    created_at: v.string(),
    data: v.optional(
      v.object({
        field_eps: v.number(),
        field_infobox: v.string(),
        field_summary: v.string(),
        name: v.string(),
        name_cn: v.string(),
        platform: v.number(),
        subject_id: v.number(),
        type: v.number(),
        type_id: v.number(),
        vote_field: v.string(),
      }),
    ),
  }),
);

export const getEpisodeRevisionsInputSchema = toStandardJsonSchema(
  v.object({
    episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Episode ID")),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(50),
        v.description("Pagination limit (1-50)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getEpisodeRevisionsOutputSchema = toStandardJsonSchema(
  v.object({
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
    data: v.array(
      v.object({
        id: v.number(),
        type: v.number(),
        creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
        summary: v.string(),
        created_at: v.string(),
      }),
    ),
  }),
);

export const getEpisodeRevisionByIdInputSchema = toStandardJsonSchema(
  v.object({
    revision_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Wiki revision ID"),
    ),
  }),
);

export const getEpisodeRevisionByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    type: v.number(),
    creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
    summary: v.string(),
    created_at: v.string(),
    data: v.optional(
      v.pipe(
        v.record(v.string(), v.unknown()),
        v.description("Revision content changes (dynamic schema)"),
      ),
    ),
  }),
);

export const newIndexOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    title: v.string(),
    desc: v.string(),
    total: v.number(),
    stat: v.object({ comments: v.number(), collects: v.number() }),
    created_at: v.string(),
    updated_at: v.string(),
    creator: v.object({ username: v.string(), nickname: v.string() }),
    ban: v.boolean(),
    nsfw: v.boolean(),
  }),
);

export const getIndexByIdInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
  }),
);

export const getIndexByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    title: v.string(),
    desc: v.string(),
    total: v.number(),
    stat: v.object({ comments: v.number(), collects: v.number() }),
    created_at: v.string(),
    updated_at: v.string(),
    creator: v.object({ username: v.string(), nickname: v.string() }),
    ban: v.boolean(),
    nsfw: v.boolean(),
  }),
);

export const editIndexByIdInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
    title: v.optional(v.pipe(v.string(), v.description("Curated list title"))),
    description: v.optional(v.pipe(v.string(), v.description("Curated list description"))),
  }),
);

export const editIndexByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    title: v.string(),
    desc: v.string(),
    total: v.number(),
    stat: v.object({ comments: v.number(), collects: v.number() }),
    created_at: v.string(),
    updated_at: v.string(),
    creator: v.object({ username: v.string(), nickname: v.string() }),
    ban: v.boolean(),
    nsfw: v.boolean(),
  }),
);

export const getIndexSubjectsByIndexIdInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 6]),
        v.description(
          "Media type filter: 1=Book/Manga/Novel, 2=Anime, 3=Music, 4=Game, 6=Live-action/Real",
        ),
      ),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(50),
        v.description("Pagination limit (1-50)"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("Pagination offset")),
    ),
  }),
);

export const getIndexSubjectsByIndexIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(v.unknown()),
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
  }),
);

export const addSubjectToIndexInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
    subject_id: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.description("Media entry ID to add")),
    ),
    sort: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.description("Sort order weight (smaller values appear first)"),
      ),
    ),
    comment: v.optional(v.pipe(v.string(), v.description("Note or comment on the item"))),
  }),
);

export const addSubjectToIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const editIndexSubjectInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
    sort: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.description("Sort order weight (smaller values appear first)"),
      ),
    ),
    comment: v.optional(v.pipe(v.string(), v.description("Note or comment on the item"))),
  }),
);

export const editIndexSubjectOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const deleteSubjectFromIndexInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("Media entry ID")),
  }),
);

export const deleteSubjectFromIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const collectIndexInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
  }),
);

export const collectIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const uncollectIndexInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(
      v.number(),
      v.safeInteger(),
      v.minValue(1),
      v.description("Curated list (directory) ID"),
    ),
  }),
);

export const uncollectIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);
