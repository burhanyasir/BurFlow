-- 008_seed_dental_knowledge.sql
-- Seed Bright Smile Dental with real knowledge base content so the chatbot
-- gives contextually accurate responses instead of generic filler.

DO $$
DECLARE
  v_tenant_id TEXT := '84c62447-5e8a-4647-b1f1-d47a3501677f';
  v_kb_id TEXT := 'dental-kb-001';
  v_doc_id_1 TEXT := 'dental-services-doc';
  v_doc_id_2 TEXT := 'dental-faq-doc';
  v_doc_id_3 TEXT := 'dental-about-doc';
BEGIN
  -- Skip if tenant does not exist
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RAISE NOTICE 'Tenant % not found — skipping dental knowledge seed', v_tenant_id;
    RETURN;
  END IF;

  -- Create knowledge base
  INSERT INTO knowledge_bases (id, tenant_id, name, description, status, document_count, total_chunks, created_at, updated_at)
  VALUES (v_kb_id, v_tenant_id, 'Bright Smile Dental Knowledge Base', 'Complete business knowledge for Bright Smile Dental clinic', 'published', 3, 12, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET status = 'published', updated_at = NOW();

  -- Document 1: Services & Pricing
  INSERT INTO kb_documents (id, knowledge_base_id, tenant_id, filename, source_type, status, chunk_count, created_at, updated_at)
  VALUES (v_doc_id_1, v_kb_id, v_tenant_id, 'Services & Pricing', 'text', 'published', 4, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Document 2: FAQ
  INSERT INTO kb_documents (id, knowledge_base_id, tenant_id, filename, source_type, status, chunk_count, created_at, updated_at)
  VALUES (v_doc_id_2, v_kb_id, v_tenant_id, 'Frequently Asked Questions', 'faq', 'published', 4, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Document 3: About & Hours
  INSERT INTO kb_documents (id, knowledge_base_id, tenant_id, filename, source_type, status, chunk_count, created_at, updated_at)
  VALUES (v_doc_id_3, v_kb_id, v_tenant_id, 'About Bright Smile Dental', 'text', 'published', 4, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Chunks for Document 1: Services & Pricing
  INSERT INTO kb_chunks (id, document_id, knowledge_base_id, tenant_id, content, metadata, created_at)
  VALUES
    ('chunk-dental-svc-1', v_doc_id_1, v_kb_id, v_tenant_id,
     'Bright Smile Dental offers comprehensive dental services. General dentistry includes routine checkups ($95), professional cleanings ($120), digital X-rays ($85), and cavity fillings ($150-$250 depending on size and material). We accept most major insurance plans including Delta Dental, Cigna, MetLife, and Aetna.',
     '{"title":"General Dentistry Services & Pricing","category":"services"}', NOW()),

    ('chunk-dental-svc-2', v_doc_id_1, v_kb_id, v_tenant_id,
     'Cosmetic dentistry services at Bright Smile Dental: teeth whitening ($350 for in-office Zoom whitening, $250 for take-home kits), porcelain veneers ($900-$1,500 per tooth), dental bonding ($300-$600 per tooth), and complete smile makeovers with custom treatment plans.',
     '{"title":"Cosmetic Dentistry Pricing","category":"services"}', NOW()),

    ('chunk-dental-svc-3', v_doc_id_1, v_kb_id, v_tenant_id,
     'Restorative dentistry: dental crowns ($800-$1,200), bridges ($1,500-$3,500), dental implants ($2,500-$4,500 per implant including abutment and crown), root canal treatment ($700-$1,100 depending on tooth), and dentures ($800-$2,500 for full dentures). Payment plans and financing available through CareCredit.',
     '{"title":"Restorative Dentistry & Pricing","category":"services"}', NOW()),

    ('chunk-dental-svc-4', v_doc_id_1, v_kb_id, v_tenant_id,
     'Emergency dental care at Bright Smile Dental: same-day emergency appointments available during business hours. Emergency exam ($150), emergency extraction ($200-$400), temporary filling ($150). For after-hours emergencies, call our emergency line at (555) 123-4567. We also offer urgent care for dental abscesses, broken teeth, and severe toothaches.',
     '{"title":"Emergency Dental Care","category":"services"}', NOW()),

    ('chunk-dental-svc-5', v_doc_id_1, v_kb_id, v_tenant_id,
     'Orthodontic treatments: Invisalign clear aligners ($3,500-$6,500 depending on case complexity), traditional metal braces ($4,000-$6,000), and retainers ($250-$500). Free orthodontic consultation included. Financing available with $0 down and monthly payments as low as $99/month through CareCredit.',
     '{"title":"Orthodontics & Invisalign","category":"services"}', NOW()),

    ('chunk-dental-svc-6', v_doc_id_1, v_kb_id, v_tenant_id,
     'Pediatric dentistry: childrens checkups and cleanings ($85), dental sealants ($45 per tooth), fluoride treatments ($30), and space maintainers ($250). We welcome children as young as 1 year old and offer a kid-friendly environment with TV screens and small prizes. First visit is complimentary for children under 3.',
     '{"title":"Pediatric Dentistry","category":"services"}', NOW()),

    ('chunk-dental-svc-7', v_doc_id_1, v_kb_id, v_tenant_id,
     'Periodontal (gum) treatments: scaling and root planing ($200-$400 per quadrant), gum graft surgery ($600-$1,200), and periodontal maintenance ($175 per visit). Gum disease treatment is critical for preventing tooth loss. We use laser-assisted periodontal therapy for faster healing.',
     '{"title":"Periodontal Treatments","category":"services"}', NOW()),

    ('chunk-dental-svc-8', v_doc_id_1, v_kb_id, v_tenant_id,
     'Bright Smile Dental accepts the following insurance: Delta Dental PPO and Premier, Cigna DPPO, MetLife PDP, Aetna PPO, Guardian, Humana, United Healthcare Dental, and most PPO plans. We are out-of-network for HMO plans but offer competitive cash pricing. We handle all insurance claims and pre-authorizations for you. Uninsured patients receive a 15% discount on services over $500 and 10% off services over $200.',
     '{"title":"Insurance & Payment Options","category":"insurance"}', NOW()),

    -- Chunks for Document 2: FAQ
    ('chunk-dental-faq-1', v_doc_id_2, v_kb_id, v_tenant_id,
     'Q: How do I schedule an appointment? A: You can book online at brightsmiledental.com/book, call us at (555) 987-6543, or walk in during business hours. Online booking is the fastest way to secure your preferred time slot. Same-day appointments are available for emergencies.',
     '{"title":"Scheduling Appointments","category":"faq"}', NOW()),

    ('chunk-dental-faq-2', v_doc_id_2, v_kb_id, v_tenant_id,
     'Q: What should I bring to my first visit? A: Please bring a valid photo ID, your dental insurance card (if applicable), any recent dental X-rays from other providers, a list of current medications, and your completed new patient forms (available to download on our website). First-time patients should arrive 15 minutes early for paperwork.',
     '{"title":"First Visit Preparation","category":"faq"}', NOW()),

    ('chunk-dental-faq-3', v_doc_id_2, v_kb_id, v_tenant_id,
     'Q: Do you offer financing or payment plans? A: Yes! We partner with CareCredit and Lending Club to offer flexible financing options. Options include 0% interest for 6-12 months on treatments over $200, extended payment plans up to 60 months, and low monthly payments starting at $25/month. Apply online in minutes or at our office.',
     '{"title":"Financing Options","category":"faq"}', NOW()),

    ('chunk-dental-faq-4', v_doc_id_2, v_kb_id, v_tenant_id,
     'Q: How often should I visit the dentist? A: The American Dental Association recommends visiting the dentist every 6 months for a routine checkup and professional cleaning. However, patients with gum disease or other conditions may need more frequent visits. Dr. Williams will recommend a personalized schedule based on your oral health needs.',
     '{"title":"Visit Frequency","category":"faq"}', NOW()),

    ('chunk-dental-faq-5', v_doc_id_2, v_kb_id, v_tenant_id,
     'Q: Is dental treatment painful? A: We prioritize your comfort. All treatments begin with effective local anesthesia. For anxious patients, we offer nitrous oxide (laughing gas) at no additional charge, oral sedation for extensive procedures, and a calm, spa-like environment with noise-canceling headphones and warm blankets.',
     '{"title":"Pain Management & Comfort","category":"faq"}', NOW()),

    ('chunk-dental-faq-6', v_doc_id_2, v_kb_id, v_tenant_id,
     'Q: What if I have a dental emergency after hours? A: Call our emergency line at (555) 123-4567. Dr. Williams is available 24/7 for true dental emergencies including knocked-out teeth, severe pain, uncontrolled bleeding, or broken restorations. For non-urgent issues, please call during business hours.',
     '{"title":"After-Hours Emergencies","category":"faq"}', NOW()),

    -- Chunks for Document 3: About
    ('chunk-dental-about-1', v_doc_id_3, v_kb_id, v_tenant_id,
     'Bright Smile Dental is a family-owned dental practice located at 123 Main Street, Suite 200, Springfield, IL 62701. Founded in 2015 by Dr. Sarah Williams, DDS, we have served over 3,000 families in the Springfield community. Our state-of-the-art facility features the latest in dental technology including 3D cone beam imaging, intraoral cameras, and laser dentistry.',
     '{"title":"About Bright Smile Dental","category":"about"}', NOW()),

    ('chunk-dental-about-2', v_doc_id_3, v_kb_id, v_tenant_id,
     'Office hours at Bright Smile Dental: Monday through Thursday 8:00 AM to 5:00 PM, Friday 8:00 AM to 2:00 PM, Saturday 9:00 AM to 1:00 PM (by appointment), closed Sundays. We are closed on major holidays. For emergencies outside business hours, call (555) 123-4567.',
     '{"title":"Office Hours","category":"hours"}', NOW()),

    ('chunk-dental-about-3', v_doc_id_3, v_kb_id, v_tenant_id,
     'Dr. Sarah Williams, DDS, is a graduate of the University of Illinois College of Dentistry with over 10 years of experience. She specializes in cosmetic dentistry and dental implants. Our team includes Dr. Michael Chen, DMD (general and pediatric dentistry), Dr. Lisa Park, DDS (periodontics), and a team of 8 hygienists and dental assistants. Dr. Williams is a member of the American Dental Association and Illinois State Dental Society.',
     '{"title":"Our Dental Team","category":"team"}', NOW()),

    ('chunk-dental-about-4', v_doc_id_3, v_kb_id, v_tenant_id,
     'Bright Smile Dental has been recognized as one of the top dental practices in Springfield. Awards include: Best of Springfield Dentist 2022, 2023, and 2024 (Springfield Business Journal), Patients Choice Award 2023 (Healthgrades), and Top 1% Provider for Invisalign in Illinois. We are committed to continuing education with over 200 hours of advanced training annually.',
     '{"title":"Awards & Recognition","category":"about"}', NOW()),

    ('chunk-dental-about-5', v_doc_id_3, v_kb_id, v_tenant_id,
     'New patients receive a complimentary consultation including comprehensive exam, full-mouth digital X-rays (valued at $285), and treatment plan discussion with Dr. Williams. We also offer a new patient special: professional cleaning for $75 (regularly $120) for first-time visitors. Book online at brightsmiledental.com/new-patient or call (555) 987-6543.',
     '{"title":"New Patient Specials","category":"promotions"}', NOW()),

    ('chunk-dental-about-6', v_doc_id_3, v_kb_id, v_tenant_id,
     'Contact Bright Smile Dental: Phone (555) 987-6543, Email info@brightsmiledental.com, Website brightsmiledental.com. Address: 123 Main Street, Suite 200, Springfield, IL 62701. Free parking available in our lot. We are located near the corner of Main and Elm, across from Springfield Community Park.',
     '{"title":"Contact Information","category":"contact"}', NOW());

  -- Update document chunk counts
  UPDATE kb_documents SET chunk_count = 8 WHERE id = v_doc_id_1;
  UPDATE kb_documents SET chunk_count = 6 WHERE id = v_doc_id_2;
  UPDATE kb_documents SET chunk_count = 6 WHERE id = v_doc_id_3;

  RAISE NOTICE 'Seeded dental knowledge: 3 documents, 20 chunks for tenant %', v_tenant_id;
END $$;
