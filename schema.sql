-- ============================================================
-- Rule-Driven Allocation System — Supabase Schema

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ─── 1. Departments ─────────────────────────────────────────
create table departments (
  dept_id   uuid primary key default gen_random_uuid(),
  name      text not null unique
);

comment on table departments is 'Top-level organisational units.';


-- ─── 2. Sessions ────────────────────────────────────────────
create table sessions (
  session_id  uuid primary key default gen_random_uuid(),
  name        text not null,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  -- Hard limit: no session may hold more than 20 participants (constraint #1)
  capacity    int not null default 20 check (capacity > 0 and capacity <= 20),
  constraint sessions_time_check check (end_time > start_time)
);

comment on table sessions is 'Bookable sessions. Hard cap: 20 participants max (capacity <= 20).';


-- ─── 3. Managers ────────────────────────────────────────────
-- Mirrors the auth.users table via user_id.
create table managers (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  dept_id   uuid not null references departments (dept_id) on delete restrict,
  email     text not null unique
);

comment on table managers is 'One or more managers per department.';

create index idx_managers_dept on managers (dept_id);


-- ─── 4. Participants ────────────────────────────────────────
create table participants (
  participant_id  uuid primary key default gen_random_uuid(),
  username        text not null unique,
  email           text not null unique,
  dept_id         uuid not null references departments (dept_id) on delete restrict
);

comment on table participants is 'People who can be allocated to sessions.';

create index idx_participants_dept on participants (dept_id);


-- ─── 5. Max Allocations Per Session Per Department ──────────
-- This is the rule table: how many seats a dept may use in a session.
create table max_allocations_per_session (
  dept_id     uuid not null references departments (dept_id) on delete cascade,
  session_id  uuid not null references sessions (session_id) on delete cascade,
  max_seats   int not null check (max_seats >= 0),
  primary key (dept_id, session_id)
);

comment on table max_allocations_per_session is
  'Per-department seat cap within a given session (the rule store).';

create index idx_maxalloc_session on max_allocations_per_session (session_id);


-- ─── 6. Allocations ─────────────────────────────────────────
create table allocations (
  allocation_id   uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references participants (participant_id) on delete cascade,
  session_id      uuid not null references sessions (session_id) on delete cascade,
  dept_id         uuid not null references departments (dept_id) on delete restrict,
  created_at      timestamptz not null default now(),
  -- Constraint #2: a participant may only ever be assigned to ONE session system-wide
  unique (participant_id)
);

comment on table allocations is 'Confirmed bookings. Each participant may hold at most one allocation across all sessions.';

create index idx_allocations_session  on allocations (session_id);
create index idx_allocations_dept     on allocations (dept_id);
create index idx_allocations_created  on allocations (created_at desc);


-- ============================================================
-- Enforcement: dept quota check via DB function + trigger
-- Prevents over-allocation at the database level.
-- ============================================================

create or replace function check_dept_session_quota()
returns trigger language plpgsql as $$
declare
  current_dept_count  int;
  allowed             int;
  total_session_count int;
  session_capacity    int;
begin
  -- ── Constraint #1: session-wide hard cap (max 20 total participants) ──
  select count(*) into total_session_count
  from allocations
  where session_id = new.session_id;

  select capacity into session_capacity
  from sessions
  where session_id = new.session_id;

  if total_session_count >= session_capacity then
    raise exception
      'Session % is full (capacity: % / %)',
      new.session_id, total_session_count, session_capacity;
  end if;

  -- ── Constraint #3: per-department seat cap ────────────────────────────
  select count(*) into current_dept_count
  from allocations
  where session_id = new.session_id
    and dept_id    = new.dept_id;

  select max_seats into allowed
  from max_allocations_per_session
  where session_id = new.session_id
    and dept_id    = new.dept_id;

  if allowed is null then
    raise exception
      'No allocation rule found for dept % in session %',
      new.dept_id, new.session_id;
  end if;

  if current_dept_count >= allowed then
    raise exception
      'Dept % has reached its seat limit (% of %) for session %',
      new.dept_id, current_dept_count, allowed, new.session_id;
  end if;

  return new;
end;
$$;

create trigger trg_check_quota
  before insert on allocations
  for each row execute function check_dept_session_quota();


-- ============================================================
-- Enforcement: manager-department + participant-department rules
-- Rule 1 — the acting user must be a manager of new.dept_id
-- Rule 2 — the participant must belong to that same department
-- Both checks run inside the DB to avoid RLS bypasses; 
-- ============================================================

create or replace function check_allocation_ownership()
returns trigger language plpgsql security definer as $$
declare
  actor_dept_id      uuid;
  participant_dept   uuid;
begin
  -- Rule 1: resolve the dept the current user manages
  select dept_id into actor_dept_id
  from managers
  where user_id = auth.uid();

  if actor_dept_id is null then
    raise exception
      'Access denied: user % is not a manager', auth.uid();
  end if;

  -- Rule 2: the allocation must be for the manager's own department
  if new.dept_id <> actor_dept_id then
    raise exception
      'Access denied: manager % can only allocate seats for their own department (%)',
      auth.uid(), actor_dept_id;
  end if;

  -- Rule 3: the participant must belong to that same department
  select dept_id into participant_dept
  from participants
  where participant_id = new.participant_id;

  if participant_dept is null then
    raise exception
      'Participant % does not exist', new.participant_id;
  end if;

  if participant_dept <> actor_dept_id then
    raise exception
      'Access denied: participant % belongs to a different department',
      new.participant_id;
  end if;

  -- Stamp the correct dept_id so callers cannot spoof it
  new.dept_id := actor_dept_id;

  return new;
end;
$$;

-- Fires BEFORE the quota trigger so bad inserts are rejected early
create trigger trg_check_ownership
  before insert on allocations
  for each row execute function check_allocation_ownership();


-- ============================================================
-- Constraint #4 — System view: remaining seats per session
-- Surfaces both the session-wide and per-department picture
-- so the UI can show exactly what is available at all times.
-- ============================================================

-- 4a. Session-level availability (total seats vs 20-seat hard cap)
create or replace view v_session_availability as
select
  s.session_id,
  s.name                                          as session_name,
  s.start_time,
  s.end_time,
  s.capacity                                      as max_capacity,
  coalesce(a.total_allocated, 0)                  as total_allocated,
  s.capacity - coalesce(a.total_allocated, 0)     as remaining_seats,
  case
    when s.capacity - coalesce(a.total_allocated, 0) = 0 then 'full'
    when s.capacity - coalesce(a.total_allocated, 0) <= 3 then 'almost full'
    else 'available'
  end                                             as availability_status
from sessions s
left join (
  select session_id, count(*) as total_allocated
  from allocations
  group by session_id
) a on a.session_id = s.session_id;

-- 4b. Per-department remaining seats within each session (constraint #3 view)
create or replace view v_dept_session_availability as
select
  m.dept_id,
  d.name                                          as dept_name,
  m.session_id,
  s.name                                          as session_name,
  s.start_time,
  s.end_time,
  m.max_seats                                     as dept_max_seats,
  coalesce(a.used, 0)                             as dept_used_seats,
  m.max_seats - coalesce(a.used, 0)               as dept_remaining_seats,
  -- Session-wide figures alongside for a complete picture
  sv.max_capacity                                 as session_capacity,
  sv.total_allocated                              as session_total_allocated,
  sv.remaining_seats                              as session_remaining_seats,
  sv.availability_status
from max_allocations_per_session m
join departments            d  on d.dept_id    = m.dept_id
join sessions               s  on s.session_id = m.session_id
join v_session_availability sv on sv.session_id = m.session_id
left join (
  select dept_id, session_id, count(*) as used
  from allocations
  group by dept_id, session_id
) a on a.dept_id = m.dept_id and a.session_id = m.session_id;


-- ============================================================
-- Row-Level Security
-- ============================================================

-- Enable RLS on every table
alter table departments                    enable row level security;
alter table sessions                       enable row level security;
alter table managers                       enable row level security;
alter table participants                   enable row level security;
alter table max_allocations_per_session    enable row level security;
alter table allocations                    enable row level security;

--is the current user a manager for the given dept?
create or replace function is_manager_of(p_dept_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from managers
    where user_id = auth.uid()
      and dept_id = p_dept_id
  );
$$;

-- departments: anyone authenticated can read; only managers can insert/update their own dept
create policy "dept_read"   on departments for select using (auth.role() = 'authenticated');
create policy "dept_write"  on departments for all    using (is_manager_of(dept_id));

-- sessions: readable by all authenticated users; managed by any manager (adjust as needed)
create policy "session_read"  on sessions for select using (auth.role() = 'authenticated');
create policy "session_write" on sessions for all    using (auth.role() = 'authenticated');

-- managers: a manager can only read/edit their own row
create policy "mgr_self" on managers for all using (user_id = auth.uid());

-- participants: managers of the same dept can manage; participant can see their own row
create policy "participant_mgr"  on participants for all    using (is_manager_of(dept_id));
create policy "participant_self" on participants for select using (email = (select email from auth.users where id = auth.uid()));

-- max_allocations_per_session: managers of the dept can manage rules for their dept
create policy "maxalloc_mgr"  on max_allocations_per_session for all    using (is_manager_of(dept_id));
create policy "maxalloc_read" on max_allocations_per_session for select using (auth.role() = 'authenticated');

-- allocations: a manager may only insert/delete rows where dept_id matches their own dept.
-- The trigger (trg_check_ownership) enforces this at the function level as a second guard.
create policy "alloc_insert" on allocations
  for insert with check (
    is_manager_of(dept_id)
    and exists (
      select 1 from participants p
      where p.participant_id = allocations.participant_id
        and p.dept_id = allocations.dept_id
    )
  );

create policy "alloc_delete" on allocations
  for delete using (is_manager_of(dept_id));

create policy "alloc_read" on allocations
  for select using (auth.role() = 'authenticated');
