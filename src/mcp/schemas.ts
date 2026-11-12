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
    limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页大小"))),
    offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页偏移量"))),
    keyword: v.pipe(v.string(), v.description("搜索关键词")),
    sort: v.optional(
      v.pipe(
        v.picklist(["match", "heat", "rank", "score"]),
        v.description(
          "排序规则：\n- `match`: 默认排序，按匹配程度\n- `heat`: 按收藏人数\n- `rank`: 按排名由高到低\n- `score`: 按评分",
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
                  v.description("条目类型：1=书籍，2=动画，3=音乐，4=游戏，6=三次元（无 5）"),
                ),
              ),
              v.description(
                "条目类型列表（1=书籍，2=动画，3=音乐，4=游戏，6=三次元），多值之间为「或」关系",
              ),
            ),
          ),
          meta_tags: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "公共标签列表，多值之间为「且」关系。可用 `-` 前缀排除标签，例如 `-科幻`",
              ),
            ),
          ),
          tag: v.optional(
            v.pipe(v.array(v.string()), v.description("标签列表，多值之间为「且」关系")),
          ),
          air_date: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "播出/发售日期过滤条件（格式 `YYYY-MM-DD`，支持比较前缀如 `>=2020-07-01`、`<2020-10-01`），多值之间为「且」关系",
              ),
            ),
          ),
          rating: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description("评分过滤条件（支持比较前缀如 `>=6`、`<=8`），多值之间为「且」关系"),
            ),
          ),
          rating_count: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description(
                "评分人数过滤条件（支持比较前缀如 `>=200`、`<=5000`），多值之间为「且」关系",
              ),
            ),
          ),
          rank: v.optional(
            v.pipe(
              v.array(v.string()),
              v.description("排名过滤条件（支持比较前缀如 `>100`、`<=200`），多值之间为「且」关系"),
            ),
          ),
          nsfw: v.optional(
            v.pipe(
              v.boolean(),
              v.description(
                "R18 过滤：不传表示包含所有结果；`true` 仅返回 R18 条目；`false` 仅返回非 R18 条目（无权限用户忽略此字段，不会返回 R18）",
              ),
            ),
          ),
        }),
        v.description("过滤条件，不同字段之间为「且」关系"),
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
        date: v.optional(v.string()),
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
    limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页大小"))),
    offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页偏移量"))),
    keyword: v.pipe(v.string(), v.description("搜索关键词")),
    filter: v.optional(
      v.pipe(
        v.object({
          nsfw: v.optional(
            v.pipe(
              v.boolean(),
              v.description(
                "R18 过滤：不传表示包含所有结果；`true` 仅返回 R18 角色；`false` 仅返回非 R18 角色（无权限用户忽略此字段，不会返回 R18）",
              ),
            ),
          ),
        }),
        v.description("过滤条件，不同字段之间为「且」关系"),
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
        images: v.optional(
          v.object({
            large: v.string(),
            medium: v.string(),
            small: v.string(),
            grid: v.string(),
          }),
        ),
        summary: v.string(),
        locked: v.boolean(),
        infobox: v.optional(v.array(v.record(v.string(), v.unknown()))),
        gender: v.optional(v.string()),
        blood_type: v.optional(v.picklist([1, 2, 3, 4])),
        birth_year: v.optional(v.number()),
        birth_mon: v.optional(v.number()),
        birth_day: v.optional(v.number()),
        stat: v.object({ comments: v.number(), collects: v.number() }),
      }),
    ),
  }),
);

export const searchPersonsInputSchema = toStandardJsonSchema(
  v.object({
    limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页大小"))),
    offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页偏移量"))),
    keyword: v.pipe(v.string(), v.description("搜索关键词")),
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
              v.description("职业过滤列表，多值之间为「且」关系"),
            ),
          ),
        }),
        v.description("过滤条件，不同字段之间为「且」关系"),
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
        images: v.optional(
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
      v.description("条目类型：1=书籍，2=动画，3=音乐，4=游戏，6=三次元"),
    ),
    cat: v.optional(
      v.pipe(
        v.union([
          v.pipe(
            v.picklist([0, 1001, 1002, 1003]),
            v.description("书籍分类：0=其他，1001=漫画，1002=小说，1003=画集"),
          ),
          v.pipe(
            v.picklist([0, 1, 2, 3, 5]),
            v.description("动画分类：0=其他，1=TV，2=OVA，3=Movie，5=WEB"),
          ),
          v.pipe(
            v.picklist([0, 4001, 4003, 4002, 4005]),
            v.description("游戏分类：0=其他，4001=游戏，4002=软件，4003=扩展包，4005=桌游"),
          ),
          v.pipe(
            v.picklist([0, 1, 2, 3, 6001, 6002, 6003, 6004]),
            v.description(
              "三次元分类：0=其他，1=日剧，2=欧美剧，3=华语剧，6001=电视剧，6002=电影，6003=演出，6004=综艺",
            ),
          ),
        ]),
        v.description("条目子分类（与 type 对应）"),
      ),
    ),
    series: v.optional(v.pipe(v.boolean(), v.description("是否为系列条目（仅对书籍类型有效）"))),
    platform: v.optional(v.pipe(v.string(), v.description("游戏平台（仅对游戏类型有效）"))),
    sort: v.optional(v.pipe(v.picklist(["date", "rank"]), v.description("排序方式"))),
    year: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("年份"))),
    month: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("月份"))),
    limit: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(50), v.description("分页大小")),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
        date: v.optional(v.string()),
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
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
    date: v.optional(v.string()),
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    type: v.pipe(
      v.picklist(["small", "grid", "large", "medium", "common"]),
      v.description("图片尺寸"),
    ),
  }),
);

