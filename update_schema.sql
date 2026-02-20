-- ============================================================
-- Merge & Split Schema Update for 'example-app' database
-- Table: public.featuresdrawn (PK: fid)
-- ============================================================

-- Add parent-child tracking columns
ALTER TABLE public.featuresdrawn
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES public.featuresdrawn(fid),
  ADD COLUMN IF NOT EXISTS parcel_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS operation_note TEXT;

-- Lineage convenience view
CREATE OR REPLACE VIEW public.parcel_lineage AS
  SELECT
    c.fid               AS child_id,
    c.name              AS child_name,
    c.parcel_status     AS child_status,
    c.operation_note,
    p.fid               AS parent_id,
    p.name              AS parent_name,
    p.parcel_status     AS parent_status
  FROM public.featuresdrawn c
  LEFT JOIN public.featuresdrawn p ON c.parent_id = p.fid;
