-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('admin', 'support', 'scanner', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EKV Records
CREATE TABLE IF NOT EXISTS public.ekv_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Letter Records
CREATE TABLE IF NOT EXISTS public.letter_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  recipient TEXT,
  payload JSONB,
  error_message TEXT,
  pdf_url TEXT,
  category TEXT,
  type TEXT,
  scan_status TEXT,
  process_status TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  uploaded_at TIMESTAMPTZ,
  date_of_letter DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('ekv', 'letter')),
  action TEXT NOT NULL,
  record_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  page_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(role, page_key)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ekv_records_updated_at BEFORE UPDATE ON public.ekv_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER letter_records_updated_at BEFORE UPDATE ON public.letter_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role) VALUES (NEW.id, NEW.email, 'support');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes
CREATE INDEX IF NOT EXISTS ekv_records_status_idx ON public.ekv_records (status);
CREATE INDEX IF NOT EXISTS ekv_records_created_at_idx ON public.ekv_records (created_at DESC);
CREATE INDEX IF NOT EXISTS letter_records_status_idx ON public.letter_records (status);
CREATE INDEX IF NOT EXISTS letter_records_created_at_idx ON public.letter_records (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_timestamp_idx ON public.activity_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS activity_logs_module_idx ON public.activity_logs (module);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ekv_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Authenticated read ekv" ON public.ekv_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write ekv" ON public.ekv_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read letters" ON public.letter_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write letters" ON public.letter_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write logs" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Default role permissions
INSERT INTO public.role_permissions (role, page_key, allowed) VALUES
  ('support', 'overview', true),
  ('support', 'ekv', true),
  ('support', 'letter_all', true),
  ('support', 'logs', true),
  ('support', 'letter_upload', false),
  ('scanner', 'overview', true),
  ('scanner', 'letter_upload', true),
  ('scanner', 'ekv', false),
  ('scanner', 'letter_all', false),
  ('scanner', 'logs', false);

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('letters', 'letters', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated users can upload letters" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'letters');
CREATE POLICY "Anyone can view letters" ON storage.objects FOR SELECT USING (bucket_id = 'letters');
CREATE POLICY "Authenticated users can delete letters" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'letters');