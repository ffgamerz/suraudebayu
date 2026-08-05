alter table kariah_registrations add column if not exists updated_at timestamp with time zone default now();

create policy "Allow authenticated update"
  on kariah_registrations
  for update
  using (auth.role() = 'authenticated');

create policy "Allow authenticated delete"
  on kariah_registrations
  for delete
  using (auth.role() = 'authenticated');
