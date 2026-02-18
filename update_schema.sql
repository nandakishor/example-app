-- Add new columns for land parcel architecture
ALTER TABLE public."featuresDrawn" 
ADD COLUMN survey_number text, 
ADD COLUMN owner_name text, 
ADD COLUMN area double precision;
