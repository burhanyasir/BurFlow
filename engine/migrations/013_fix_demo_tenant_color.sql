-- Fix the burflow-saas demo tenant's widget color from blue (#3B82F6) to emerald green (#006248).
-- The old default was a generic blue; the brand color is emerald green.
UPDATE widget_configs
SET primary_color = '#006248'
WHERE tenant_id = 'burflow-saas'
  AND primary_color = '#3B82F6';
