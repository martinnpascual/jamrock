-- Habilitar extensión unaccent
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- Función de búsqueda de socios accent-insensitive
CREATE OR REPLACE FUNCTION search_members(query TEXT)
RETURNS SETOF members
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM members
  WHERE is_deleted = false
    AND (
      unaccent(first_name) ILIKE '%' || unaccent(query) || '%'
      OR unaccent(last_name) ILIKE '%' || unaccent(query) || '%'
      OR dni = query
      OR member_number ILIKE '%' || query || '%'
      OR qr_code = query
    )
  ORDER BY first_name
  LIMIT 10;
$$;
