import type { CallToolResult, ContentBlock, McpServer } from "@modelcontextprotocol/server";
import { toStandardJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";

import { type BangumiClient, DEFAULT_BGM_USER_AGENT } from "@/bangumi";

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function apiError({ error, response }: ApiResult<unknown>): Error {
  return new Error(
    `Bangumi API error (${response.status} ${response.url}): ${typeof error === "string" ? error : JSON.stringify(error)}`,
  );
}

function toJsonResult<T>(result: ApiResult<T>): CallToolResult {
  if (!result.response.ok) throw apiError(result);

  const { data } = result;
  const structuredContent =
    data === undefined
      ? { success: true }
      : data !== null && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : { data };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

async function fetchInlineImage(url: string) {
  const response = await fetch(url, { headers: { "User-Agent": DEFAULT_BGM_USER_AGENT } });
  const mimeType = response.headers.get("Content-Type")?.split(";")[0]?.trim();
  if (!response.ok || !mimeType?.startsWith("image/")) {
    await response.body?.cancel();
    return;
  }
  const bytes = await response.bytes();
  return { data: bytes.toBase64(), mimeType };
}

async function toImageResult(result: ApiResult<unknown>): Promise<CallToolResult> {
  const { response } = result;
  const location = response.status === 302 ? response.headers.get("Location") : null;
  if (!location) throw apiError(result);

  const url = new URL(location, response.url).href;
  const image = await fetchInlineImage(url).catch(() => undefined);
  const structuredContent = image ? { url, mimeType: image.mimeType } : { url };

  const content: ContentBlock[] = [{ type: "text", text: JSON.stringify(structuredContent) }];
  if (image) content.unshift({ type: "image", ...image });

  return { content, structuredContent };
}

export function registerApiTools(server: McpServer, client: BangumiClient): void {
  server.registerTool(
    "get_calendar",
    {
      title: "每日放送",
      description: "获取每周每日放送的番剧时间表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    () => client.api.GET("/calendar").then(toJsonResult),
  );

  server.registerTool(
    "search_subjects",
    {
      title: "条目搜索",
      description:
        "根据关键词和过滤条件搜索条目（书籍、动画、音乐、游戏、三次元）。不同筛选条件之间为「且」关系。",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
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
                    v.description(
                      "评分过滤条件（支持比较前缀如 `>=6`、`<=8`），多值之间为「且」关系",
                    ),
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
                    v.description(
                      "排名过滤条件（支持比较前缀如 `>100`、`<=200`），多值之间为「且」关系",
                    ),
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
      ),
      outputSchema: toStandardJsonSchema(
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
              tags: v.array(
                v.object({ name: v.string(), count: v.number(), total_count: v.number() }),
              ),
            }),
          ),
        }),
      ),
    },
    ({ limit, offset, keyword, sort, filter }) =>
      client.api
        .POST("/v0/search/subjects", {
          params: { query: { limit, offset } },
          body: { keyword, sort, filter },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "search_characters",
    {
      title: "角色搜索",
      description: "根据关键词搜索虚拟角色",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
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
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ limit, offset, keyword, filter }) =>
      client.api
        .POST("/v0/search/characters", {
          params: { query: { limit, offset } },
          body: { keyword, filter },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "search_persons",
    {
      title: "人物搜索",
      description: "根据关键词和职业搜索现实人物或制作团体（声优、作者、监督、制作公司等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          limit: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页大小"))),
          offset: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("分页偏移量"))),
          keyword: v.pipe(v.string(), v.description("搜索关键词")),
          filter: v.optional(
            v.pipe(
              v.object({
                career: v.optional(
                  v.pipe(v.array(v.string()), v.description("职业过滤列表，多值之间为「且」关系")),
                ),
              }),
              v.description("过滤条件，不同字段之间为「且」关系"),
            ),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
    },
    ({ limit, offset, keyword, filter }) =>
      client.api
        .POST("/v0/search/persons", {
          params: { query: { limit, offset } },
          body: { keyword, filter },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subjects",
    {
      title: "浏览条目",
      description: "按条目类型、子分类、年份、月份等条件分页浏览条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
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
          series: v.optional(
            v.pipe(v.boolean(), v.description("是否为系列条目（仅对书籍类型有效）")),
          ),
          platform: v.optional(v.pipe(v.string(), v.description("游戏平台（仅对游戏类型有效）"))),
          sort: v.optional(
            v.pipe(v.string(), v.description("排序方式：`date`（日期）或 `rank`（排名）")),
          ),
          year: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("年份"))),
          month: v.optional(v.pipe(v.number(), v.safeInteger(), v.description("月份"))),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页大小"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
              tags: v.array(
                v.object({ name: v.string(), count: v.number(), total_count: v.number() }),
              ),
            }),
          ),
        }),
      ),
    },
    ({ type, cat, series, platform, sort, year, month, limit, offset }) =>
      client.api
        .GET("/v0/subjects", {
          params: {
            query: { type, cat, series, platform, sort, year, month, limit, offset },
          },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_by_id",
    {
      title: "获取条目详情",
      description: "根据条目 ID 获取条目的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}", { params: { path: { subject_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_image_by_id",
    {
      title: "获取条目封面图",
      description: "根据条目 ID 和尺寸类型获取条目封面图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          type: v.pipe(
            v.string(),
            v.description("图片尺寸：`small`、`grid`、`large`、`medium`、`common`"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
        v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
      ),
    },
    ({ subject_id, type }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/image", {
          params: { path: { subject_id }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_related_persons_by_subject_id",
    {
      title: "获取条目关联人物",
      description: "根据条目 ID 获取参与该条目的相关人物列表（制作人员、作者等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
        v.object({
          data: v.array(
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
              relation: v.string(),
              eps: v.string(),
            }),
          ),
        }),
      ),
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/persons", {
          params: { path: { subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_characters_by_subject_id",
    {
      title: "获取条目关联角色",
      description: "根据条目 ID 获取该条目登场的角色及配音列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/characters", {
          params: { path: { subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_subjects_by_subject_id",
    {
      title: "获取关联条目",
      description: "根据条目 ID 获取与之关联的其他条目列表（前传、续作、番外、原声集等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}/subjects", {
          params: { path: { subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episodes",
    {
      title: "获取章节列表",
      description: "根据条目 ID 分页获取章节（剧集/曲目）列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          type: v.optional(
            v.pipe(
              v.picklist([0, 1, 2, 3, 4, 5, 6]),
              v.description(
                "章节类型：0=本篇，1=特别篇，2=OP，3=ED，4=预告/宣传/广告，5=MAD，6=其他",
              ),
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
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ subject_id, type, limit, offset }) =>
      client.api
        .GET("/v0/episodes", {
          params: { query: { subject_id, type, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episode_by_id",
    {
      title: "获取章节详情",
      description: "根据章节 ID 获取单个章节的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ episode_id }) =>
      client.api
        .GET("/v0/episodes/{episode_id}", { params: { path: { episode_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_by_id",
    {
      title: "获取角色详情",
      description: "根据角色 ID 获取角色的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
    },
    ({ character_id }) =>
      client.api
        .GET("/v0/characters/{character_id}", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_image_by_id",
    {
      title: "获取角色肖像图",
      description: "根据角色 ID 和尺寸类型获取角色肖像图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
          type: v.pipe(v.string(), v.description("图片尺寸：`small`、`grid`、`large`、`medium`")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
        v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
      ),
    },
    ({ character_id, type }) =>
      client.api
        .GET("/v0/characters/{character_id}/image", {
          params: { path: { character_id }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_related_subjects_by_character_id",
    {
      title: "获取角色出演条目",
      description: "根据角色 ID 获取该角色登场的关联条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ character_id }) =>
      client.api
        .GET("/v0/characters/{character_id}/subjects", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_persons_by_character_id",
    {
      title: "获取角色关联人物",
      description: "根据角色 ID 获取关联的现实人物列表（如声优、演员）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ character_id }) =>
      client.api
        .GET("/v0/characters/{character_id}/persons", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_character_by_character_id_and_user_id",
    {
      title: "收藏角色",
      description: "为当前登录用户收藏指定角色",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ character_id }) =>
      client.api
        .POST("/v0/characters/{character_id}/collect", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_character_by_character_id_and_user_id",
    {
      title: "取消收藏角色",
      description: "为当前登录用户取消收藏指定角色",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ character_id }) =>
      client.api
        .DELETE("/v0/characters/{character_id}/collect", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_by_id",
    {
      title: "获取人物详情",
      description: "根据人物 ID 获取现实人物或制作团体的详细信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}", { params: { path: { person_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_image_by_id",
    {
      title: "获取人物肖像图",
      description: "根据人物 ID 和尺寸类型获取人物肖像图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
          type: v.pipe(v.string(), v.description("图片尺寸：`small`、`grid`、`large`、`medium`")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
        v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
      ),
    },
    ({ person_id, type }) =>
      client.api
        .GET("/v0/persons/{person_id}/image", {
          params: { path: { person_id }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_related_subjects_by_person_id",
    {
      title: "获取人物参与条目",
      description: "根据人物 ID 获取其参与制作、创作或出演的条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}/subjects", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_related_characters_by_person_id",
    {
      title: "获取人物配音/出演角色",
      description: "根据人物 ID 获取其配音或扮演的虚拟角色列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}/characters", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_person_by_person_id_and_user_id",
    {
      title: "收藏人物",
      description: "为当前登录用户收藏指定人物",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ person_id }) =>
      client.api
        .POST("/v0/persons/{person_id}/collect", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_person_by_person_id_and_user_id",
    {
      title: "取消收藏人物",
      description: "为当前登录用户取消收藏指定人物",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ person_id }) =>
      client.api
        .DELETE("/v0/persons/{person_id}/collect", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_by_name",
    {
      title: "获取用户信息",
      description: "根据用户名获取用户的公开个人资料",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(
            v.string(),
            v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
        v.object({
          id: v.number(),
          username: v.string(),
          nickname: v.string(),
          user_group: v.picklist([1, 2, 3, 4, 5, 8, 9, 10, 11]),
          avatar: v.object({ large: v.string(), medium: v.string(), small: v.string() }),
          sign: v.string(),
        }),
      ),
    },
    ({ username }) =>
      client.api.GET("/v0/users/{username}", { params: { path: { username } } }).then(toJsonResult),
  );

  server.registerTool(
    "get_user_avatar_by_name",
    {
      title: "获取用户头像",
      description: "根据用户名和尺寸类型获取用户头像图片",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(
            v.string(),
            v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
          ),
          type: v.pipe(v.string(), v.description("头像尺寸：`small`、`large`、`medium`")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
        v.object({ url: v.string(), mimeType: v.optional(v.string()) }),
      ),
    },
    ({ username, type }) =>
      client.api
        .GET("/v0/users/{username}/avatar", {
          params: { path: { username }, query: { type } },
          redirect: "manual",
        })
        .then(toImageResult),
  );

  server.registerTool(
    "get_me",
    {
      title: "获取当前登录用户信息",
      description: "获取当前授权登录用户的个人信息（包括 username、UID、昵称等）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    () => client.api.GET("/v0/me").then(toJsonResult),
  );

  server.registerTool(
    "get_user_collections_by_username",
    {
      title: "获取用户条目收藏列表",
      description: "分页获取指定用户的条目收藏列表（私有收藏仅本人可见）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
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
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页大小"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ username, subject_type, type, limit, offset }) =>
      client.api
        .GET("/v0/users/{username}/collections", {
          params: { path: { username }, query: { subject_type, type, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_collection",
    {
      title: "获取用户单个条目收藏",
      description: "获取指定用户对单个条目的收藏状态、评分及评论（私有收藏仅本人可见）",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(
            v.string(),
            v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
          ),
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
    },
    ({ username, subject_id }) =>
      client.api
        .GET("/v0/users/{username}/collections/{subject_id}", {
          params: { path: { username, subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "post_user_collection",
    {
      title: "新增或修改条目收藏",
      description:
        "为当前登录用户新增或更新单个条目的收藏状态、评分、标签及评价（若未收藏则创建，已收藏则更新；ep_status 与 vol_status 仅适用于书籍类条目）",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
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
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ subject_id, ...body }) =>
      client.api
        .POST("/v0/users/-/collections/{subject_id}", {
          params: { path: { subject_id } },
          body,
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "patch_user_collection",
    {
      title: "更新条目收藏",
      description:
        "更新当前登录用户对已收藏条目的状态、评分、标签或评价（ep_status 与 vol_status 仅适用于书籍类条目）",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
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
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ subject_id, ...body }) =>
      client.api
        .PATCH("/v0/users/-/collections/{subject_id}", {
          params: { path: { subject_id } },
          body,
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_subject_episode_collection",
    {
      title: "获取条目章节收藏状态",
      description: "分页获取当前登录用户在指定条目下的各章节（剧集）收藏状态",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
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
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ subject_id, offset, limit, episode_type }) =>
      client.api
        .GET("/v0/users/-/collections/{subject_id}/episodes", {
          params: { path: { subject_id }, query: { offset, limit, episode_type } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "patch_user_subject_episode_collection",
    {
      title: "批量更新条目章节收藏状态",
      description:
        "批量更新当前登录用户在指定条目下多个章节的观看状态，并自动重新计算条目的完成进度",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
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
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ subject_id, episode_id, type }) =>
      client.api
        .PATCH("/v0/users/-/collections/{subject_id}/episodes", {
          params: { path: { subject_id } },
          body: { episode_id, type },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_episode_collection",
    {
      title: "获取单个章节收藏状态",
      description: "获取当前登录用户对指定章节的观看/收藏状态",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
    },
    ({ episode_id }) =>
      client.api
        .GET("/v0/users/-/collections/-/episodes/{episode_id}", {
          params: { path: { episode_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "put_user_episode_collection",
    {
      title: "更新单个章节收藏状态",
      description: "更新当前登录用户对指定章节的观看/收藏状态",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
          type: v.pipe(
            v.picklist([0, 1, 2, 3]),
            v.description("章节收藏状态：0=未收藏，1=想看，2=看过，3=抛弃"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ episode_id, type }) =>
      client.api
        .PUT("/v0/users/-/collections/-/episodes/{episode_id}", {
          params: { path: { episode_id } },
          body: { type },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_character_collections",
    {
      title: "获取用户角色收藏列表",
      description: "获取指定用户收藏的角色列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(
            v.string(),
            v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ username }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/characters", {
          params: { path: { username } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_character_collection",
    {
      title: "获取用户单个角色收藏信息",
      description: "获取指定用户对单个角色的收藏信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(
            v.string(),
            v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
          ),
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
    },
    ({ username, character_id }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/characters/{character_id}", {
          params: { path: { username, character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_person_collections",
    {
      title: "获取用户人物收藏列表",
      description: "获取指定用户收藏的现实人物列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(
            v.string(),
            v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
              created_at: v.string(),
            }),
          ),
        }),
      ),
    },
    ({ username }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/persons", {
          params: { path: { username } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_user_person_collection",
    {
      title: "获取用户单个人物收藏信息",
      description: "获取指定用户对单个人物的收藏信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          username: v.pipe(
            v.string(),
            v.description("用户名（若该用户已设置自定义用户名，则不可使用数字 UID）"),
          ),
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
          created_at: v.string(),
        }),
      ),
    },
    ({ username, person_id }) =>
      client.api
        .GET("/v0/users/{username}/collections/-/persons/{person_id}", {
          params: { path: { username, person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_revisions",
    {
      title: "获取人物历史修订列表",
      description: "根据人物 ID 分页获取该人物词条的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          person_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("人物 ID")),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页大小"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ person_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/persons", {
          params: { query: { person_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_revision_by_revision_id",
    {
      title: "获取人物历史修订详情",
      description: "根据修订版本 ID 获取人物词条单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("历史修订版本 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/persons/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_revisions",
    {
      title: "获取角色历史修订列表",
      description: "根据角色 ID 分页获取该角色词条的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          character_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("角色 ID"),
          ),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页大小"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ character_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/characters", {
          params: { query: { character_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_revision_by_revision_id",
    {
      title: "获取角色历史修订详情",
      description: "根据修订版本 ID 获取角色词条单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("历史修订版本 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/characters/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_revisions",
    {
      title: "获取条目历史修订列表",
      description: "根据条目 ID 分页获取该条目词条的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页大小"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ subject_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/subjects", {
          params: { query: { subject_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_revision_by_revision_id",
    {
      title: "获取条目历史修订详情",
      description: "根据修订版本 ID 获取条目词条单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("历史修订版本 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/subjects/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episode_revisions",
    {
      title: "获取章节历史修订列表",
      description: "根据章节 ID 分页获取该章节的编辑历史列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          episode_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("章节 ID")),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页大小"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ episode_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/episodes", {
          params: { query: { episode_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episode_revision_by_revision_id",
    {
      title: "获取章节历史修订详情",
      description: "根据修订版本 ID 获取章节单次修订的详细内容",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          revision_id: v.pipe(
            v.number(),
            v.safeInteger(),
            v.minValue(1),
            v.description("历史修订版本 ID"),
          ),
        }),
      ),
      outputSchema: toStandardJsonSchema(
        v.object({
          id: v.number(),
          type: v.number(),
          creator: v.optional(v.object({ username: v.string(), nickname: v.string() })),
          summary: v.string(),
          created_at: v.string(),
          data: v.optional(
            v.pipe(
              v.record(v.string(), v.unknown()),
              v.description("编辑修改内容，响应类型不固定"),
            ),
          ),
        }),
      ),
    },
    ({ revision_id }) =>
      client.api
        .GET("/v0/revisions/episodes/{revision_id}", {
          params: { path: { revision_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "new_index",
    {
      title: "创建目录",
      description: "为当前登录用户创建一个新目录",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    () => client.api.POST("/v0/indices").then(toJsonResult),
  );

  server.registerTool(
    "get_index_by_id",
    {
      title: "获取目录详情",
      description: "根据目录 ID 获取目录的基本信息",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ index_id }) =>
      client.api
        .GET("/v0/indices/{index_id}", { params: { path: { index_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "edit_index_by_id",
    {
      title: "编辑目录信息",
      description: "修改指定目录的标题和描述",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          title: v.optional(v.pipe(v.string(), v.description("目录标题"))),
          description: v.optional(v.pipe(v.string(), v.description("目录描述"))),
        }),
      ),
      outputSchema: toStandardJsonSchema(
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
      ),
    },
    ({ index_id, title, description }) =>
      client.api
        .PUT("/v0/indices/{index_id}", {
          params: { path: { index_id } },
          body: { title, description },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_index_subjects_by_index_id",
    {
      title: "获取目录条目列表",
      description: "根据目录 ID 分页获取该目录中收录的条目列表",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          type: v.optional(
            v.pipe(
              v.picklist([1, 2, 3, 4, 6]),
              v.description("条目类型筛选：1=书籍，2=动画，3=音乐，4=游戏，6=三次元"),
            ),
          ),
          limit: v.optional(
            v.pipe(
              v.number(),
              v.safeInteger(),
              v.minValue(1),
              v.maxValue(50),
              v.description("分页大小"),
            ),
          ),
          offset: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.minValue(0), v.description("分页偏移量")),
          ),
        }),
      ),
      // 上游此接口存在问题：https://github.com/bangumi/api/issues/243
      outputSchema: toStandardJsonSchema(
        v.object({
          data: v.array(v.unknown()),
          total: v.number(),
          limit: v.number(),
          offset: v.number(),
        }),
      ),
    },
    ({ index_id, type, limit, offset }) =>
      client.api
        .GET("/v0/indices/{index_id}/subjects", {
          params: { path: { index_id }, query: { type, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "add_subject_to_index_by_index_id",
    {
      title: "向目录添加条目",
      description: "向指定目录中添加一个条目",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          subject_id: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.description("要添加的条目 ID")),
          ),
          sort: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.description("排序权重，越小越靠前")),
          ),
          comment: v.optional(v.pipe(v.string(), v.description("评价或备注"))),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ index_id, subject_id, sort, comment }) =>
      client.api
        .POST("/v0/indices/{index_id}/subjects", {
          params: { path: { index_id } },
          body: { subject_id, sort, comment },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "edit_index_subjects_by_index_id_and_subject_id",
    {
      title: "修改目录中的条目信息",
      description: "修改目录中指定条目的排序权重或备注（若条目不存在于目录中则会创建）",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
          sort: v.optional(
            v.pipe(v.number(), v.safeInteger(), v.description("排序权重，越小越靠前")),
          ),
          comment: v.optional(v.pipe(v.string(), v.description("评价或备注"))),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ index_id, subject_id, sort, comment }) =>
      client.api
        .PUT("/v0/indices/{index_id}/subjects/{subject_id}", {
          params: { path: { index_id, subject_id } },
          body: { sort, comment },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "delete_subject_from_index_by_index_id_and_subject_id",
    {
      title: "从目录移除条目",
      description: "从指定目录中删除某个条目",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
          subject_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("条目 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ index_id, subject_id }) =>
      client.api
        .DELETE("/v0/indices/{index_id}/subjects/{subject_id}", {
          params: { path: { index_id, subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_index_by_index_id_and_user_id",
    {
      title: "收藏目录",
      description: "为当前登录用户收藏指定目录",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ index_id }) =>
      client.api
        .POST("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_index_by_index_id_and_user_id",
    {
      title: "取消收藏目录",
      description: "为当前登录用户取消收藏指定目录",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: toStandardJsonSchema(
        v.object({
          index_id: v.pipe(v.number(), v.safeInteger(), v.minValue(1), v.description("目录 ID")),
        }),
      ),
      outputSchema: toStandardJsonSchema(v.object({ success: v.literal(true) })),
    },
    ({ index_id }) =>
      client.api
        .DELETE("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        })
        .then(toJsonResult),
  );
}
