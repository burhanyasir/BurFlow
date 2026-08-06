# Sales Conversion Real-World Evaluation Benchmark

## Summary
- Cases evaluated: 130
- Overall accuracy: 71.8%
- Recommended plan accuracy: 99.2%
- Next best action accuracy: 14.6%
- CTA accuracy: 38.5%
- CRM classification accuracy: 29.2%
- Booking timing accuracy: 93.1%
- Qualification timing accuracy: 100.0%
- Objection handling accuracy: 100.0%
- Trust signal usage accuracy: 100.0%

## Synthetic benchmark comparison
- Synthetic overall accuracy: 66.6%
- Real-world overall accuracy: 71.8%
- Accuracy delta: 5.3%
- Real-world vs synthetic per-industry deltas: SaaS: -4.5%, E-commerce: 0.0%, Healthcare: 0.0%, Education: 16.7%, Hotels: 0.0%, Real Estate: 0.0%, Professional services: 0.0%, Restaurants: 0.0%, Automotive: 0.0%, Manufacturing: 0.0%, Construction: 0.0%, Agencies: 0.0%, Finance: 0.0%, Legal: 0.0%, Local Businesses: 0.0%, Travel: 0.0%, Insurance: 0.0%, Fintech: 0.0%, Telecom: 0.0%, Media: 10.0%, Retail: 0.0%, Food & Beverage: 0.0%, Logistics: 0.0%, Government: 0.0%, Nonprofit: 0.0%, Fitness: 0.0%, Luxury retail: 0.0%, Consumer electronics: 0.0%, Energy: 0.0%, Agriculture: 0.0%, Transportation: 0.0%, Technology: 0.0%

## Per-industry accuracy
| Industry | Accuracy |
| --- | ---: |
| SaaS | 18.2% |
| Education | 16.7% |
| Media | 10.0% |
| E-commerce | 0.0% |
| Healthcare | 0.0% |
| Hotels | 0.0% |
| Real Estate | 0.0% |
| Professional services | 0.0% |
| Restaurants | 0.0% |
| Automotive | 0.0% |
| Manufacturing | 0.0% |
| Construction | 0.0% |
| Agencies | 0.0% |
| Finance | 0.0% |
| Legal | 0.0% |
| Local Businesses | 0.0% |
| Travel | 0.0% |
| Insurance | 0.0% |
| Fintech | 0.0% |
| Telecom | 0.0% |
| Retail | 0.0% |
| Food & Beverage | 0.0% |
| Logistics | 0.0% |
| Government | 0.0% |
| Nonprofit | 0.0% |
| Fitness | 0.0% |
| Luxury retail | 0.0% |
| Consumer electronics | 0.0% |
| Energy | 0.0% |
| Agriculture | 0.0% |
| Transportation | 0.0% |
| Technology | 0.0% |

## Confusion matrices

### Recommended plan
| Expected \ Predicted | Professional | Starter | Enterprise |
| --- | --- | --- | --- |
| Professional | 26 | 0 | 1 |
| Starter | 0 | 53 | 0 |
| Enterprise | 0 | 0 | 50 |

### Next best action
| Expected \ Predicted | review_pricing | ask_qualification | schedule_demo | contact_sales | recommend_trial | continue_education |
| --- | --- | --- | --- | --- | --- | --- |
| review_pricing | 5 | 8 | 0 | 1 | 0 | 0 |
| ask_qualification | 0 | 0 | 0 | 0 | 0 | 0 |
| schedule_demo | 0 | 3 | 9 | 0 | 0 | 0 |
| contact_sales | 0 | 0 | 0 | 0 | 0 | 0 |
| recommend_trial | 0 | 28 | 0 | 0 | 4 | 0 |
| continue_education | 19 | 43 | 0 | 9 | 0 | 1 |

### CTA selection
| Expected \ Predicted | compare-plans | contact-sales | book-demo | request-quote | start-free-trial |
| --- | --- | --- | --- | --- | --- |
| compare-plans | 26 | 1 | 0 | 2 | 0 |
| contact-sales | 51 | 23 | 1 | 8 | 1 |
| book-demo | 8 | 4 | 0 | 0 | 0 |
| request-quote | 1 | 0 | 0 | 0 | 0 |
| start-free-trial | 1 | 2 | 0 | 0 | 1 |

### CRM bucket
| Expected \ Predicted | cold | warm | hot |
| --- | --- | --- | --- |
| cold | 0 | 0 | 0 |
| warm | 49 | 26 | 0 |
| hot | 25 | 18 | 12 |

