-- Allow 'document' media_type for confirmation file uploads
ALTER TABLE trip_media DROP CONSTRAINT IF EXISTS trip_media_media_type_check;
ALTER TABLE trip_media ADD CONSTRAINT trip_media_media_type_check
  CHECK (media_type IN ('image', 'video', 'document'));
