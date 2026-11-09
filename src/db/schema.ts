import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
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
// "A cappella this week", a guest's name, etc. personalNote is a separate,
// private reminder to self (e.g. "Teens leading singing with Mark and
// Kenzie") — never printed or shown on the Order of Service, unlike note.
export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull().unique(),
  sermon: text("sermon"),
  scripture: text("scripture"),
  note: text("note"),
  personalNote: text("personal_note"),
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
  // Which Order of Service item this song belongs under when pulled — an
  // item label like "Opening Song", matched loosely (see normalizeLabel).
  // Null means Worship, the default for an ordinary logged song.
  destination: text("destination"),
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
  notes: text("notes"),
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
  notes: text("notes"),
});

// A song removed from an Order of Service item by hand — "Pull from Service
// Log" must never bring it back for that item just because it's still
// logged on the service, even after a later pull adds some other new song.
export const oosItemExcludedSongs = pgTable(
  "oos_item_excluded_songs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    oosItemId: uuid("oos_item_id")
      .notNull()
      .references(() => oosItems.id, { onDelete: "cascade" }),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
  },
  (t) => [unique("oos_item_excluded_songs_unique").on(t.oosItemId, t.songId)],
);

// Names offered as quick-pick pills on the Order of Service assignee field.
export const assigneeNames = pgTable("assignee_names", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A date's Order of Service is visible to the team (Sound Booth today,
// Praise Team later) only once a row exists here — nothing is shared by
// default, and a date is removed from this table rather than ever storing
// a "false" row, so "visible" is just "has a row," not a flag to check.
export const oosVisibleDates = pgTable("oos_visible_dates", {
  date: date("date", { mode: "string" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Sound Booth scheduling — a separate, limited-access side of the app for
// the sound booth team. Deliberately decoupled from `users`/next-auth: a
// roster member signs in with a PIN the owner sets, never a real account,
// so this whole feature can't affect how the owner or other leaders log in.
// ---------------------------------------------------------------------------

export const soundBoothPositionEnum = pgEnum("sound_booth_position", ["MediaShout", "Sound", "Live"]);
export type SoundBoothPosition = (typeof soundBoothPositionEnum.enumValues)[number];

export const soundBoothStatusEnum = pgEnum("sound_booth_status", ["pending", "yes", "no"]);
export type SoundBoothStatus = (typeof soundBoothStatusEnum.enumValues)[number];

export const soundBoothAvailabilityKindEnum = pgEnum("sound_booth_availability_kind", ["available", "unavailable"]);
export type SoundBoothAvailabilityKind = (typeof soundBoothAvailabilityKindEnum.enumValues)[number];

// One row per team member. pinHash is bcrypt, same as users.passwordHash —
// the PIN itself is the owner's choice (often a birthday), but it's still
// hashed at rest rather than stored plain.
export const soundBoothRoster = pgTable("sound_booth_roster", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  pinHash: text("pin_hash"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A date the sound booth is being scheduled for. Whether it's short-staffed
// is judged against whether `services` has a row for this same date — not
// stored here — so a date scheduled ahead of the Service Log never reads as
// a real gap.
export const soundBoothDates = pgTable("sound_booth_dates", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const soundBoothAssignments = pgTable(
  "sound_booth_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dateId: uuid("date_id")
      .notNull()
      .references(() => soundBoothDates.id, { onDelete: "cascade" }),
    position: soundBoothPositionEnum("position").notNull(),
    rosterId: uuid("roster_id").references(() => soundBoothRoster.id, { onDelete: "set null" }),
    status: soundBoothStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("sound_booth_assignments_date_position_unique").on(t.dateId, t.position)],
);

// A person's date-level self-report ("I can help" / "I'm unavailable"),
// separate from any one position's yes/no. At most one row per person per
// date — picking the other kind replaces this row rather than adding one.
export const soundBoothAvailability = pgTable(
  "sound_booth_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dateId: uuid("date_id")
      .notNull()
      .references(() => soundBoothDates.id, { onDelete: "cascade" }),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => soundBoothRoster.id, { onDelete: "cascade" }),
    kind: soundBoothAvailabilityKindEnum("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("sound_booth_availability_date_roster_unique").on(t.dateId, t.rosterId)],
);

// ---------------------------------------------------------------------------
// Team groups — the roster above is shared across every team (Sound Booth,
// Praise Team, more later); which group(s) a person belongs to is what
// decides what shows up on their phone once they sign in, not a separate
// account per team. A row here means "this person is in this group" — same
// has-a-row-or-doesn't convention as oos_visible_dates.
// ---------------------------------------------------------------------------

export const teamGroupEnum = pgEnum("team_group", ["sound_booth", "praise_team"]);
export type TeamGroup = (typeof teamGroupEnum.enumValues)[number];

export const teamGroupMembership = pgTable(
  "team_group_membership",
  {
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => soundBoothRoster.id, { onDelete: "cascade" }),
    group: teamGroupEnum("group").notNull(),
  },
  (t) => [primaryKey({ columns: [t.rosterId, t.group] })],
);

// ---------------------------------------------------------------------------
// Praise Team scheduling — singers only, no fixed roles like Sound Booth's
// positions, so a date just holds a variable list of who's singing rather
// than three fixed slots. Its own date/availability tables (not reusing
// Sound Booth's) so the already-live Sound Booth tables are never touched
// by this feature; the two share only the roster and the status/kind enums.
// ---------------------------------------------------------------------------

export const praiseTeamDates = pgTable("praise_team_dates", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date", { mode: "string" }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const praiseTeamSingers = pgTable(
  "praise_team_singers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dateId: uuid("date_id")
      .notNull()
      .references(() => praiseTeamDates.id, { onDelete: "cascade" }),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => soundBoothRoster.id, { onDelete: "cascade" }),
    status: soundBoothStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("praise_team_singers_date_roster_unique").on(t.dateId, t.rosterId)],
);

export const praiseTeamAvailability = pgTable(
  "praise_team_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dateId: uuid("date_id")
      .notNull()
      .references(() => praiseTeamDates.id, { onDelete: "cascade" }),
    rosterId: uuid("roster_id")
      .notNull()
      .references(() => soundBoothRoster.id, { onDelete: "cascade" }),
    kind: soundBoothAvailabilityKindEnum("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("praise_team_availability_date_roster_unique").on(t.dateId, t.rosterId)],
);