## Binary metrics
| Aspect | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Booking trigger | 100.0% | 59.1% | 74.3% |
| Qualification timing | 100.0% | 100.0% | 100.0% |
| Objection handling | 100.0% | 100.0% | 100.0% |
| Trust signal usage | 100.0% | 100.0% | 100.0% |

## Failure analysis
- Total failing cases: 126

### https://www.hubspot.com/crm — SaaS / product / consideration
- URL: https://www.hubspot.com/crm
- Failure categories: wrong_cta, wrong_next_best_action
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.hubspot.com/pricing — SaaS / pricing / decision
- URL: https://www.hubspot.com/pricing
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.hubspot.com/contact-sales — SaaS / booking / decision
- URL: https://www.hubspot.com/contact-sales
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: ask_qualification
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: trigger but got trigger
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected schedule_demo but got ask_qualification; CTA mismatch: expected book-demo but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.atlassian.com/software/confluence — SaaS / product / awareness
- URL: https://www.atlassian.com/software/confluence
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.salesforce.com/editions-pricing/ — SaaS / pricing / decision
- URL: https://www.salesforce.com/editions-pricing/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.shopify.com/pricing — E-commerce / pricing / decision
- URL: https://www.shopify.com/pricing
- Failure categories: wrong_cta, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: request-quote, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected request-quote but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.bestbuy.com/ — E-commerce / home / awareness
- URL: https://www.bestbuy.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.nike.com/w/new-releases-3n82y — E-commerce / product / consideration
- URL: https://www.nike.com/w/new-releases-3n82y
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.amazon.com/ — E-commerce / home / awareness
- URL: https://www.amazon.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.walmart.com/cp/customer-service/1235 — E-commerce / support / consideration
- URL: https://www.walmart.com/cp/customer-service/1235
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: start-free-trial, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected start-free-trial but got compare-plans; Booking timing mismatch: expected trigger but got none

### https://www.mayoclinic.org/appointments — Healthcare / booking / decision
- URL: https://www.mayoclinic.org/appointments
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: ask_qualification
- Expected CTA: book-demo, actual: contact-sales
- Expected bucket: hot, actual: cold
- Expected booking: trigger but got trigger
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected schedule_demo but got ask_qualification; CTA mismatch: expected book-demo but got contact-sales; CRM bucket mismatch: expected hot but got cold

### https://www.clevelandclinic.org/appointments — Healthcare / booking / decision
- URL: https://www.clevelandclinic.org/appointments
- Failure categories: wrong_cta, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected book-demo but got contact-sales

### https://www.nhs.uk/conditions/ — Healthcare / product / awareness
- URL: https://www.nhs.uk/conditions/
- Failure categories: wrong_next_best_action, wrong_crm_classification, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold; Booking timing mismatch: expected trigger but got none

### https://www.kaiserpermanente.org/health-wellness — Healthcare / product / consideration
- URL: https://www.kaiserpermanente.org/health-wellness
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.harvard.edu/admissions/ — Education / admissions / decision
- URL: https://www.harvard.edu/admissions/
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got compare-plans

### https://www.stanford.edu/admissions — Education / admissions / decision
- URL: https://www.stanford.edu/admissions
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected hot but got warm

### https://www.upenn.edu/admissions — Education / admissions / consideration
- URL: https://www.upenn.edu/admissions
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.marriott.com/hotels/travel/ — Hotels / booking / decision
- URL: https://www.marriott.com/hotels/travel/
- Failure categories: wrong_cta, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected book-demo but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.hilton.com/en/book/ — Hotels / booking / decision
- URL: https://www.hilton.com/en/book/
- Failure categories: wrong_cta, wrong_crm_classification, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected book-demo but got contact-sales; CRM bucket mismatch: expected hot but got warm

