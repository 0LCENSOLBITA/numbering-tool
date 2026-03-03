-- Add index on projects.client_id for scalable project number generation
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects (client_id);

-- Add unique constraint on project_number to enforce uniqueness at DB level
ALTER TABLE public.projects ADD CONSTRAINT projects_project_number_unique UNIQUE (project_number);