export const getSubjectImageByIdOutputSchema = toStandardJsonSchema(
  v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
);

export const getRelatedPersonsBySubjectIdInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
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
        images: v.optional(
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
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
        images: v.optional(
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
            images: v.optional(
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    type: v.optional(
      v.pipe(
        v.picklist([0, 1, 2, 3, 4, 5, 6]),
        v.description("章节类型：0=本篇，1=特别篇，2=OP，3=ED，4=预告/宣传/广告，5=MAD，6=其他"),
      ),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(200),
        v.description("分页大小"),
      ),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
    episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
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
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
  }),
);

export const getCharacterByIdOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    name: v.string(),
    type: v.picklist([1, 2, 3, 4]),
    images: v.optional(
      v.object({
        large: v.string(),
        medium: v.string(),
        small: v.string(),
        grid: v.string(),
      }),
    ),
    summary: v.string(),
    locked: v.boolean(),
    infobox: v.optional(v.array(v.record(v.string(), v.unknown()))),
    gender: v.optional(v.string()),
    blood_type: v.optional(v.picklist([1, 2, 3, 4])),
    birth_year: v.optional(v.number()),
    birth_mon: v.optional(v.number()),
    birth_day: v.optional(v.number()),
    stat: v.object({ comments: v.number(), collects: v.number() }),
  }),
);

export const getCharacterImageByIdInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
    type: v.pipe(v.picklist(["small", "grid", "large", "medium"]), v.description("图片尺寸")),
  }),
);

export const getCharacterImageByIdOutputSchema = toStandardJsonSchema(
  v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
);

export const getRelatedSubjectsByCharacterIdInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
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
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
  }),
);

export const getRelatedPersonsByCharacterIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3, 4]),
        images: v.optional(
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
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
  }),
);

export const collectCharacterOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const uncollectCharacterInputSchema = toStandardJsonSchema(
  v.object({
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
  }),
);

export const uncollectCharacterOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getPersonByIdInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
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
    images: v.optional(
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
    infobox: v.optional(v.array(v.record(v.string(), v.unknown()))),
    gender: v.optional(v.string()),
    blood_type: v.optional(v.picklist([1, 2, 3, 4])),
    birth_year: v.optional(v.number()),
    birth_mon: v.optional(v.number()),
    birth_day: v.optional(v.number()),
    stat: v.object({ comments: v.number(), collects: v.number() }),
  }),
);

export const getPersonImageByIdInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
    type: v.pipe(v.picklist(["small", "grid", "large", "medium"]), v.description("图片尺寸")),
  }),
);

export const getPersonImageByIdOutputSchema = toStandardJsonSchema(
  v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
);

export const getRelatedSubjectsByPersonIdInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
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
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
  }),
);

export const getRelatedCharactersByPersonIdOutputSchema = toStandardJsonSchema(
  v.object({
    data: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        type: v.picklist([1, 2, 3, 4]),
        images: v.optional(
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
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
  }),
);

export const collectPersonOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const uncollectPersonInputSchema = toStandardJsonSchema(
  v.object({
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
  }),
);

export const uncollectPersonOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getUserByNameInputSchema = toStandardJsonSchema(
  v.object({
    username: v.pipe(
      v.string(),
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
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
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
    ),
    type: v.pipe(v.picklist(["small", "large", "medium"]), v.description("头像尺寸")),
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
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
    ),
    subject_type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 6]),
        v.description("条目类型筛选（默认全部）：1=书籍，2=动画，3=音乐，4=游戏，6=三次元"),
      ),
    ),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 5]),
        v.description("收藏状态筛选（默认全部）：1=想看，2=看过，3=在看，4=搁置，5=抛弃"),
      ),
    ),
    limit: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(50), v.description("分页大小")),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
            date: v.optional(v.string()),
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
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
    ),
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
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
        date: v.optional(v.string()),
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 5]),
        v.description("收藏状态：1=想看，2=看过，3=在看，4=搁置，5=抛弃"),
      ),
    ),
    rate: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.maxValue(10),
        v.description("评分（1-10，`0` 表示删除评分）"),
      ),
    ),
    ep_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("看到的话数进度（仅适用于书籍类条目）"),
      ),
    ),
    vol_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("看到的卷数进度（仅适用于书籍类条目）"),
      ),
    ),
    comment: v.optional(v.pipe(v.string(), v.description("简评/吐嘈"))),
    private: v.optional(v.pipe(v.boolean(), v.description("是否仅自己可见"))),
    tags: v.optional(
      v.pipe(
        v.array(v.pipe(v.string(), v.description("单个标签（不能包含空格）"))),
        v.description("标签列表（不传则忽略，传空数组 `[]` 会清空所有标签）"),
      ),
    ),
  }),
);

