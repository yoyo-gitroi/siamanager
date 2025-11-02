-- Add admin role for Yash Vats
INSERT INTO user_roles (user_id, role) 
VALUES (
  (SELECT id FROM auth.users WHERE email = 'yash.vats@agentic.it'),
  'admin'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop the existing email-based policy
DROP POLICY IF EXISTS "Yash Vats can view all logs" ON shorts_generation_logs;

-- Create new admin-based policy using the existing has_role function
CREATE POLICY "Admins can view all logs"
ON shorts_generation_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Also allow admins to manage logs
CREATE POLICY "Admins can update logs"
ON shorts_generation_logs 
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete logs"
ON shorts_generation_logs 
FOR DELETE
USING (has_role(auth.uid(), 'admin'));