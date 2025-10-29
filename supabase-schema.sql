-- Braid & Barber Hub Database Schema
-- =====================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stylists table
CREATE TABLE stylists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  display_name TEXT,
  salon_name TEXT,
  offers_mobile BOOLEAN DEFAULT false,
  base_city TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price_cents INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,
  allow_addons BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time slots table
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  start_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  end_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  price_cents INTEGER NOT NULL,
  deposit_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites table (for user favorites)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT, -- In a real app, this would reference a users table
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stylist_id)
);

-- Indexes for better performance
CREATE INDEX idx_stylists_city ON stylists(base_city);
CREATE INDEX idx_services_stylist ON services(stylist_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_slots_stylist ON slots(stylist_id);
CREATE INDEX idx_slots_time ON slots(start_ts, end_ts);
CREATE INDEX idx_bookings_stylist ON bookings(stylist_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- RPC Functions
-- =============

-- Search stylists by city and category
CREATE OR REPLACE FUNCTION search_stylists(
  city_q TEXT,
  category_q TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  salon_name TEXT,
  offers_mobile BOOLEAN,
  base_city TEXT,
  rating DECIMAL,
  avatar_url TEXT,
  services JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.display_name,
    s.salon_name,
    s.offers_mobile,
    s.base_city,
    s.rating,
    s.avatar_url,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', svc.id,
            'title', svc.title,
            'category', svc.category,
            'base_price_cents', svc.base_price_cents,
            'duration_min', svc.duration_min,
            'allow_addons', svc.allow_addons,
            'description', svc.description
          )
        )
        FROM services svc
        WHERE svc.stylist_id = s.id
      ),
      '[]'::jsonb
    ) as services
  FROM stylists s
  WHERE 
    s.base_city ILIKE '%' || city_q || '%'
    AND (
      category_q IS NULL 
      OR EXISTS (
        SELECT 1 FROM services svc 
        WHERE svc.stylist_id = s.id 
        AND svc.category ILIKE '%' || category_q || '%'
      )
    )
  ORDER BY s.rating DESC, s.display_name;
END;
$$ LANGUAGE plpgsql;

-- List open slots for a stylist
CREATE OR REPLACE FUNCTION list_open_slots(
  stylist UUID
)
RETURNS TABLE (
  id UUID,
  stylist_id UUID,
  start_ts TIMESTAMP WITH TIME ZONE,
  end_ts TIMESTAMP WITH TIME ZONE,
  is_booked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.stylist_id,
    s.start_ts,
    s.end_ts,
    s.is_booked
  FROM slots s
  WHERE 
    s.stylist_id = stylist
    AND s.is_booked = false
    AND s.start_ts > NOW()
  ORDER BY s.start_ts;
END;
$$ LANGUAGE plpgsql;

-- Sample data
-- ===========

-- Insert sample stylists
INSERT INTO stylists (id, display_name, salon_name, base_city, rating, avatar_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Ama — Knotless Pro', 'Ama''s Braid Studio', 'Stockholm', 4.8, 'https://placehold.co/300x300'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bella — Sew-in & Wigs', 'Bella''s Hair Lounge', 'Stockholm', 4.6, 'https://placehold.co/300x300'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Kofi — Barber Fade', 'Kofi''s Barbershop', 'Stockholm', 4.7, 'https://placehold.co/300x300');

-- Insert sample services
INSERT INTO services (stylist_id, title, category, base_price_cents, duration_min, allow_addons, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Knotless braids (mid back)', 'Knotless', 250000, 240, true, 'Beautiful knotless braids that last 6-8 weeks'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Cornrows (feed-in)', 'Feed-in Cornrows', 120000, 120, true, 'Classic feed-in cornrows with natural hair'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Sew-In install', 'Sew-In', 220000, 180, true, 'Professional sew-in installation'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Wig install', 'Wig Install', 190000, 150, true, 'Secure wig installation with natural look'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Fade + line-up', 'Barber: Fade', 45000, 45, false, 'Clean fade with sharp line-up');

-- Insert sample time slots (next 7 days)
INSERT INTO slots (stylist_id, start_ts, end_ts, is_booked) 
SELECT 
  stylist_id,
  start_time,
  start_time + INTERVAL '90 minutes',
  false
FROM (
  SELECT 
    unnest(ARRAY[
      '550e8400-e29b-41d4-a716-446655440001'::uuid,
      '550e8400-e29b-41d4-a716-446655440002'::uuid,
      '550e8400-e29b-41d4-a716-446655440003'::uuid
    ]) as stylist_id,
    generate_series(
      date_trunc('hour', NOW()) + INTERVAL '1 hour',
      date_trunc('hour', NOW()) + INTERVAL '7 days',
      INTERVAL '2 hours'
    ) as start_time
) t
WHERE EXTRACT(hour FROM start_time) BETWEEN 9 AND 17; -- Business hours 9 AM - 5 PM

-- Row Level Security (RLS) policies
-- =================================

-- Enable RLS
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Allow public read access to stylists and services
CREATE POLICY "Allow public read access to stylists" ON stylists FOR SELECT USING (true);
CREATE POLICY "Allow public read access to services" ON services FOR SELECT USING (true);
CREATE POLICY "Allow public read access to slots" ON slots FOR SELECT USING (true);

-- Allow public insert for bookings (in a real app, you'd want authentication)
CREATE POLICY "Allow public insert for bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access to bookings" ON bookings FOR SELECT USING (true);

-- Allow public insert for favorites
CREATE POLICY "Allow public insert for favorites" ON favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete for favorites" ON favorites FOR DELETE USING (true);