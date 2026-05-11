-- Fix: search_members ahora soporta búsqueda por nombre completo (ej. "martin pascual")
-- Antes solo buscaba en first_name OR last_name individualmente.
-- Ahora también verifica que todas las palabras del query aparezcan en el nombre completo.

CREATE OR REPLACE FUNCTION search_members(query TEXT)
RETURNS SETOF members
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM members m
  WHERE m.is_deleted = false
    AND (
      -- Búsqueda por nombre o apellido individual (comportamiento original)
      unaccent(m.first_name) ILIKE '%' || unaccent(query) || '%'
      OR unaccent(m.last_name) ILIKE '%' || unaccent(query) || '%'
      -- Búsqueda por DNI, número de socio o QR exacto
      OR m.dni = query
      OR m.member_number ILIKE '%' || query || '%'
      OR m.qr_code = query
      -- Búsqueda por nombre completo: todas las palabras del query deben aparecer en el nombre
      OR (
        SELECT bool_and(
          unaccent(lower(m.first_name || ' ' || m.last_name)) LIKE '%' || unaccent(lower(w.word)) || '%'
        )
        FROM unnest(string_to_array(trim(query), ' ')) AS w(word)
        WHERE trim(w.word) != ''
      )
    )
  ORDER BY m.last_name, m.first_name
  LIMIT 20;
END;
$$;