### https://www.airbnb.com/ — Hotels / home / awareness
- URL: https://www.airbnb.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.redfin.com/city/1230/WA/Seattle — Real Estate / product / consideration
- URL: https://www.redfin.com/city/1230/WA/Seattle
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.zillow.com/homes/for_sale/ — Real Estate / product / awareness
- URL: https://www.zillow.com/homes/for_sale/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.realtor.com/realestateandhomes-search — Real Estate / product / consideration
- URL: https://www.realtor.com/realestateandhomes-search
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.accenture.com/us-en/services/consulting/technology — Professional services / product / consideration
- URL: https://www.accenture.com/us-en/services/consulting/technology
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.bcg.com/capabilities — Professional services / product / awareness
- URL: https://www.bcg.com/capabilities
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.deloitte.com/us/en/pages/consulting/solutions.html — Professional services / product / consideration
- URL: https://www.deloitte.com/us/en/pages/consulting/solutions.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.ibm.com/services — Professional services / product / decision
- URL: https://www.ibm.com/services
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected book-demo but got compare-plans

### https://www.mcdonalds.com/us/en-us.html — Restaurants / home / awareness
- URL: https://www.mcdonalds.com/us/en-us.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.starbucks.com/menu — Restaurants / product / awareness
- URL: https://www.starbucks.com/menu
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold; Booking timing mismatch: expected trigger but got none

### https://www.chipotle.com/order — Restaurants / buying / decision
- URL: https://www.chipotle.com/order
- Failure categories: wrong_cta, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected contact-sales but got compare-plans; Booking timing mismatch: expected trigger but got none

### https://www.dominos.com/en/pages/order/ — Restaurants / buying / decision
- URL: https://www.dominos.com/en/pages/order/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: ask_qualification
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: trigger but got trigger
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected schedule_demo but got ask_qualification; CTA mismatch: expected book-demo but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.toyota.com/prius — Automotive / product / consideration
- URL: https://www.toyota.com/prius
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.ford.com/cars/mustang/ — Automotive / product / consideration
- URL: https://www.ford.com/cars/mustang/
- Failure categories: wrong_cta, wrong_next_best_action
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.caterpillar.com/en/products/new.html — Manufacturing / product / consideration
- URL: https://www.caterpillar.com/en/products/new.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.siemens.com/global/en/products/automation.html — Manufacturing / product / awareness
- URL: https://www.siemens.com/global/en/products/automation.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.honeywell.com/us/en/products — Manufacturing / product / consideration
- URL: https://www.honeywell.com/us/en/products
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.turnerconstruction.com/projects — Construction / product / research
- URL: https://www.turnerconstruction.com/projects
- Failure categories: wrong_cta, wrong_next_best_action
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.lennar.com/homes — Construction / product / consideration
- URL: https://www.lennar.com/homes
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.zillow.com/agents/ — Real Estate / contact / decision
- URL: https://www.zillow.com/agents/
- Failure categories: wrong_cta, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.pwc.com/us/en/services.html — Agencies / product / research
- URL: https://www.pwc.com/us/en/services.html
- Failure categories: wrong_cta, wrong_next_best_action
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.nerdwallet.com/best/credit-cards — Finance / comparison / consideration
- URL: https://www.nerdwallet.com/best/credit-cards
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales

### https://www.citi.com/ — Finance / home / awareness
- URL: https://www.citi.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: book-demo
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got book-demo; CRM bucket mismatch: expected warm but got cold

### https://www.littler.com/people — Legal / product / research
- URL: https://www.littler.com/people
- Failure categories: wrong_cta, wrong_next_best_action
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.toyota.com/ — Automotive / home / awareness
- URL: https://www.toyota.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.chase.com/personal/credit-cards — Finance / product / consideration
- URL: https://www.chase.com/personal/credit-cards
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.bosch.com/products-and-services/ — Manufacturing / product / consideration
- URL: https://www.bosch.com/products-and-services/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.homedepot.com/b/Tools/N-5yc1vZc1j0 — Local Businesses / product / research
- URL: https://www.homedepot.com/b/Tools/N-5yc1vZc1j0
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.expedia.com/Flights — Travel / product / consideration
- URL: https://www.expedia.com/Flights
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.united.com/ual/en/us/ — Travel / booking / decision
- URL: https://www.united.com/ual/en/us/
- Failure categories: wrong_cta, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected book-demo but got contact-sales

### https://www.booking.com/ — Travel / home / awareness
- URL: https://www.booking.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.geico.com/insurance/ — Insurance / product / consideration
- URL: https://www.geico.com/insurance/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.aetna.com/individuals-families/health-insurance.html — Healthcare / product / decision
- URL: https://www.aetna.com/individuals-families/health-insurance.html
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected hot but got warm

