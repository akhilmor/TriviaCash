-- USER PROFILES
create table profiles (
  id uuid primary key default auth.uid(),
  username text,
  created_at timestamp default now()
);

-- GAME ROOMS
create table games (
  id uuid primary key default gen_random_uuid(),
  status text default 'waiting', -- waiting, active, finished
  created_at timestamp default now()
);

-- PLAYERS IN A GAME
create table game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id),
  user_id uuid references profiles(id),
  score int default 0,
  joined_at timestamp default now()
);

-- SECURITY
alter table profiles enable row level security;
alter table games enable row level security;
alter table game_players enable row level security;

create policy "read all profiles" on profiles for select using (true);
create policy "read all games" on games for select using (true);
create policy "read all game players" on game_players for select using (true);

create policy "insert profiles" on profiles for insert with check (true);
create policy "insert players" on game_players for insert with check (true);

