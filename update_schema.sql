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

-- ============================================================
-- Cadastral Module: Boundary Disputes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.boundary_disputes (
    id                 SERIAL PRIMARY KEY,
    parcel_id          INTEGER REFERENCES public.featuresdrawn(fid) ON DELETE SET NULL,
    claimant_name      TEXT NOT NULL,
    claimant_contact   TEXT,
    dispute_description TEXT,
    evidence_checklist  JSONB DEFAULT '[]',
    uploaded_files      JSONB DEFAULT '[]',
    submitted_by        TEXT DEFAULT 'system',
    status              VARCHAR(20) DEFAULT 'open',  -- open | under_review | resolved | rejected
    resolution_note     TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boundary_disputes_parcel
    ON public.boundary_disputes (parcel_id);
CREATE INDEX IF NOT EXISTS idx_boundary_disputes_status
    ON public.boundary_disputes (status);

-- ============================================================
-- Cadastral Module: Boundary Adjustment Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.boundary_adjustments (
    id                SERIAL PRIMARY KEY,
    parcel_id         INTEGER REFERENCES public.featuresdrawn(fid) ON DELETE SET NULL,
    reason            TEXT NOT NULL,
    surveyor_ref      TEXT,                  -- Licensed surveyor reference no.
    surveyor_date     DATE,
    adjustment_notes  TEXT,
    submitted_by      TEXT DEFAULT 'system',
    status            VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected
    reviewed_by       TEXT,
    review_note       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boundary_adjustments_parcel
    ON public.boundary_adjustments (parcel_id);

-- ============================================================
-- Cadastral Module: GPS Coordinates Update Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coords_updates (
    id              SERIAL PRIMARY KEY,
    parcel_id       INTEGER REFERENCES public.featuresdrawn(fid) ON DELETE SET NULL,
    gps_source      TEXT,                  -- GPS receiver model / survey instrument
    survey_date     DATE,
    accuracy_m      NUMERIC(10,4),         -- accuracy in metres
    coords_geojson  JSONB,                 -- new coordinate GeoJSON
    notes           TEXT,
    submitted_by    TEXT DEFAULT 'system',
    status          VARCHAR(20) DEFAULT 'pending',  -- pending | applied | rejected
    applied_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coords_updates_parcel
    ON public.coords_updates (parcel_id);

