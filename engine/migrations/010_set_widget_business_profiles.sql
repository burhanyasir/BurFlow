-- 010_set_widget_business_profiles.sql
-- Set business profiles for demo tenants to drive conversion CTAs.
-- primary_goal and cta override the default SaaS CTAs.

DO $$
BEGIN
  -- BurFlow SaaS: book a demo / start free trial
  UPDATE widget_configs SET
    business_profile = '{
      "primary_goal": "start_free_trial",
      "brandTone": "friendly, professional, helpful",
      "cta": {
        "type": "start_free_trial",
        "label": "Start Free Trial",
        "link": "https://bur-flow.vercel.app/signup"
      },
      "top_offers": [
        "14-day free trial — no credit card required",
        "Annual plans save 20%",
        "Setup in under 5 minutes"
      ]
    }',
    greeting = 'Hi! I''m BurFlow AI. I can help you find the right plan, answer questions about features, or start your free trial. What would you like to know?',
    updated_at = NOW()
  WHERE tenant_id = 'burflow-saas';

  -- Bright Smile Dental: book an appointment
  UPDATE widget_configs SET
    business_profile = '{
      "primary_goal": "appointment_booking",
      "brandTone": "warm, caring, professional",
      "cta": {
        "type": "book_demo",
        "label": "Book an Appointment",
        "link": "https://brightsmiledental.com/book"
      },
      "top_offers": [
        "New patients: professional cleaning for $75 (regularly $120)",
        "Complimentary consultation including X-rays for new patients",
        "Same-day emergency appointments available"
      ]
    }',
    greeting = 'Hi! Welcome to Bright Smile Dental. I can help with appointment booking, insurance questions, service info, or emergencies. How can I help you today?',
    updated_at = NOW()
  WHERE tenant_id = '84c62447-5e8a-4647-b1f1-d47a3501677f';
END $$;