### https://www.revolut.com/ — Finance / home / awareness
- URL: https://www.revolut.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://stripe.com/pricing — Fintech / pricing / consideration
- URL: https://stripe.com/pricing
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.att.com/ — Telecom / home / awareness
- URL: https://www.att.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.netflix.com/ — Media / home / awareness
- URL: https://www.netflix.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.verizon.com/ — Telecom / product / consideration
- URL: https://www.verizon.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.ocado.com/ — Retail / product / research
- URL: https://www.ocado.com/
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got request-quote

### https://www.wholefoodsmarket.com/ — Retail / product / consideration
- URL: https://www.wholefoodsmarket.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: request-quote
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected compare-plans but got request-quote; CRM bucket mismatch: expected warm but got cold

### https://www.doordash.com/ — Food & Beverage / home / awareness
- URL: https://www.doordash.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.3m.com/3M/en_US/company-us/ — Manufacturing / product / consideration
- URL: https://www.3m.com/3M/en_US/company-us/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.fedex.com/en-us/home.html — Logistics / home / awareness
- URL: https://www.fedex.com/en-us/home.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.irs.gov/ — Government / service / awareness
- URL: https://www.irs.gov/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.dmv.org/ — Government / service / decision
- URL: https://www.dmv.org/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: start-free-trial, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales; CTA mismatch: expected start-free-trial but got contact-sales; CRM bucket mismatch: expected hot but got warm

### https://www.redcross.org/ — Nonprofit / home / awareness
- URL: https://www.redcross.org/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.mckinsey.com/ — Professional services / services / consideration
- URL: https://www.mckinsey.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.coursera.org/ — Education / home / awareness
- URL: https://www.coursera.org/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.peloton.com/ — Fitness / product / decision
- URL: https://www.peloton.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.tiffany.com/ — Luxury retail / product / consideration
- URL: https://www.tiffany.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got request-quote; CRM bucket mismatch: expected warm but got cold

### https://www.apple.com/shop/buy-iphone — Consumer electronics / product / decision
- URL: https://www.apple.com/shop/buy-iphone
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.espn.com/ — Media / home / research
- URL: https://www.espn.com/
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.taskrabbit.com/ — Local Businesses / service / decision
- URL: https://www.taskrabbit.com/
- Failure categories: wrong_cta, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected book-demo but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.tesla.com/ — Automotive / product / decision
- URL: https://www.tesla.com/
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got compare-plans

### https://www.aarp.org/ — Healthcare / home / research
- URL: https://www.aarp.org/
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.airbnb.com/s/experiences — Travel / product / research
- URL: https://www.airbnb.com/s/experiences
- Failure categories: incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: review_pricing
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Booking timing mismatch: expected trigger but got none

### https://www.slack.com/pricing — SaaS / pricing / consideration
- URL: https://www.slack.com/pricing
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.tesla.com/energy — Energy / product / consideration
- URL: https://www.tesla.com/energy
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.johndeere.com/en/ — Agriculture / product / consideration
- URL: https://www.johndeere.com/en/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.homeadvisor.com/ — Construction / service / decision
- URL: https://www.homeadvisor.com/
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected book-demo but got compare-plans

### https://www.mercedes-benz.com/en/ — Automotive / product / consideration
- URL: https://www.mercedes-benz.com/en/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.ikea.com/us/en/ — Retail / product / research
- URL: https://www.ikea.com/us/en/
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got request-quote

### https://www.wellsfargo.com/ — Finance / product / consideration
- URL: https://www.wellsfargo.com/
- Failure categories: wrong_product_recommendation, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.gopro.com/en/us/shop — Consumer electronics / product / consideration
- URL: https://www.gopro.com/en/us/shop
- Failure categories: wrong_cta, wrong_next_best_action
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.cnn.com/ — Media / home / awareness
- URL: https://www.cnn.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.siemens.com/global/en/home.html — Manufacturing / product / research
- URL: https://www.siemens.com/global/en/home.html
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.evernote.com/ — SaaS / pricing / consideration
- URL: https://www.evernote.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.uber.com/us/en/ — Transportation / home / awareness
- URL: https://www.uber.com/us/en/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold; Booking timing mismatch: expected trigger but got none

### https://www.nordstrom.com/ — Retail / product / research
- URL: https://www.nordstrom.com/
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got request-quote

