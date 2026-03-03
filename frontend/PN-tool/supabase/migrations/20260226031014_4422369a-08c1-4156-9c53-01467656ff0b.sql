
-- Update the function to validate uniqueness before cascading
CREATE OR REPLACE FUNCTION public.update_project_numbers_on_prefix_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _conflict_count INT;
BEGIN
  IF OLD.prefix != NEW.prefix THEN
    -- Check for uniqueness conflicts before updating
    SELECT COUNT(*) INTO _conflict_count
    FROM public.projects p1
    WHERE p1.client_id = NEW.id
      AND EXISTS (
        SELECT 1 FROM public.projects p2
        WHERE p2.id != p1.id
          AND p2.project_number = NEW.prefix || SUBSTRING(p1.project_number FROM LENGTH(OLD.prefix) + 1)
      );

    IF _conflict_count > 0 THEN
      RAISE EXCEPTION 'Prefix change would create duplicate project numbers';
    END IF;

    UPDATE public.projects
    SET project_number = NEW.prefix || SUBSTRING(project_number FROM LENGTH(OLD.prefix) + 1),
        updated_at = now()
    WHERE client_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create the trigger (drop first if somehow exists)
DROP TRIGGER IF EXISTS trigger_update_project_numbers_on_prefix_change ON public.clients;

CREATE TRIGGER trigger_update_project_numbers_on_prefix_change
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_numbers_on_prefix_change();
