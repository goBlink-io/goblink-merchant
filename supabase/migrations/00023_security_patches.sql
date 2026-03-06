-- Security patches: C1, C2, C3, C5, C10

-- C1: Enable RLS on admins table (prevents any user from inserting themselves as admin)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- C2: Enable RLS on email_templates table (prevents anyone from rewriting phishing templates)
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- C3: Enable RLS on rate_limits table (prevents anyone from deleting rate limits)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- C3 cont: Revoke direct execution of check_rate_limit from authenticated/anon roles
REVOKE EXECUTE ON FUNCTION check_rate_limit FROM authenticated, anon;

-- C5: Fix merchants UPDATE policy to add WITH CHECK preventing user_id mutation
DROP POLICY IF EXISTS merchants_update_own ON merchants;
CREATE POLICY merchants_update_own ON merchants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- C10: Lock search_path on SECURITY DEFINER function to prevent search_path hijacking
ALTER FUNCTION handle_new_user() SET search_path = public;