### https://www.intuit.com/ — Fintech / product / consideration
- URL: https://www.intuit.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.uber.com/en-US/ride/ — Transportation / booking / decision
- URL: https://www.uber.com/en-US/ride/
- Failure categories: wrong_cta, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected book-demo but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.procore.com/ — Construction / pricing / consideration
- URL: https://www.procore.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.sherwin-williams.com/homeowners — Manufacturing / product / research
- URL: https://www.sherwin-williams.com/homeowners
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.cnbc.com/ — Media / home / awareness
- URL: https://www.cnbc.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.mckesson.com/ — Healthcare / product / consideration
- URL: https://www.mckesson.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.jpmorgan.com/ — Finance / services / research
- URL: https://www.jpmorgan.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.wikipedia.org/ — Media / home / awareness
- URL: https://www.wikipedia.org/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.ikea.com/us/en/customer-service — Retail / support / decision
- URL: https://www.ikea.com/us/en/customer-service
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: start-free-trial, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales; CTA mismatch: expected start-free-trial but got contact-sales; CRM bucket mismatch: expected hot but got warm; Booking timing mismatch: expected trigger but got none

### https://www.indeed.com/hire — Professional services / product / consideration
- URL: https://www.indeed.com/hire
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.cigna.com/ — Healthcare / product / decision
- URL: https://www.cigna.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected hot but got warm

### https://www.sony.com/electronics — Consumer electronics / product / consideration
- URL: https://www.sony.com/electronics
- Failure categories: wrong_cta, wrong_next_best_action
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.petco.com/ — Retail / product / research
- URL: https://www.petco.com/
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got request-quote

### https://www.sprint.com/ — Telecom / pricing / consideration
- URL: https://www.sprint.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.suncorp.com.au/ — Insurance / product / decision
- URL: https://www.suncorp.com.au/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.walmart.com/browse/electronics — Retail / product / consideration
- URL: https://www.walmart.com/browse/electronics
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: request-quote
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected compare-plans but got request-quote; CRM bucket mismatch: expected warm but got cold

### https://www.ikea.com/us/en/rooms/ — Retail / product / research
- URL: https://www.ikea.com/us/en/rooms/
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got request-quote

### https://www.diageo.com/en/ — Food & Beverage / product / research
- URL: https://www.diageo.com/en/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.pepsico.com/ — Food & Beverage / product / awareness
- URL: https://www.pepsico.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.uber.com/business — Transportation / product / consideration
- URL: https://www.uber.com/business
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CRM bucket mismatch: expected hot but got cold

### https://www.barnesandnoble.com/ — Retail / product / awareness
- URL: https://www.barnesandnoble.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: warm, actual: cold
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got request-quote; CRM bucket mismatch: expected warm but got cold; Booking timing mismatch: expected trigger but got none

### https://www.indeed.com/ — Professional services / product / awareness
- URL: https://www.indeed.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got start-free-trial; CRM bucket mismatch: expected warm but got cold

### https://www.adobe.com/creativecloud/plans.html — SaaS / pricing / decision
- URL: https://www.adobe.com/creativecloud/plans.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.merriam-webster.com/ — Education / home / awareness
- URL: https://www.merriam-webster.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.mcdonalds.com/us/en-us.html — Food & Beverage / home / awareness
- URL: https://www.mcdonalds.com/us/en-us.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold; Booking timing mismatch: expected trigger but got none

### https://www.ke.com/ — Real Estate / product / consideration
- URL: https://www.ke.com/
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.wellsfargo.com/personal-banking/ — Finance / product / decision
- URL: https://www.wellsfargo.com/personal-banking/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got warm

### https://www.reddit.com/ — Media / home / awareness
- URL: https://www.reddit.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.lululemon.com/ — Retail / product / consideration
- URL: https://www.lululemon.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: ask_qualification
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got ask_qualification; CTA mismatch: expected contact-sales but got request-quote; CRM bucket mismatch: expected hot but got cold

### https://www.vmware.com/ — SaaS / services / consideration
- URL: https://www.vmware.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.nest.com/ — Consumer electronics / product / consideration
- URL: https://www.nest.com/
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected warm but got cold

### https://www.cvs.com/ — Healthcare / product / support
- URL: https://www.cvs.com/
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.nature.com/ — Media / product / research
- URL: https://www.nature.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.hulu.com/welcome — Media / home / research
- URL: https://www.hulu.com/welcome
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans

