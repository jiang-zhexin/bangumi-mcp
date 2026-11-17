import type { CallToolResult, ContentBlock, McpServer } from "@modelcontextprotocol/server";

import { type BangumiClient, DEFAULT_BGM_USER_AGENT } from "@/bangumi";

import * as schemas from "./schemas";

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function apiError({ error, response }: ApiResult<unknown>): CallToolResult {
  const detail = typeof error === "string" ? error : JSON.stringify(error);
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Bangumi API error (${response.status} ${response.url}): ${detail}`,
      },
    ],
  };
}

function toJsonResult<T>(result: ApiResult<T>): CallToolResult {
  if (!result.response.ok) return apiError(result);

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
  if (!location) return apiError(result);

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
      title: "Get Weekly Anime Broadcast Schedule",
      description:
        "Get the weekly anime broadcast calendar and daily airing schedule for currently airing shows.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      outputSchema: schemas.getCalendarOutputSchema,
    },
    () => client.api.GET("/calendar").then(toJsonResult),
  );

  server.registerTool(
    "search_subjects",
    {
      title: "Search Anime, Manga, Books, Music, Games & Shows",
      description:
        "Search media entries (anime, manga, books, light novels, music, games, and live-action shows/dramas) by keyword and filters such as type, tags, release/air date, rating score, rank, and NSFW. All filter conditions are combined with AND logic.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.searchSubjectsInputSchema,
      outputSchema: schemas.searchSubjectsOutputSchema,
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
      title: "Search Fictional Characters",
      description:
        "Search fictional characters from anime, manga, games, and books by keyword and NSFW filter.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.searchCharactersInputSchema,
      outputSchema: schemas.searchCharactersOutputSchema,
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
      title: "Search Staff, Creators, Voice Actors & Studios",
      description:
        "Search real-world people, creators, staff, and production studios/companies (voice actors, seiyu, mangaka, authors, writers, directors, producers, illustrators, composers, actors) by keyword and career role.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.searchPersonsInputSchema,
      outputSchema: schemas.searchPersonsOutputSchema,
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
      title: "Browse Media Catalog",
      description:
        "Browse and list media entries (anime, manga, books, music, games, live-action shows) with pagination, filtered by media type, subcategory (TV, movie, OVA, comic, novel, etc.), game platform, release year, month, and sort order (date or rank).",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectsInputSchema,
      outputSchema: schemas.getSubjectsOutputSchema,
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
      title: "Get Media Entry Details",
      description:
        "Get detailed information about a specific media entry (anime, manga, book, music, game, or live-action show) by its ID, including title, summary, infobox metadata, episode/volume count, user ratings, rank, collection stats, and tags.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectByIdInputSchema,
      outputSchema: schemas.getSubjectByIdOutputSchema,
    },
    ({ subject_id }) =>
      client.api
        .GET("/v0/subjects/{subject_id}", { params: { path: { subject_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_image_by_id",
    {
      title: "Get Media Cover Image",
      description:
        "Get the cover art or poster image of a media entry (anime, manga, book, music, game, or show) by its ID and image size.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectImageByIdInputSchema,
      outputSchema: schemas.getSubjectImageByIdOutputSchema,
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
      title: "Get Media Staff & Creators",
      description:
        "Get the production staff, creators, authors, directors, composers, and studios involved in a specific media entry (anime, manga, book, music, game, or show) by its ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedPersonsBySubjectIdInputSchema,
      outputSchema: schemas.getRelatedPersonsBySubjectIdOutputSchema,
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
      title: "Get Media Characters & Voice Cast",
      description:
        "Get the list of fictional characters appearing in a media entry (anime, manga, book, game, or show) along with their voice actors (seiyu / cast) by media ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedCharactersBySubjectIdInputSchema,
      outputSchema: schemas.getRelatedCharactersBySubjectIdOutputSchema,
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
      title: "Get Related Media Entries",
      description:
        "Get related media entries linked to a specific work (such as prequels, sequels, spin-offs, side stories, adaptations, anime/manga versions, or soundtracks/OSTs) by its ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedSubjectsBySubjectIdInputSchema,
      outputSchema: schemas.getRelatedSubjectsBySubjectIdOutputSchema,
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
      title: "Get Episodes or Tracks List",
      description:
        "Get a paginated list of episodes (for anime/shows) or tracks (for music albums) belonging to a media entry, optionally filtered by episode type (main story, special/OVA, OP, ED, PV/trailer, MAD).",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodesInputSchema,
      outputSchema: schemas.getEpisodesOutputSchema,
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
      title: "Get Episode or Track Details",
      description:
        "Get detailed information about a single episode or music track by its episode ID, including title, air date, duration, and synopsis.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodeByIdInputSchema,
      outputSchema: schemas.getEpisodeByIdOutputSchema,
    },
    ({ episode_id }) =>
      client.api
        .GET("/v0/episodes/{episode_id}", { params: { path: { episode_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_by_id",
    {
      title: "Get Character Details",
      description:
        "Get detailed profile information about a fictional character by character ID, including name, biography/summary, gender, birthday, blood type, infobox attributes, and popularity stats.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterByIdInputSchema,
      outputSchema: schemas.getCharacterByIdOutputSchema,
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
      title: "Get Character Portrait Image",
      description:
        "Get the portrait or avatar image of a fictional character by character ID and image size.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterImageByIdInputSchema,
      outputSchema: schemas.getCharacterImageByIdOutputSchema,
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
      title: "Get Character Appearances in Media",
      description:
        "Get the list of media works (anime, manga, games, books) in which a fictional character appears, by character ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedSubjectsByCharacterIdInputSchema,
      outputSchema: schemas.getRelatedSubjectsByCharacterIdOutputSchema,
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
      title: "Get Character Voice Actors (Cast)",
      description:
        "Get the real-world voice actors (seiyu) or actors who portray a specific fictional character across different media works, by character ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedPersonsByCharacterIdInputSchema,
      outputSchema: schemas.getRelatedPersonsByCharacterIdOutputSchema,
    },
    ({ character_id }) =>
      client.api
        .GET("/v0/characters/{character_id}/persons", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_character",
    {
      title: "Favorite / Bookmark Character",
      description:
        "Add a fictional character to the current authenticated user's favorites/bookmarks.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.collectCharacterInputSchema,
      outputSchema: schemas.collectCharacterOutputSchema,
    },
    ({ character_id }) =>
      client.api
        .POST("/v0/characters/{character_id}/collect", {
          params: { path: { character_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_character",
    {
      title: "Unfavorite / Remove Bookmarked Character",
      description:
        "Remove a fictional character from the current authenticated user's favorites/bookmarks.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.uncollectCharacterInputSchema,
      outputSchema: schemas.uncollectCharacterOutputSchema,
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
      title: "Get Staff, Creator, Voice Actor or Studio Details",
      description:
        "Get detailed profile information about a real-world person (voice actor/seiyu, author, mangaka, director, composer, staff) or production company/studio by person ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonByIdInputSchema,
      outputSchema: schemas.getPersonByIdOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}", { params: { path: { person_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_image_by_id",
    {
      title: "Get Staff, Creator or Studio Portrait Image",
      description:
        "Get the portrait photo or logo image of a real-world person or studio by person ID and image size.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonImageByIdInputSchema,
      outputSchema: schemas.getPersonImageByIdOutputSchema,
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
      title: "Get Works by Staff, Creator or Studio",
      description:
        "Get the list of media works (anime, manga, books, music, games, shows) that a real-world person or studio has created, produced, directed, or participated in, by person ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedSubjectsByPersonIdInputSchema,
      outputSchema: schemas.getRelatedSubjectsByPersonIdOutputSchema,
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
      title: "Get Characters Voiced or Portrayed by Person",
      description:
        "Get the list of fictional characters voiced or portrayed by a specific voice actor (seiyu) or actor, by person ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getRelatedCharactersByPersonIdInputSchema,
      outputSchema: schemas.getRelatedCharactersByPersonIdOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .GET("/v0/persons/{person_id}/characters", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_person",
    {
      title: "Favorite / Bookmark Person or Studio",
      description:
        "Add a real-world person (voice actor, creator, staff) or studio to the current authenticated user's favorites/bookmarks.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.collectPersonInputSchema,
      outputSchema: schemas.collectPersonOutputSchema,
    },
    ({ person_id }) =>
      client.api
        .POST("/v0/persons/{person_id}/collect", {
          params: { path: { person_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_person",
    {
      title: "Unfavorite / Remove Bookmarked Person or Studio",
      description:
        "Remove a real-world person or studio from the current authenticated user's favorites/bookmarks.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.uncollectPersonInputSchema,
      outputSchema: schemas.uncollectPersonOutputSchema,
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
      title: "Get User Profile by Username",
      description:
        "Get a user's public profile information (nickname, avatar, bio/signature, user group) by their username.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserByNameInputSchema,
      outputSchema: schemas.getUserByNameOutputSchema,
    },
    ({ username }) =>
      client.api.GET("/v0/users/{username}", { params: { path: { username } } }).then(toJsonResult),
  );

  server.registerTool(
    "get_user_avatar_by_name",
    {
      title: "Get User Avatar Image",
      description: "Get a user's profile avatar image by their username and image size.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserAvatarByNameInputSchema,
      outputSchema: schemas.getUserAvatarByNameOutputSchema,
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
      title: "Get Current Authenticated User Profile",
      description:
        "Get the profile information of the currently authenticated/logged-in user (including username, user ID, nickname, avatar, email, and registration time).",
      annotations: { readOnlyHint: true, openWorldHint: true },
      outputSchema: schemas.getMeOutputSchema,
    },
    () => client.api.GET("/v0/me").then(toJsonResult),
  );

  server.registerTool(
    "get_user_collections",
    {
      title: "Get User Watchlist & Media Library",
      description:
        "Get a paginated list of a user's tracked/collected media entries (watchlist, reading list, game library), optionally filtered by media type (anime, book, music, game, live-action) and watch/read status (wish/plan to watch, completed/watched, watching/doing, on hold, dropped).",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCollectionsInputSchema,
      outputSchema: schemas.getUserCollectionsOutputSchema,
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
      title: "Get User Tracking Status & Rating for a Media Entry",
      description:
        "Get a user's tracking status (wish, completed, watching, on hold, dropped), personal rating score, review comment, tags, and episode/volume progress for a single media entry.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCollectionInputSchema,
      outputSchema: schemas.getUserCollectionOutputSchema,
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
      title: "Add or Update Media in User Watchlist / Library",
      description:
        "Add a media entry to the current user's watchlist/library or update its tracking status (wish, completed, watching, on hold, dropped), rating score (1-10), review comment, tags, and book chapter/volume progress (`ep_status` and `vol_status` apply only to books/manga).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.postUserCollectionInputSchema,
      outputSchema: schemas.postUserCollectionOutputSchema,
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
      title: "Update Existing Media in User Watchlist / Library",
      description:
        "Update the current user's tracking status, rating score, review comment, tags, or book chapter/volume progress for an already collected media entry (`ep_status` and `vol_status` apply only to books/manga).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.patchUserCollectionInputSchema,
      outputSchema: schemas.patchUserCollectionOutputSchema,
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
      title: "Get User Episode Watch Progress for a Show",
      description:
        "Get a paginated list of episodes and their watch status (unwatched, wish to watch, watched, dropped) for the current user under a specific anime or show.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserSubjectEpisodeCollectionInputSchema,
      outputSchema: schemas.getUserSubjectEpisodeCollectionOutputSchema,
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
      title: "Batch Update Episode Watch Status",
      description:
        "Batch update the current user's watch status (unwatched, wish, watched, dropped) for multiple episodes of a show and automatically recalculate overall watch progress.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.patchUserSubjectEpisodeCollectionInputSchema,
      outputSchema: schemas.patchUserSubjectEpisodeCollectionOutputSchema,
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
      title: "Get Watch Status for a Single Episode",
      description:
        "Get the current user's watch status (unwatched, wish, watched, dropped) for a single episode by episode ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserEpisodeCollectionInputSchema,
      outputSchema: schemas.getUserEpisodeCollectionOutputSchema,
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
      title: "Update Watch Status for a Single Episode",
      description:
        "Update the current user's watch status (unwatched, wish, watched, dropped) for a single episode by episode ID.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.putUserEpisodeCollectionInputSchema,
      outputSchema: schemas.putUserEpisodeCollectionOutputSchema,
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
      title: "Get User Favorite Characters List",
      description: "Get the list of fictional characters bookmarked/favorited by a specific user.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCharacterCollectionsInputSchema,
      outputSchema: schemas.getUserCharacterCollectionsOutputSchema,
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
      title: "Check User Favorite Status for a Character",
      description:
        "Get details on whether and when a specific user bookmarked/favorited a single fictional character.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserCharacterCollectionInputSchema,
      outputSchema: schemas.getUserCharacterCollectionOutputSchema,
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
      title: "Get User Favorite Staff, Creators & Voice Actors List",
      description:
        "Get the list of real-world people (voice actors/seiyu, creators, staff) and studios bookmarked/favorited by a specific user.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserPersonCollectionsInputSchema,
      outputSchema: schemas.getUserPersonCollectionsOutputSchema,
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
      title: "Check User Favorite Status for a Person or Studio",
      description:
        "Get details on whether and when a specific user bookmarked/favorited a single real-world person or studio.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getUserPersonCollectionInputSchema,
      outputSchema: schemas.getUserPersonCollectionOutputSchema,
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
      title: "Get Person Wiki Edit History",
      description:
        "Get a paginated list of wiki edit revisions for a real-world person or studio entry by person ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonRevisionsInputSchema,
      outputSchema: schemas.getPersonRevisionsOutputSchema,
    },
    ({ person_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/persons", {
          params: { query: { person_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_person_revision_by_id",
    {
      title: "Get Person Wiki Revision Details",
      description:
        "Get detailed content changes of a specific wiki edit revision for a person or studio by revision ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getPersonRevisionByIdInputSchema,
      outputSchema: schemas.getPersonRevisionByIdOutputSchema,
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
      title: "Get Character Wiki Edit History",
      description:
        "Get a paginated list of wiki edit revisions for a fictional character entry by character ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterRevisionsInputSchema,
      outputSchema: schemas.getCharacterRevisionsOutputSchema,
    },
    ({ character_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/characters", {
          params: { query: { character_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_character_revision_by_id",
    {
      title: "Get Character Wiki Revision Details",
      description:
        "Get detailed content changes of a specific wiki edit revision for a fictional character by revision ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getCharacterRevisionByIdInputSchema,
      outputSchema: schemas.getCharacterRevisionByIdOutputSchema,
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
      title: "Get Media Entry Wiki Edit History",
      description:
        "Get a paginated list of wiki edit revisions for a media entry (anime, manga, book, music, game, show) by media ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectRevisionsInputSchema,
      outputSchema: schemas.getSubjectRevisionsOutputSchema,
    },
    ({ subject_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/subjects", {
          params: { query: { subject_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_subject_revision_by_id",
    {
      title: "Get Media Entry Wiki Revision Details",
      description:
        "Get detailed content changes of a specific wiki edit revision for a media entry by revision ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getSubjectRevisionByIdInputSchema,
      outputSchema: schemas.getSubjectRevisionByIdOutputSchema,
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
      title: "Get Episode Wiki Edit History",
      description:
        "Get a paginated list of wiki edit revisions for an episode or track by episode ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodeRevisionsInputSchema,
      outputSchema: schemas.getEpisodeRevisionsOutputSchema,
    },
    ({ episode_id, limit, offset }) =>
      client.api
        .GET("/v0/revisions/episodes", {
          params: { query: { episode_id, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "get_episode_revision_by_id",
    {
      title: "Get Episode Wiki Revision Details",
      description:
        "Get detailed content changes of a specific wiki edit revision for an episode or track by revision ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getEpisodeRevisionByIdInputSchema,
      outputSchema: schemas.getEpisodeRevisionByIdOutputSchema,
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
      title: "Create Curated List (Directory)",
      description:
        "Create a new user-curated list (directory / collection playlist) for the current authenticated user.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      outputSchema: schemas.newIndexOutputSchema,
    },
    () => client.api.POST("/v0/indices").then(toJsonResult),
  );

  server.registerTool(
    "get_index_by_id",
    {
      title: "Get Curated List (Directory) Details",
      description:
        "Get metadata and details of a user-curated list (directory / collection playlist) by its list ID, including title, description, creator, and total items.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getIndexByIdInputSchema,
      outputSchema: schemas.getIndexByIdOutputSchema,
    },
    ({ index_id }) =>
      client.api
        .GET("/v0/indices/{index_id}", { params: { path: { index_id } } })
        .then(toJsonResult),
  );

  server.registerTool(
    "edit_index_by_id",
    {
      title: "Update Curated List Title & Description",
      description:
        "Update the title and description of a user-curated list (directory / collection playlist) by list ID.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.editIndexByIdInputSchema,
      outputSchema: schemas.editIndexByIdOutputSchema,
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
      title: "Get Items in Curated List (Directory)",
      description:
        "Get a paginated list of media entries (anime, manga, books, music, games, shows) included in a user-curated list by list ID.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: schemas.getIndexSubjectsByIndexIdInputSchema,
      // Upstream API issue: https://github.com/bangumi/api/issues/243
      outputSchema: schemas.getIndexSubjectsByIndexIdOutputSchema,
    },
    ({ index_id, type, limit, offset }) =>
      client.api
        .GET("/v0/indices/{index_id}/subjects", {
          params: { path: { index_id }, query: { type, limit, offset } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "add_subject_to_index",
    {
      title: "Add Media Entry to Curated List",
      description:
        "Add a media entry (anime, manga, book, music, game, show) to a user-curated list (directory) with an optional sort order and comment.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.addSubjectToIndexInputSchema,
      outputSchema: schemas.addSubjectToIndexOutputSchema,
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
    "edit_index_subject",
    {
      title: "Edit Media Entry in Curated List",
      description:
        "Update the sort order weight or comment of a media entry inside a user-curated list (creates the entry in the list if it does not already exist).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.editIndexSubjectInputSchema,
      outputSchema: schemas.editIndexSubjectOutputSchema,
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
    "delete_subject_from_index",
    {
      title: "Remove Media Entry from Curated List",
      description:
        "Remove a media entry from a user-curated list (directory) by list ID and media ID.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.deleteSubjectFromIndexInputSchema,
      outputSchema: schemas.deleteSubjectFromIndexOutputSchema,
    },
    ({ index_id, subject_id }) =>
      client.api
        .DELETE("/v0/indices/{index_id}/subjects/{subject_id}", {
          params: { path: { index_id, subject_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "collect_index",
    {
      title: "Favorite / Bookmark Curated List",
      description:
        "Add a user-curated list (directory) to the current authenticated user's favorites/bookmarks.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: schemas.collectIndexInputSchema,
      outputSchema: schemas.collectIndexOutputSchema,
    },
    ({ index_id }) =>
      client.api
        .POST("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        })
        .then(toJsonResult),
  );

  server.registerTool(
    "uncollect_index",
    {
      title: "Unfavorite / Remove Bookmarked Curated List",
      description:
        "Remove a user-curated list (directory) from the current authenticated user's favorites/bookmarks.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: schemas.uncollectIndexInputSchema,
      outputSchema: schemas.uncollectIndexOutputSchema,
    },
    ({ index_id }) =>
      client.api
        .DELETE("/v0/indices/{index_id}/collect", {
          params: { path: { index_id } },
        })
        .then(toJsonResult),
  );
}