export const postUserCollectionOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const patchUserCollectionInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 5]),
        v.description("收藏状态：1=想看，2=看过，3=在看，4=搁置，5=抛弃"),
      ),
    ),
    rate: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.maxValue(10),
        v.description("评分（1-10，`0` 表示删除评分）"),
      ),
    ),
    ep_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("看到的话数进度（仅适用于书籍类条目）"),
      ),
    ),
    vol_status: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(0),
        v.description("看到的卷数进度（仅适用于书籍类条目）"),
      ),
    ),
    comment: v.optional(v.pipe(v.string(), v.description("简评/吐嘈"))),
    private: v.optional(v.pipe(v.boolean(), v.description("是否仅自己可见"))),
    tags: v.optional(
      v.pipe(
        v.array(v.pipe(v.string(), v.description("单个标签（不能包含空格）"))),
        v.description("标签列表（不传则忽略，传空数组 `[]` 会清空所有标签）"),
      ),
    ),
  }),
);

export const patchUserCollectionOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getUserSubjectEpisodeCollectionInputSchema = toStandardJsonSchema(
  v.object({
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
    ),
    limit: v.optional(
      v.pipe(
        v.number(),
        v.safeInteger(),
        v.minValue(1),
        v.maxValue(1000),
        v.description("分页大小"),
      ),
    ),
    episode_type: v.optional(
      v.pipe(
        v.picklist([0, 1, 2, 3, 4, 5, 6]),
        v.description(
          "章节类型筛选（不传则不过滤）：0=本篇，1=特别篇，2=OP，3=ED，4=预告/宣传/广告，5=MAD，6=其他",
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    episode_id: v.pipe(
      v.array(v.pipe(v.number(), v.safeInteger())),
      v.description("要更新的章节 ID 列表"),
    ),
    type: v.pipe(
      v.picklist([0, 1, 2, 3]),
      v.description("章节收藏状态：0=未收藏，1=想看，2=看过，3=抛弃"),
    ),
  }),
);

export const patchUserSubjectEpisodeCollectionOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const getUserEpisodeCollectionInputSchema = toStandardJsonSchema(
  v.object({
    episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
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
    episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
    type: v.pipe(
      v.picklist([0, 1, 2, 3]),
      v.description("章节收藏状态：0=未收藏，1=想看，2=看过，3=抛弃"),
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
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
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
        images: v.optional(
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
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
    ),
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
  }),
);

export const getUserCharacterCollectionOutputSchema = toStandardJsonSchema(
  v.object({
    id: v.number(),
    name: v.string(),
    type: v.picklist([1, 2, 3, 4]),
    images: v.optional(
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
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
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
        images: v.optional(
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
      v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
    ),
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
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
    images: v.optional(
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
    person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
    limit: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(50), v.description("分页大小")),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
      v.description("历史修订版本 ID"),
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
    character_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("角色 ID")),
    limit: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(50), v.description("分页大小")),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
      v.description("历史修订版本 ID"),
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
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    limit: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(50), v.description("分页大小")),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
      v.description("历史修订版本 ID"),
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
    episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
    limit: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(50), v.description("分页大小")),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
      v.description("历史修订版本 ID"),
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
      v.pipe(v.record(v.string(), v.unknown()), v.description("编辑修改内容，响应类型不固定")),
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
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
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
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
    title: v.optional(v.pipe(v.string(), v.description("目录标题"))),
    description: v.optional(v.pipe(v.string(), v.description("目录描述"))),
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
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
    type: v.optional(
      v.pipe(
        v.picklist([1, 2, 3, 4, 6]),
        v.description("条目类型筛选：1=书籍，2=动画，3=音乐，4=游戏，6=三次元"),
      ),
    ),
    limit: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.maxValue(50), v.description("分页大小")),
    ),
    offset: v.optional(
      v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
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
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
    subject_id: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("要添加的条目 ID"))),
    sort: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("排序权重，越小越靠前"))),
    comment: v.optional(v.pipe(v.string(), v.description("评价或备注"))),
  }),
);

export const addSubjectToIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const editIndexSubjectInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
    sort: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("排序权重，越小越靠前"))),
    comment: v.optional(v.pipe(v.string(), v.description("评价或备注"))),
  }),
);

export const editIndexSubjectOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const deleteSubjectFromIndexInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
    subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
  }),
);

export const deleteSubjectFromIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const collectIndexInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
  }),
);

export const collectIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);

export const uncollectIndexInputSchema = toStandardJsonSchema(
  v.object({
    index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
  }),
);

export const uncollectIndexOutputSchema = toStandardJsonSchema(
  v.object({ success: v.literal(true) }),
);