### https://www.dw.com/en/top-stories/s-9097 — Media / home / awareness
- URL: https://www.dw.com/en/top-stories/s-9097
- Failure categories: wrong_next_best_action, wrong_crm_classification, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.pwc.com/us/en/services.html — Professional services / services / consideration
- URL: https://www.pwc.com/us/en/services.html
- Failure categories: wrong_cta, wrong_next_best_action, wrong_crm_classification
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: ask_qualification
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got ask_qualification; CTA mismatch: expected contact-sales but got compare-plans; CRM bucket mismatch: expected hot but got cold

### https://www.kaspersky.com/ — Technology / product / consideration
- URL: https://www.kaspersky.com/
- Failure categories: wrong_next_best_action, wrong_crm_classification
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: ask_qualification
- Expected CTA: compare-plans, actual: compare-plans
- Expected bucket: warm, actual: cold
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got ask_qualification
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected review_pricing but got ask_qualification; CRM bucket mismatch: expected warm but got cold

### https://www.disneyworld.disney.go.com/ — Travel / booking / decision
- URL: https://www.disneyworld.disney.go.com/
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected book-demo but got compare-plans

## Common failure patterns
- Personalization mismatch: high-value case received a generic plan/CTA/action. (66 cases)
- CTA mismatch: expected contact-sales but got compare-plans (51 cases)
- CRM bucket mismatch: expected warm but got cold (49 cases)
- Next step mismatch: expected continue_education but got ask_qualification (43 cases)
- Next step mismatch: expected recommend_trial but got ask_qualification (28 cases)
- CRM bucket mismatch: expected hot but got cold (25 cases)

## Ranked failure modes
- wrong_next_best_action: 111 cases - Refine next-step logic to prioritize qualification or demo paths when objections or buying triggers are present.
- wrong_crm_classification: 92 cases - Improve CRM bucket inference by combining lead score, trust signals, and buyer stage before categorical assignment.
- wrong_cta: 80 cases - Enhance CTA selection rules by including industry-specific booking and demo heuristics for complex purchase stages.
- weak_personalization: 68 cases - Use persona and company-size conditions earlier in orchestration to select higher-tier plans and enterprise-focused CTAs for high-value visitors.
- incorrect_booking_timing: 9 cases - Refine booking trigger rules to better distinguish immediate demo/order intent from informational browsing or support journeys.
- wrong_product_recommendation: 1 case - Add a stronger product-plan mapping layer in orchestration that weighs persona, budget, and product complexity before plan selection.
- incorrect_qualification_timing: 0 cases - Adjust qualification timing to ask budget or timeline questions earlier for awareness cases and later for decision-stage flows.
- missed_objection: 0 cases - Surface objection signals sooner in the orchestration layer and mark the conversation as objection-handling ready when price/trust cues are present.
- missing_trust_signal: 0 cases - Inject trust signal checks into the playbook builder when content includes security, customer proof, or enterprise context.

## Improvement recommendations
- Refine next-step logic to prioritize qualification or demo paths when objections or buying triggers are present.
- Improve CRM bucket inference by combining lead score, trust signals, and buyer stage before categorical assignment.
- Enhance CTA selection rules by including industry-specific booking and demo heuristics for complex purchase stages.
- Use persona and company-size conditions earlier in orchestration to select higher-tier plans and enterprise-focused CTAs for high-value visitors.
- Refine booking trigger rules to better distinguish immediate demo/order intent from informational browsing or support journeys.
- Add a stronger product-plan mapping layer in orchestration that weighs persona, budget, and product complexity before plan selection.
- Adjust qualification timing to ask budget or timeline questions earlier for awareness cases and later for decision-stage flows.
- Surface objection signals sooner in the orchestration layer and mark the conversation as objection-handling ready when price/trust cues are present.
- Inject trust signal checks into the playbook builder when content includes security, customer proof, or enterprise context.

## Freeze decision
- Overall accuracy: 71.8% / 80% (FAIL)
- Recommended plan accuracy: 99.2% / 70% (PASS)
- Next step accuracy: 14.6% / 75% (FAIL)
- CTA accuracy: 38.5% / 75% (FAIL)
- CRM classification accuracy: 29.2% / 70% (FAIL)
- Trust signal usage accuracy: 100.0% / 70% (PASS)
- Booking trigger F1: 74.3% / 80% (FAIL)
- Qualification timing F1: 100.0% / 85% (PASS)
- Objection handling F1: 100.0% / 80% (PASS)
- Trust signal usage F1: 100.0% / 75% (PASS)
- Per-industry minimum accuracy: 0.0% / 70% (FAIL)

**Freeze recommendation:** DO NOT FREEZE

