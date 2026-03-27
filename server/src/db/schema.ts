import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const operationStatusEnum = pgEnum('operation_status', [
  'draft',
  'active',
  'suspended',
  'escalated',
  'closed',
  'archived',
])

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'incident_commander',
  'search_coordinator',
  'field_team_leader',
  'analyst',
])

export const evidenceTypeEnum = pgEnum('evidence_type', [
  'witness_statement',
  'cctv_sighting',
  'mobile_ping',
  'clothing_item',
  'tracks',
  'drone_image',
  'field_observation',
  'negative_search',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('analyst'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const operations = pgTable('operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: operationStatusEnum('status').notNull().default('draft'),
  areaOfInterest: jsonb('area_of_interest'),
  searchRadius: real('search_radius'),
  terrainRegion: text('terrain_region'),
  startDate: timestamp('start_date'),
  operationalDays: integer('operational_days').default(1),
  notes: text('notes'),
  mode: text('mode').default('manual'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'cascade' }),
  name: text('name'),
  age: integer('age'),
  sex: text('sex'),
  personType: text('person_type'),
  experienceLevel: text('experience_level'),
  intentCategory: text('intent_category'),
  medicalHistory: text('medical_history'),
  mobilityLevel: text('mobility_level'),
  clothing: text('clothing'),
  lastKnownLocation: jsonb('last_known_location'),
  lastContactTime: timestamp('last_contact_time'),
  behaviorProfile: jsonb('behavior_profile'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  type: evidenceTypeEnum('type').notNull(),
  location: jsonb('location'),
  timestamp: timestamp('timestamp'),
  confidenceScore: real('confidence_score'),
  source: text('source'),
  notes: text('notes'),
  attachments: jsonb('attachments'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const searchSectors = pgTable('search_sectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'cascade' }),
  name: text('name'),
  polygon: jsonb('polygon'),
  priorityScore: real('priority_score'),
  terrainDifficulty: text('terrain_difficulty'),
  assignedTeam: text('assigned_team'),
  searched: boolean('searched').default(false),
  coverageQuality: real('coverage_quality'),
  dateSearched: timestamp('date_searched'),
  findings: text('findings'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const simulationRuns = pgTable('simulation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  agentCount: integer('agent_count').default(100),
  durationHours: real('duration_hours'),
  weatherSnapshot: jsonb('weather_snapshot'),
  parameters: jsonb('parameters'),
  status: text('status').default('pending'),
  probabilitySurface: jsonb('probability_surface'),
  hotspots: jsonb('hotspots'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
})

export const logEntries = pgTable('log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  actionType: text('action_type').notNull(),
  affectedEntity: text('affected_entity'),
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const basecamps = pgTable('basecamps', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  location: jsonb('location').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const pois = pgTable('pois', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type'),
  location: jsonb('location').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
})