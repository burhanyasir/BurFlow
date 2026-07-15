const demoData = {
  clinic: {
    name: "BrightSmile Dental Care",
    address: "123 Wellness Ave, Suite 200",
    phone: "(555) 234-5678",
    email: "hello@brightsmile.demo",
    hours: "Monday through Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 2:00 PM",
    rating: "4.8",
    paymentProvider: "CareCredit",
    assistantName: "BrightSmile AI",
    pediatricServiceLabel: "pediatric dentistry",
    customerLabel: "Patient",
    clientNoun: "patients",
    staff: [
      { name: "Dr. Patel", experience: "15+ years experience" },
      { name: "Dr. Lee", specialty: "pediatric specialist" },
      { name: "Dr. Garcia", specialty: "cosmetic dentistry" }
    ],
    patientTypes: ["new patient", "existing patient"],
    patientTypeQuestion: "Are you a new patient or an existing patient?",
    serviceAliases: {
      "child|kid|children|pediatric": "Pediatric Dentistry",
      "existing|returning": "Follow-up Visit",
      "new|first[. -]?time": "New Patient Exam"
    }
  },
  services: [
    { name: "General Checkup & Cleaning", price: "$150", duration: "45 min" },
    { name: "Teeth Whitening", price: "$350", duration: "60 min" },
    { name: "Dental Fillings", price: "$200-$400", duration: "45 min" },
    { name: "Root Canal Treatment", price: "$800-$1,200", duration: "90 min" },
    { name: "Dental Crowns", price: "$1,000-$1,500", duration: "60 min" },
    { name: "Tooth Extraction", price: "$150-$300", duration: "30 min" },
    { name: "Invisalign Braces", price: "$3,000-$5,000", duration: "varies" },
    { name: "Dental Implants", price: "$3,000-$4,500", duration: "varies" },
    { name: "Pediatric Dentistry", price: "$100-$200", duration: "30 min" },
    { name: "Emergency Dental Care", price: "$200-$500", duration: "varies" }
  ],
  conversations: [
    {
      id: "conv-001",
      visitorName: "Sarah Mitchell",
      visitorEmail: "sarah.m@example.com",
      visitorPhone: "(555) 111-2233",
      type: "new-patient",
      timestamp: "2026-07-14T09:23:00Z",
      summary: "New patient inquiry about teeth whitening",
      leadCaptured: true,
      appointmentBooked: true,
      appointmentTime: "2026-07-16T10:00:00Z",
      messages: [
        { role: "visitor", text: "Hi, I'm interested in getting my teeth whitened. Can you tell me more?" },
        { role: "ai", text: "Of course! We offer professional Zoom teeth whitening for $350. It takes about 60 minutes and results last 6-12 months. Many patients see 4-8 shades of improvement. Would you like to book a consultation?" },
        { role: "visitor", text: "That sounds great! Yes, I'd like to book. What days do you have available?" },
        { role: "ai", text: "We have openings this Thursday at 10 AM or Friday at 2 PM. Which works better for you?" },
        { role: "visitor", text: "Thursday at 10 AM works perfect. Also, do you accept Delta Dental insurance?" },
        { role: "ai", text: "Yes, we accept Delta Dental! Our team will verify your coverage before the appointment. I've booked your Zoom whitening consultation for Thursday, July 16th at 10:00 AM. You'll receive a confirmation email shortly. Anything else I can help with?" },
        { role: "visitor", text: "Perfect, thank you so much!" },
        { role: "ai", text: "You're welcome, Sarah! We look forward to seeing you Thursday. Feel free to call us at (555) 234-5678 if you have any questions before then." }
      ]
    },
    {
      id: "conv-002",
      visitorName: "James Rodriguez",
      visitorEmail: "james.r@example.com",
      visitorPhone: "(555) 222-3344",
      type: "appointment-booking",
      timestamp: "2026-07-14T10:45:00Z",
      summary: "Returning patient booking 6-month checkup",
      leadCaptured: true,
      appointmentBooked: true,
      appointmentTime: "2026-07-18T09:30:00Z",
      messages: [
        { role: "visitor", text: "I need to schedule my 6-month checkup and cleaning." },
        { role: "ai", text: "I'd be happy to help! Are you an existing patient at BrightSmile Dental Care?" },
        { role: "visitor", text: "Yes, I've been coming here for about 2 years." },
        { role: "ai", text: "Great, welcome back! We have availability next Monday at 9:30 AM or Wednesday at 11:00 AM. Which works for you?" },
        { role: "visitor", text: "Monday at 9:30 works great." },
        { role: "ai", text: "Perfect! You're booked for Monday, July 18th at 9:30 AM for your checkup and cleaning. Your regular hygienist Maria will be available. Can I help with anything else?" },
        { role: "visitor", text: "No, that's all. Thanks!" },
        { role: "ai", text: "See you Monday, James! Don't forget to brush and floss before your visit. :)" }
      ]
    },
    {
      id: "conv-003",
      visitorName: "Emily Chen",
      visitorEmail: "emily.c@example.com",
      visitorPhone: "(555) 333-4455",
      type: "faq",
      timestamp: "2026-07-13T14:30:00Z",
      summary: "FAQ about Invisalign cost and duration",
      leadCaptured: true,
      appointmentBooked: false,
      messages: [
        { role: "visitor", text: "I'm considering Invisalign. How much does it cost and how long does it take?" },
        { role: "ai", text: "Great question! Invisalign treatment at BrightSmile ranges from $3,000-$5,000 depending on your case complexity. Most patients complete treatment in 6-18 months. We offer flexible payment plans starting at $150/month. Would you like to book a free consultation to see if you're a candidate?" },
        { role: "visitor", text: "That's helpful. Does insurance cover any of it?" },
        { role: "ai", text: "Many dental insurance plans cover 20-50% of orthodontic treatment. We can verify your benefits and provide a detailed estimate. We also accept HSA/FSA payments. Would you like me to check your insurance coverage?" },
        { role: "visitor", text: "Yes, please! My insurance is Cigna PPO." },
        { role: "ai", text: "We accept Cigna PPO! Could you share your member ID so I can look up your specific coverage, or would you prefer to book a consultation where we can discuss everything in person?" },
        { role: "visitor", text: "Let me book a consultation first. What times are available?" },
        { role: "ai", text: "We have consultations available this Saturday at 11 AM or next Tuesday at 3 PM. Which works better?" },
        { role: "visitor", text: "Saturday at 11 AM please." },
        { role: "ai", text: "You're booked for Saturday, July 16th at 11:00 AM for your Invisalign consultation! You'll meet with Dr. Patel who will evaluate your smile and create a custom treatment plan. See you then!" }
      ]
    },
    {
      id: "conv-004",
      visitorName: "Michael Brown",
      visitorEmail: "michael.b@example.com",
      visitorPhone: "(555) 444-5566",
      type: "emergency",
      timestamp: "2026-07-13T08:15:00Z",
      summary: "Emergency: tooth pain inquiry",
      leadCaptured: true,
      appointmentBooked: true,
      appointmentTime: "2026-07-13T09:00:00Z",
      messages: [
        { role: "visitor", text: "I have a really bad toothache. Can I come in today?" },
        { role: "ai", text: "I'm sorry you're in pain! We reserve emergency slots every day for exactly this situation. We can see you today at 9:00 AM or 11:30 AM. Which works best?" },
        { role: "visitor", text: "9 AM please! What do I need to bring?" },
        { role: "ai", text: "Just bring your ID and insurance card if you have one. Our emergency exam is $200, which covers X-rays and an evaluation. Would you like me to book the 9 AM slot?" },
        { role: "visitor", text: "Yes, please book it." },
        { role: "ai", text: "You're booked for today at 9:00 AM! Please arrive a few minutes early to fill out paperwork. I hope you feel better soon, Michael. See you shortly!" }
      ]
    },
    {
      id: "conv-005",
      visitorName: "Anonymous Visitor",
      visitorEmail: "",
      visitorPhone: "",
      type: "faq",
      timestamp: "2026-07-12T16:00:00Z",
      summary: "Asked about pediatric dentistry for child",
      leadCaptured: false,
      appointmentBooked: false,
      messages: [
        { role: "visitor", text: "Do you see children? My daughter is 4 years old." },
        { role: "ai", text: "Yes, we love seeing our younger patients! Dr. Lee specializes in pediatric dentistry and has a wonderful way with children. We recommend bringing children in by age 1 or within 6 months of their first tooth. Our pediatric cleanings start at $100. Would you like to schedule an appointment?" },
        { role: "visitor", text: "What should I expect for her first visit?" },
        { role: "ai", text: "Great question! The first visit is all about making your daughter comfortable. We'll do a gentle exam, count her teeth, and maybe a quick cleaning if she's comfortable. We'll also give you tips on brushing and diet. The whole visit is about 30 minutes. Would you like to schedule a time?" },
        { role: "visitor", text: "Let me check with my husband first. I'll call back. Thanks!" },
        { role: "ai", text: "Of course! Feel free to call us at (555) 234-5678 or come back to chat anytime. We're here Mon-Fri 8-6 and Sat 9-2. Have a great day!" }
      ]
    },
    {
      id: "conv-006",
      visitorName: "Lisa Thompson",
      visitorEmail: "lisa.t@example.com",
      visitorPhone: "(555) 555-6677",
      type: "new-patient",
      timestamp: "2026-07-12T11:20:00Z",
      summary: "New patient looking for general dentist",
      leadCaptured: true,
      appointmentBooked: true,
      appointmentTime: "2026-07-15T14:00:00Z",
      messages: [
        { role: "visitor", text: "Hi! I just moved to the area and need to find a new dentist." },
        { role: "ai", text: "Welcome to the neighborhood! We'd love to have you at BrightSmile Dental Care. We're located at 123 Wellness Ave, Suite 200, right near the new shopping center. Would you like to come in for a new patient exam and cleaning?" },
        { role: "visitor", text: "That sounds perfect. What's included in the new patient exam?" },
        { role: "ai", text: "Our new patient package includes a comprehensive exam, digital X-rays, oral cancer screening, professional cleaning, and a personalized treatment plan. It's $150 and includes everything. We also offer a $50 discount for new patients!" },
        { role: "visitor", text: "Great! Can I book for next Wednesday?" },
        { role: "ai", text: "We have openings next Wednesday at 2 PM or 4 PM. Which works better for you?" },
        { role: "visitor", text: "2 PM is perfect!" },
        { role: "ai", text: "Wonderful! I've booked you for Wednesday, July 15th at 2:00 PM for a new patient exam and cleaning. You'll receive a confirmation email. We can't wait to meet you, Lisa!" }
      ]
    },
    {
      id: "conv-007",
      visitorName: "David Kim",
      visitorEmail: "david.k@example.com",
      visitorPhone: "(555) 666-7788",
      type: "insurance",
      timestamp: "2026-07-11T15:40:00Z",
      summary: "Insurance verification request",
      leadCaptured: true,
      appointmentBooked: false,
      messages: [
        { role: "visitor", text: "Do you accept MetLife dental insurance?" },
        { role: "ai", text: "Yes, we accept MetLife! We're in-network with most MetLife PPO plans. Would you like me to look up your specific coverage? I'll just need your member ID and date of birth." },
        { role: "visitor", text: "Great! My member ID is ML789012." },
        { role: "ai", text: "Thank you! Could you also share your full name and date of birth so I can run the verification?" },
        { role: "visitor", text: "David Kim, DOB 04/15/1985" },
        { role: "ai", text: "Perfect, David! I'll have our insurance team verify your MetLife coverage. Would you like to also book an appointment, or shall I just follow up with the insurance details?" },
        { role: "visitor", text: "Just the insurance details for now, thanks." },
        { role: "ai", text: "You got it! Our team will email you the coverage details within 1-2 hours. If you'd like to book an appointment later, just reach out. Have a great day, David!" }
      ]
    },
    {
      id: "conv-008",
      visitorName: "Anonymous Visitor",
      visitorEmail: "",
      visitorPhone: "",
      type: "faq",
      timestamp: "2026-07-11T09:10:00Z",
      summary: "Asked about payment plans for implants",
      leadCaptured: false,
      appointmentBooked: false,
      messages: [
        { role: "visitor", text: "How much do dental implants cost?" },
        { role: "ai", text: "Dental implants at BrightSmile range from $3,000-$4,500 per tooth, depending on the complexity. This includes the implant, abutment, and crown. We offer payment plans through CareCredit with 0% financing for 6-12 months." },
        { role: "visitor", text: "That's helpful, thanks for the information." },
        { role: "ai", text: "You're welcome! Would you like to book a free consultation to see if implants are right for you? Dr. Patel can create a customized treatment plan." },
        { role: "visitor", text: "Not right now, but I'll keep you in mind." },
        { role: "ai", text: "No problem at all! Feel free to reach out anytime. We're here Monday-Saturday. Have a wonderful day!" }
      ]
    },
    {
      id: "conv-009",
      visitorName: "Rachel Green",
      visitorEmail: "rachel.g@example.com",
      visitorPhone: "(555) 777-8899",
      type: "appointment-booking",
      timestamp: "2026-07-10T13:00:00Z",
      summary: "Rescheduling existing appointment",
      leadCaptured: true,
      appointmentBooked: true,
      appointmentTime: "2026-07-19T11:00:00Z",
      messages: [
        { role: "visitor", text: "I need to reschedule my appointment for next Tuesday. Something came up at work." },
        { role: "ai", text: "No problem at all! I can help with that. Let me pull up your account. Could you please provide your full name?" },
        { role: "visitor", text: "Rachel Green" },
        { role: "ai", text: "Thanks Rachel! I see you're currently booked for Tuesday, July 12th at 10 AM for a filling. Would you like to reschedule to later in the week?" },
        { role: "visitor", text: "Yes, do you have anything on Thursday?" },
        { role: "ai", text: "We have Thursday at 11 AM or 3 PM available. Which works better?" },
        { role: "visitor", text: "11 AM please!" },
        { role: "ai", text: "Done! I've moved your appointment to Thursday, July 14th at 11:00 AM. You'll receive an updated confirmation. See you then, Rachel!" }
      ]
    },
    {
      id: "conv-010",
      visitorName: "Tom Harrison",
      visitorEmail: "tom.h@example.com",
      visitorPhone: "(555) 888-9900",
      type: "new-patient",
      timestamp: "2026-07-10T10:30:00Z",
      summary: "New patient inquiry about cosmetic dentistry",
      leadCaptured: true,
      appointmentBooked: true,
      appointmentTime: "2026-07-17T15:30:00Z",
      messages: [
        { role: "visitor", text: "I'm interested in cosmetic dentistry. What options do you offer?" },
        { role: "ai", text: "Great question! We offer several cosmetic options including teeth whitening ($350), veneers ($1,200-$2,000 per tooth), Invisalign ($3,000-$5,000), and composite bonding ($300-$600 per tooth). Would you like to book a cosmetic consultation?" },
        { role: "visitor", text: "I think I want veneers. Can you tell me more about the process?" },
        { role: "ai", text: "Absolutely! The veneer process typically takes 2-3 visits. First, we'll do a consultation where Dr. Patel designs your smile. Then we prepare the teeth and place temporary veneers. Finally, we bond the permanent veneers. The whole process takes about 2-3 weeks and results are stunning!" },
        { role: "visitor", text: "That sounds like what I need. Can I book a consultation?" },
        { role: "ai", text: "Of course! We have availability next Friday at 3:30 PM or Saturday at 10 AM. Which works for you?" },
        { role: "visitor", text: "Friday at 3:30 works great." },
        { role: "ai", text: "You're booked for Friday, July 17th at 3:30 PM for a cosmetic consultation with Dr. Patel. We'll discuss your goals, show you before/after photos, and design your perfect smile. See you Friday, Tom!" }
      ]
    }
  ],
  analytics: {
    totalConversations: 10,
    leadsCaptured: 8,
    appointmentsBooked: 7,
    estimatedMonthlyRevenue: 8400,
    conversionRate: 0.8,
    dailyStats: [
      { date: "2026-07-10", conversations: 3, leads: 3, appointments: 2 },
      { date: "2026-07-11", conversations: 2, leads: 1, appointments: 1 },
      { date: "2026-07-12", conversations: 2, leads: 2, appointments: 2 },
      { date: "2026-07-13", conversations: 2, leads: 1, appointments: 0 },
      { date: "2026-07-14", conversations: 1, leads: 1, appointments: 1 }
    ],
    conversationTypes: {
      "new-patient": 3,
      "appointment-booking": 2,
      "faq": 3,
      "emergency": 1,
      "insurance": 1
    },
    estimatedValuePerAppointment: 350,
    topServices: [
      { name: "Teeth Whitening", bookings: 2, revenue: 700 },
      { name: "General Checkup", bookings: 2, revenue: 300 },
      { name: "Invisalign Consult", bookings: 1, revenue: 150 },
      { name: "Emergency Exam", bookings: 1, revenue: 200 },
      { name: "Cosmetic Consult", bookings: 1, revenue: 150 }
    ],
    missedOpportunities: 2,
    estimatedMonthlyValue: 12000
  },
  faqs: [
    { question: "What insurance plans do you accept?", answer: "We accept most major insurance plans including Delta Dental, MetLife, Cigna, Aetna, Blue Cross Blue Shield, and United Healthcare. Call us to verify your specific plan." },
    { question: "What are your office hours?", answer: "We're open Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM. We're closed on Sundays." },
    { question: "Do you offer payment plans?", answer: "Yes! We offer flexible payment plans through CareCredit with 0% financing options for 6-12 months. We also accept cash, credit cards, and HSA/FSA cards." },
    { question: "How often should I get a dental checkup?", answer: "We recommend visiting every 6 months for a routine checkup and cleaning. This helps prevent problems and catches issues early when they're easier to treat." },
    { question: "What should I do in a dental emergency?", answer: "Call us immediately at (555) 234-5678. We reserve same-day emergency slots. For severe pain, bleeding, or knocked-out teeth, come in right away or go to the nearest ER." },
    { question: "Do you see children?", answer: "Absolutely! Dr. Lee specializes in pediatric dentistry and we welcome children of all ages. We recommend bringing children by age 1 or within 6 months of their first tooth." },
    { question: "How long does teeth whitening last?", answer: "Professional Zoom whitening results typically last 6-12 months with proper care. Avoiding coffee, tea, and red wine can extend your results." },
    { question: "Is Invisalign painful?", answer: "Most patients experience mild discomfort for 2-3 days after each tray change, but it's much less painful than traditional braces. Over-the-counter pain relief usually helps." }
  ],
  demoMode: {
    isActive: true,
    startedAt: "2026-07-14T00:00:00Z",
    visits: 0
  }
};

module.exports = demoData;
