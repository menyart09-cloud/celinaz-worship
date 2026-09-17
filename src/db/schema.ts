import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "leader"]);
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Worship domain
// ---------------------------------------------------------------------------

export const songSourceEnum = pgEnum("song_source", ["hymnal", "chorus", "other"]);
export type SongSource = (typeof songSourceEnum.enumValues)[number];

// The song library — every hymn/chorus ever used or catalogued. hymnNumber is
// text (not int) because it also holds "Comp" (played from the computer, no
// printed hymnal number) and "—" (no number at all).
export const songs = pgTable(
  "songs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hymnNumber: text("hymn_number").notNull().default("Comp"),
    title: text("title").notNull(),
    source: songSourceEnum("source").notNull().default("other"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("songs_hymn_title_unique").on(t.hymnNumber, t.title)],
);

// One row per Sunday (or planned future Sunday). Scripture is its own field;
// note covers overflow like "No church — bad weather", "Communion Sunday",
// "A cappella this week", a guest's name, etc.
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull().unique(),
  sermon: text("sermon"),
  scripture: text("scripture"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceSongs = pgTable("service_songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  songId: uuid("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "restrict" }),
  verses: text("verses"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Songs under consideration for a future service — not tied to the log.
export const shortlistItems = pgTable("shortlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  hymnNumber: text("hymn_number").notNull().default("Comp"),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// The owner's standing "Choruses" list from the spreadsheet — its own page,
// separate from the Song Library and Shortlist.
export const chorusItems = pgTable("chorus_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  hymnNumber: text("hymn_number").notNull().default("Comp"),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Order of Service — an editable run-sheet template per date. Not every date
// with an OOS necessarily has a matching `services` row (or vice versa).
export const oosItems = pgTable("oos_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull(),
  label: text("label").notNull(),
  assignee: text("assignee"),
  detail: text("detail"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const oosItemSongs = pgTable("oos_item_songs", {
  id: uuid("id").primaryKey().defaultRandom(),
  oosItemId: uuid("oos_item_id")
    .notNull()
    .references(() => oosItems.id, { onDelete: "cascade" }),
  songId: uuid("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "restrict" }),
  position: integer("position").notNull().default(0),
});

// Names offered as quick-pick pills on the Order of Service assignee field.
export const assigneeNames = pgTable("assignee_names", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
