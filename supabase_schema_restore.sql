-- MoveMate Database Schema Restoration Script
-- This script creates all tables, constraints, and indexes
-- Run this on a fresh Supabase project via SQL Editor

-- ============================================
-- CREATE TABLES
-- ============================================

-- Venues table (must be created first due to foreign key dependencies)
CREATE TABLE IF NOT EXISTS public.venues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    contact_email text,
    contact_phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Super admins table
CREATE SEQUENCE IF NOT EXISTS public.super_admins_id_seq;

CREATE TABLE IF NOT EXISTS public.super_admins (
    id integer NOT NULL DEFAULT nextval('public.super_admins_id_seq'::regclass),
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER SEQUENCE public.super_admins_id_seq OWNED BY public.super_admins.id;

-- Venue admins table
CREATE TABLE IF NOT EXISTS public.venue_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    venue_id uuid,
    username text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reg text NOT NULL,
    phone text,
    consent_timestamp timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    venue_id uuid,
    vehicle_data text DEFAULT ''::text,
    member_id uuid
);

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- Primary Keys
ALTER TABLE ONLY public.venues
    ADD CONSTRAINT IF NOT EXISTS venues_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT IF NOT EXISTS super_admins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.venue_admins
    ADD CONSTRAINT IF NOT EXISTS venue_admins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT IF NOT EXISTS registrations_pkey PRIMARY KEY (id);

-- Unique Constraints
ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT IF NOT EXISTS super_admins_email_key UNIQUE (email);

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT IF NOT EXISTS super_admins_username_key UNIQUE (username);

ALTER TABLE ONLY public.venue_admins
    ADD CONSTRAINT IF NOT EXISTS venue_admins_email_key UNIQUE (email);

ALTER TABLE ONLY public.venue_admins
    ADD CONSTRAINT IF NOT EXISTS venue_admins_username_key UNIQUE (username);

-- Foreign Keys
ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT IF NOT EXISTS registrations_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id);

ALTER TABLE ONLY public.venue_admins
    ADD CONSTRAINT IF NOT EXISTS venue_admins_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_member ON public.registrations USING btree (member_id);
CREATE INDEX IF NOT EXISTS idx_registrations_reg ON public.registrations USING btree (reg);
CREATE INDEX IF NOT EXISTS idx_registrations_venue_id ON public.registrations USING btree (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_admins_venue_id ON public.venue_admins USING btree (venue_id);
CREATE INDEX IF NOT EXISTS idx_venues_active ON public.venues USING btree (is_active);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these after to verify tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM public.venues;
-- SELECT * FROM public.super_admins;
-- SELECT * FROM public.registrations;
