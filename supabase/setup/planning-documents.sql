-- Private documents; the planning-api authenticates the admin and signs reads.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('planning-documents','planning-documents',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
