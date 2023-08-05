import { Infer, v } from 'convex/values';
import { Table } from './lib/utils';

// Hierarchical location within tree
// TODO: build zone lookup from position, whether player-dependent or global.
// export const zone = v.array(v.string());
// export type Zone = Infer<typeof zone>;

export const Worlds = Table('worlds', {
  // name: v.string(),
  // characterIds: v.array(v.id('characters')),
  walls: v.array(v.array(v.number())),
  tiledim: v.number(), // tile size in pixels (assume square)
  width: v.number(),   // number of tiles wide 
  height: v.number(), 
  frozen: v.boolean(),
});

export const Position = v.object({ x: v.number(), y: v.number() });
export type Position = Infer<typeof Position>;
// Position plus a direction, as degrees counter-clockwise from East / Right

export const Pose = v.object({ position: Position, orientation: v.number() });
export type Pose = Infer<typeof Pose>;

export const StartConversation = v.object({
  type: v.literal('startConversation'),
  audience: v.array(v.id('players')),
});
export const SaySomething = v.object({
  type: v.literal('talking'),
  // If they are speaking to a person in particular.
  // If it's empty, it's just talking out loud.
  audience: v.array(v.id('players')),
  content: v.string(),
  // Refers to the first message in the conversation.
  conversationId: v.id('conversations'),
});
export const LeaveConversation = v.object({
  type: v.literal('leaveConversation'),
  conversationId: v.id('conversations'),
});

export const Action = v.union(
  StartConversation,
  SaySomething,
  LeaveConversation,
  v.object({
    type: v.literal('travel'),
    position: Position,
  }),
  v.object({
    type: v.literal('stop'),
  }),
  v.object({
    type: v.literal('done'),
    thinkId: v.id('journal'),
  }),
);
export type Action = Infer<typeof Action>;

export const Message = v.object({
  from: v.id('players'),
  fromName: v.string(),
  to: v.array(v.id('players')),
  toNames: v.array(v.string()),
  content: v.string(),
  ts: v.number(),
});
export type Message = Infer<typeof Message>;

export const Stopped = v.object({
  type: v.literal('stopped'),
  reason: v.union(v.literal('interrupted'), v.literal('idle')),
  pose: Pose,
});

export const Walking = v.object({
  type: v.literal('walking'),
  route: v.array(Position),
  startTs: v.number(),
  targetEndTs: v.number(),
});

export const Motion = v.union(Walking, Stopped);
export type Motion = Infer<typeof Motion>;

// Materiailized from journal & memories for a snapshot.
export const Player = v.object({
  id: v.id('players'),
  name: v.string(),
  characterId: v.id('characters'),
  identity: v.string(),
  motion: Motion,
  thinking: v.boolean(),
  lastSpokeTs: v.number(),
  lastSpokeConversationId: v.optional(v.id('conversations')),
});
export type Player = Infer<typeof Player>;

export const Snapshot = v.object({
  player: Player,
  lastPlan: v.optional(v.object({ plan: v.string(), ts: v.number() })),
  // recentMemories: v.array(memoryValidator),
  nearbyPlayers: v.array(
    v.object({
      player: Player,
      new: v.boolean(),
      relationship: v.string(),
    }),
  ),
  nearbyConversations: v.array(
    v.object({ conversationId: v.id('conversations'), messages: v.array(Message) }),
  ),
});
export type Snapshot = Infer<typeof Snapshot>;

// Journal documents are append-only, and define an player's state.
export const Journal = Table('journal', {
  ts: v.optional(v.number()), // TODO: delete later
  playerId: v.id('players'),
  // emojiSummary: v.string(),
  data: v.union(
    v.object({
      type: v.literal('startConversation'),
      audience: v.array(v.id('players')),
      conversationId: v.id('conversations'),
    }),
    SaySomething,
    LeaveConversation,
    Stopped,
    Walking,
    // When we run the agent loop.
    v.object({
      type: v.literal('thinking'),
      snapshot: Snapshot,
      finishedTs: v.optional(v.number()),
    }),
    // In case we don't do anything, confirm we're done thinking.
    // TODO: Unused, clean up later:
    v.object({
      type: v.literal('done_thinking'),
    }),

    // Exercises left to the reader:

    // v.object({
    //   type: v.literal('reflecting'),
    // }),
    // v.object({
    //   type: v.literal('activity'),
    //   description: v.string(),
    // 	// objects: v.array(v.object({ id: v.id('objects'), action: v.string() })),
    //   pose: Pose,
    // }),
  ),
});
export type Entry = Infer<typeof Journal.doc>;
export type EntryType = Entry['data']['type'];
export type EntryOfType<T extends EntryType> = Omit<Entry, 'data'> & {
  data: Extract<Entry['data'], { type: T }>;
};

export const Memories = Table('memories', {
  playerId: v.id('players'),
  description: v.string(),
  embeddingId: v.id('embeddings'),
  importance: v.number(),
  ts: v.optional(v.number()), // TODO: delete later
  data: v.union(
    // Useful for seed memories, high level goals
    v.object({
      type: v.literal('identity'),
    }),
    // Setting up dynamics between players
    v.object({
      type: v.literal('relationship'),
      playerId: v.id('players'),
    }),
    // Per-agent summary of recent observations
    // Can start out all the same, but could be dependent on personality
    v.object({
      type: v.literal('conversation'),
      conversationId: v.id('conversations'),
    }),
    v.object({
      type: v.literal('plan'),
    }),

    // Exercises left to the reader:

    // v.object({
    //   type: v.literal('reflection'),
    //   relatedMemoryIds: v.array(v.id('memories')),
    // }),
    // v.object({
    //   type: v.literal('observation'),
    //   object: v.string(),
    //   pose: Pose,
    // }),
    // Seemed too noisey for every message for every party, but maybe?
    // v.object({
    //   type: v.literal('message'),
    //   messageId: v.id('messages'),
    //   relatedMemoryIds: v.optional(v.array(v.id('memories'))),
    // }),
    // Could be a way to have the agent reflect and change identities
  ),
});
export type Memory = Infer<typeof Memories.doc>;
export type MemoryType = Memory['data']['type'];
export type MemoryOfType<T extends MemoryType> = Omit<Memory, 'data'> & {
  data: Extract<Memory['data'], { type: T }>;
};

export const Characters = Table('characters', {
  name: v.string(),
  textureUrl: v.string(),
  textureStorageId: v.optional(v.string()),
  spritesheetData: v.object({
    frames: v.any(), // Record<string, { frame: { x, y, w, h }, rotated?: boolean, trimmed?: boolean, spriteSourceSize: { x, y }, sourceSize: { w, h }, anchor?: {x, y} border?: {left, right, top, bottom} }>
    animations: v.optional(v.any()), // Record<string, string[]>
    meta: v.object({
      scale: v.string(),
    }),
  }),
  speed: v.number(),
});
export type SpritesheetData = Infer<(typeof Characters.fields)['spritesheetData']>;
