-- Kariah Surau De Bayu Registration Table
-- Run this in your Supabase SQL Editor after creating a project

-- 1. Create table (if not exists)
create table if not exists kariah_registrations (
  id bigserial primary key,
  nama_pemohon text not null,
  no_kad_pengenalan text not null,
  alamat_dalam_kad_pengenalan text not null,
  no_unit text not null,
  status_pemilikan text check (status_pemilikan in ('Pemilik', 'Penyewa')) not null,
  no_hp text not null,
  email text,
  status_perkahwinan text check (status_perkahwinan in ('Bujang', 'Berkahwin')) not null,
  tempoh_masa_menetap text not null,
  bilangan_isi_rumah int not null,
  pengakuan boolean default false not null,
  created_at timestamp with time zone default now()
);

-- 2. Indexes for performance
create index if not exists kariah_registrations_no_kad_pengenalan_idx on kariah_registrations(no_kad_pengenalan);
create index if not exists kariah_registrations_no_unit_idx on kariah_registrations(no_unit);
create index if not exists kariah_registrations_created_at_idx on kariah_registrations(created_at desc);
create index if not exists kariah_registrations_nama_idx on kariah_registrations(nama_pemohon);

-- 3. Row Level Security
alter table kariah_registrations enable row level security;

-- Allow anyone to insert (public registration form)
create policy "Allow public insert"
  on kariah_registrations
  for insert
  with check (true);

-- Allow anyone to select (for admin verification)
create policy "Allow public select"
  on kariah_registrations
  for select
  using (true);

-- Allow authenticated users (admin) to update
create policy "Allow authenticated update"
  on kariah_registrations
  for update
  using (auth.role() = 'authenticated');

-- Allow authenticated users (admin) to delete
create policy "Allow authenticated delete"
  on kariah_registrations
  for delete
  using (auth.role() = 'authenticated');
