-- Add missing STAAK standard profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS short_name TEXT;

-- Update the handle_new_user function to populate new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  raw_full_name TEXT;
  parsed_first_name TEXT;
  parsed_last_name TEXT;
  parsed_short_name TEXT;
BEGIN
  -- Get full_name from metadata
  raw_full_name := NEW.raw_user_meta_data->>'full_name';
  
  -- Parse first and last name from full_name
  IF raw_full_name IS NOT NULL AND raw_full_name != '' THEN
    parsed_first_name := split_part(raw_full_name, ' ', 1);
    parsed_last_name := CASE 
      WHEN position(' ' in raw_full_name) > 0 THEN 
        substring(raw_full_name from position(' ' in raw_full_name) + 1)
      ELSE NULL
    END;
    -- Generate short_name from initials
    parsed_short_name := UPPER(
      COALESCE(LEFT(parsed_first_name, 1), '') || 
      COALESCE(LEFT(parsed_last_name, 1), '')
    );
  ELSE
    parsed_first_name := NULL;
    parsed_last_name := NULL;
    parsed_short_name := UPPER(LEFT(NEW.email, 1));
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, first_name, last_name, short_name)
  VALUES (
    NEW.id,
    NEW.email,
    raw_full_name,
    parsed_first_name,
    parsed_last_name,
    parsed_short_name
  );
  
  RETURN NEW;
END;
$$;