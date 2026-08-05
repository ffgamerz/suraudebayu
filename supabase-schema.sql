-- Kariah Surau De Bayu Registration Table
-- Run this in your Supabase SQL Editor after creating a project

-- 1. Create table
create table kariah_registrations (
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
create index kariah_registrations_no_kad_pengenalan_idx on kariah_registrations(no_kad_pengenalan);
create index kariah_registrations_no_unit_idx on kariah_registrations(no_unit);
create index kariah_registrations_created_at_idx on kariah_registrations(created_at desc);

-- 3. Row Level Security — allow public to insert registrations
-- Required for the public-facing registration form
alter table kariah_registrations enable row level security;

create policy "Allow public insert"
  on kariah_registrations
  for insert
  with check (true);

create policy "Allow public select"
  on kariah_registrations
  for select
  using (true);
