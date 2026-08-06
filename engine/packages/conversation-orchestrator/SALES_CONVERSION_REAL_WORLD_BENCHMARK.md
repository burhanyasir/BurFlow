# Sales Conversion Real-World Evaluation Benchmark

## Summary
- Cases evaluated: 130
- Overall accuracy: 82.9%
- Recommended plan accuracy: 99.2%
- Next best action accuracy: 70.8%
- CTA accuracy: 63.1%
- CRM classification accuracy: 100.0%
- Booking timing accuracy: 93.1%
- Qualification timing accuracy: 36.9%
- Objection handling accuracy: 100.0%
- Trust signal usage accuracy: 100.0%

## Synthetic benchmark comparison
- Synthetic overall accuracy: 68.3%
- Real-world overall accuracy: 82.9%
- Accuracy delta: 14.6%
- Real-world vs synthetic per-industry deltas: SaaS: 2.6%, E-commerce: 20.0%, Healthcare: 11.1%, Education: 16.7%, Hotels: 66.7%, Real Estate: 40.0%, Professional services: 25.0%, Restaurants: 0.0%, Automotive: 20.0%, Manufacturing: 28.6%, Construction: 50.0%, Agencies: 100.0%, Finance: 0.0%, Legal: 100.0%, Local Businesses: 100.0%, Travel: 40.0%, Insurance: 0.0%, Fintech: 0.0%, Telecom: 0.0%, Media: 20.0%, Retail: 50.0%, Food & Beverage: 0.0%, Logistics: 0.0%, Government: 0.0%, Nonprofit: 0.0%, Fitness: 0.0%, Luxury retail: 0.0%, Consumer electronics: 25.0%, Energy: 0.0%, Agriculture: 0.0%, Transportation: 33.3%, Technology: 0.0%

## Per-industry accuracy
| Industry | Accuracy |
| --- | ---: |
| Agencies | 100.0% |
| Legal | 100.0% |
| Local Businesses | 100.0% |
| Hotels | 66.7% |
| Construction | 50.0% |
| Retail | 50.0% |
| Healthcare | 44.4% |
| Real Estate | 40.0% |
| Travel | 40.0% |
| Transportation | 33.3% |
| Manufacturing | 28.6% |
| Professional services | 25.0% |
| Consumer electronics | 25.0% |
| E-commerce | 20.0% |
| Automotive | 20.0% |
| Media | 20.0% |
| SaaS | 18.2% |
| Education | 16.7% |
| Restaurants | 0.0% |
| Finance | 0.0% |
| Insurance | 0.0% |
| Fintech | 0.0% |
| Telecom | 0.0% |
| Food & Beverage | 0.0% |
| Logistics | 0.0% |
| Government | 0.0% |
| Nonprofit | 0.0% |
| Fitness | 0.0% |
| Luxury retail | 0.0% |
| Energy | 0.0% |
| Agriculture | 0.0% |
| Technology | 0.0% |

## Confusion matrices

### Recommended plan
| Expected \ Predicted | Professional | Starter | Enterprise |
| --- | --- | --- | --- |
| Professional | 26 | 0 | 1 |
| Starter | 0 | 53 | 0 |
| Enterprise | 0 | 0 | 50 |

### Next best action
| Expected \ Predicted | continue_education | contact_sales | schedule_demo | review_pricing | recommend_trial |
| --- | --- | --- | --- | --- | --- |
| continue_education | 66 | 2 | 1 | 3 | 0 |
| contact_sales | 0 | 0 | 0 | 0 | 0 |
| schedule_demo | 0 | 0 | 12 | 0 | 0 |
| review_pricing | 11 | 1 | 1 | 1 | 0 |
| recommend_trial | 16 | 2 | 0 | 1 | 13 |

### CTA selection
| Expected \ Predicted | contact-sales | book-demo | compare-plans | start-free-trial | request-quote |
| --- | --- | --- | --- | --- | --- |
| contact-sales | 67 | 2 | 3 | 11 | 1 |
| book-demo | 0 | 12 | 0 | 0 | 0 |
| compare-plans | 25 | 1 | 1 | 1 | 1 |
| start-free-trial | 1 | 1 | 0 | 2 | 0 |
| request-quote | 1 | 0 | 0 | 0 | 0 |

### CRM bucket
| Expected \ Predicted | cold | warm | hot |
| --- | --- | --- | --- |
| cold | 0 | 0 | 0 |
| warm | 0 | 75 | 0 |
| hot | 0 | 0 | 55 |

## Binary metrics
| Aspect | Precision | Recall | F1 |
| --- | ---: | ---: | ---: |
| Booking trigger | 100.0% | 59.1% | 74.3% |
| Qualification timing | 0.0% | 0.0% | 0.0% |
| Objection handling | 100.0% | 100.0% | 100.0% |
| Trust signal usage | 100.0% | 100.0% | 100.0% |

## Failure analysis
- Total failing cases: 96

### https://www.hubspot.com/pricing — SaaS / pricing / decision
- URL: https://www.hubspot.com/pricing
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.hubspot.com/contact-sales — SaaS / booking / decision
- URL: https://www.hubspot.com/contact-sales
- Failure categories: incorrect_qualification_timing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### https://www.atlassian.com/software/jira/pricing — SaaS / pricing / consideration
- URL: https://www.atlassian.com/software/jira/pricing
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### https://www.atlassian.com/software/confluence — SaaS / product / awareness
- URL: https://www.atlassian.com/software/confluence
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.salesforce.com/editions-pricing/ — SaaS / pricing / decision
- URL: https://www.salesforce.com/editions-pricing/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: contact_sales
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got contact_sales; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.shopify.com/pricing — E-commerce / pricing / decision
- URL: https://www.shopify.com/pricing
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: contact_sales
- Expected CTA: request-quote, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got contact_sales; CTA mismatch: expected request-quote but got contact-sales

### https://www.bestbuy.com/ — E-commerce / home / awareness
- URL: https://www.bestbuy.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.amazon.com/ — E-commerce / home / awareness
- URL: https://www.amazon.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans; Qualification timing mismatch: expected ask_qualification but got none

### https://www.walmart.com/cp/customer-service/1235 — E-commerce / support / consideration
- URL: https://www.walmart.com/cp/customer-service/1235
- Failure categories: incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Booking timing mismatch: expected trigger but got none

### https://www.mayoclinic.org/appointments — Healthcare / booking / decision
- URL: https://www.mayoclinic.org/appointments
- Failure categories: incorrect_qualification_timing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### https://www.nhs.uk/conditions/ — Healthcare / product / awareness
- URL: https://www.nhs.uk/conditions/
- Failure categories: incorrect_booking_timing, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Booking timing mismatch: expected trigger but got none; Qualification timing mismatch: expected ask_qualification but got none

### https://www.harvard.edu/admissions/ — Education / admissions / decision
- URL: https://www.harvard.edu/admissions/
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial

### https://web.mit.edu/admissions/ — Education / admissions / decision
- URL: https://web.mit.edu/admissions/
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial

### https://www.stanford.edu/admissions — Education / admissions / decision
- URL: https://www.stanford.edu/admissions
- Failure categories: wrong_cta, incorrect_qualification_timing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### https://www.airbnb.com/ — Hotels / home / awareness
- URL: https://www.airbnb.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.zillow.com/homes/for_sale/ — Real Estate / product / awareness
- URL: https://www.zillow.com/homes/for_sale/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.realtor.com/realestateandhomes-search — Real Estate / product / consideration
- URL: https://www.realtor.com/realestateandhomes-search
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.bcg.com/capabilities — Professional services / product / awareness
- URL: https://www.bcg.com/capabilities
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.deloitte.com/us/en/pages/consulting/solutions.html — Professional services / product / consideration
- URL: https://www.deloitte.com/us/en/pages/consulting/solutions.html
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans; Qualification timing mismatch: expected ask_qualification but got none

### https://www.mcdonalds.com/us/en-us.html — Restaurants / home / awareness
- URL: https://www.mcdonalds.com/us/en-us.html
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.starbucks.com/menu — Restaurants / product / awareness
- URL: https://www.starbucks.com/menu
- Failure categories: incorrect_booking_timing, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Booking timing mismatch: expected trigger but got none; Qualification timing mismatch: expected ask_qualification but got none

### https://www.chipotle.com/order — Restaurants / buying / decision
- URL: https://www.chipotle.com/order
- Failure categories: wrong_cta, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected contact-sales but got start-free-trial; Booking timing mismatch: expected trigger but got none

### https://www.dominos.com/en/pages/order/ — Restaurants / buying / decision
- URL: https://www.dominos.com/en/pages/order/
- Failure categories: incorrect_qualification_timing
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: schedule_demo, actual: schedule_demo
- Expected CTA: book-demo, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Qualification timing mismatch: expected ask_qualification but got none

### https://www.toyota.com/prius — Automotive / product / consideration
- URL: https://www.toyota.com/prius
- Failure categories: wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; Qualification timing mismatch: expected ask_qualification but got none

### https://www.siemens.com/global/en/products/automation.html — Manufacturing / product / awareness
- URL: https://www.siemens.com/global/en/products/automation.html
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.honeywell.com/us/en/products — Manufacturing / product / consideration
- URL: https://www.honeywell.com/us/en/products
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.lennar.com/homes — Construction / product / consideration
- URL: https://www.lennar.com/homes
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.zillow.com/agents/ — Real Estate / contact / decision
- URL: https://www.zillow.com/agents/
- Failure categories: wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales

### https://www.nerdwallet.com/best/credit-cards — Finance / comparison / consideration
- URL: https://www.nerdwallet.com/best/credit-cards
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### https://www.citi.com/ — Finance / home / awareness
- URL: https://www.citi.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.toyota.com/ — Automotive / home / awareness
- URL: https://www.toyota.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.chase.com/personal/credit-cards — Finance / product / consideration
- URL: https://www.chase.com/personal/credit-cards
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.bosch.com/products-and-services/ — Manufacturing / product / consideration
- URL: https://www.bosch.com/products-and-services/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.expedia.com/Flights — Travel / product / consideration
- URL: https://www.expedia.com/Flights
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.booking.com/ — Travel / home / awareness
- URL: https://www.booking.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: review_pricing
- Expected CTA: contact-sales, actual: compare-plans
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got review_pricing; CTA mismatch: expected contact-sales but got compare-plans; Qualification timing mismatch: expected ask_qualification but got none

### https://www.geico.com/insurance/ — Insurance / product / consideration
- URL: https://www.geico.com/insurance/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.aetna.com/individuals-families/health-insurance.html — Healthcare / product / decision
- URL: https://www.aetna.com/individuals-families/health-insurance.html
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.revolut.com/ — Finance / home / awareness
- URL: https://www.revolut.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://stripe.com/pricing — Fintech / pricing / consideration
- URL: https://stripe.com/pricing
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.att.com/ — Telecom / home / awareness
- URL: https://www.att.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.netflix.com/ — Media / home / awareness
- URL: https://www.netflix.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.disneyplus.com/ — Media / home / consideration
- URL: https://www.disneyplus.com/
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales

### https://www.verizon.com/ — Telecom / product / consideration
- URL: https://www.verizon.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.wholefoodsmarket.com/ — Retail / product / consideration
- URL: https://www.wholefoodsmarket.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: review_pricing
- Expected CTA: compare-plans, actual: request-quote
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got review_pricing; CTA mismatch: expected compare-plans but got request-quote; Qualification timing mismatch: expected ask_qualification but got none

### https://www.doordash.com/ — Food & Beverage / home / awareness
- URL: https://www.doordash.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.3m.com/3M/en_US/company-us/ — Manufacturing / product / consideration
- URL: https://www.3m.com/3M/en_US/company-us/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.fedex.com/en-us/home.html — Logistics / home / awareness
- URL: https://www.fedex.com/en-us/home.html
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.irs.gov/ — Government / service / awareness
- URL: https://www.irs.gov/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: start-free-trial, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.dmv.org/ — Government / service / decision
- URL: https://www.dmv.org/
- Failure categories: wrong_cta, wrong_next_best_action, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: schedule_demo
- Expected CTA: start-free-trial, actual: book-demo
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got trigger
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got schedule_demo; CTA mismatch: expected start-free-trial but got book-demo

### https://www.redcross.org/ — Nonprofit / home / awareness
- URL: https://www.redcross.org/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.mckinsey.com/ — Professional services / services / consideration
- URL: https://www.mckinsey.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.coursera.org/ — Education / home / awareness
- URL: https://www.coursera.org/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.peloton.com/ — Fitness / product / decision
- URL: https://www.peloton.com/
- Failure categories: wrong_cta, incorrect_qualification_timing
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### https://www.tiffany.com/ — Luxury retail / product / consideration
- URL: https://www.tiffany.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.apple.com/shop/buy-iphone — Consumer electronics / product / decision
- URL: https://www.apple.com/shop/buy-iphone
- Failure categories: wrong_cta, incorrect_qualification_timing
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### https://www.tesla.com/ — Automotive / product / decision
- URL: https://www.tesla.com/
- Failure categories: wrong_cta
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial

### https://www.airbnb.com/s/experiences — Travel / product / research
- URL: https://www.airbnb.com/s/experiences
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: review_pricing, actual: schedule_demo
- Expected CTA: compare-plans, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got schedule_demo; CTA mismatch: expected compare-plans but got book-demo; Booking timing mismatch: expected trigger but got none

### https://www.slack.com/pricing — SaaS / pricing / consideration
- URL: https://www.slack.com/pricing
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.tesla.com/energy — Energy / product / consideration
- URL: https://www.tesla.com/energy
- Failure categories: wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; Qualification timing mismatch: expected ask_qualification but got none

### https://www.johndeere.com/en/ — Agriculture / product / consideration
- URL: https://www.johndeere.com/en/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### https://www.mercedes-benz.com/en/ — Automotive / product / consideration
- URL: https://www.mercedes-benz.com/en/
- Failure categories: wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; Qualification timing mismatch: expected ask_qualification but got none

### https://www.wellsfargo.com/ — Finance / product / consideration
- URL: https://www.wellsfargo.com/
- Failure categories: wrong_product_recommendation, wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Plan mismatch: expected Professional but got Enterprise; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.cnn.com/ — Media / home / awareness
- URL: https://www.cnn.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.siemens.com/global/en/home.html — Manufacturing / product / research
- URL: https://www.siemens.com/global/en/home.html
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.evernote.com/ — SaaS / pricing / consideration
- URL: https://www.evernote.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.uber.com/us/en/ — Transportation / home / awareness
- URL: https://www.uber.com/us/en/
- Failure categories: wrong_cta, incorrect_booking_timing, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected contact-sales but got book-demo; Booking timing mismatch: expected trigger but got none; Qualification timing mismatch: expected ask_qualification but got none

### https://www.intuit.com/ — Fintech / product / consideration
- URL: https://www.intuit.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.procore.com/ — Construction / pricing / consideration
- URL: https://www.procore.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.cnbc.com/ — Media / home / awareness
- URL: https://www.cnbc.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.mckesson.com/ — Healthcare / product / consideration
- URL: https://www.mckesson.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.jpmorgan.com/ — Finance / services / research
- URL: https://www.jpmorgan.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.wikipedia.org/ — Media / home / awareness
- URL: https://www.wikipedia.org/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.ikea.com/us/en/customer-service — Retail / support / decision
- URL: https://www.ikea.com/us/en/customer-service
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_booking_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: contact_sales
- Expected CTA: start-free-trial, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected continue_education but got contact_sales; CTA mismatch: expected start-free-trial but got contact-sales; Booking timing mismatch: expected trigger but got none

### https://www.indeed.com/hire — Professional services / product / consideration
- URL: https://www.indeed.com/hire
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.cigna.com/ — Healthcare / product / decision
- URL: https://www.cigna.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.sony.com/electronics — Consumer electronics / product / consideration
- URL: https://www.sony.com/electronics
- Failure categories: wrong_cta, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: no qualification prompt but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected contact-sales but got start-free-trial

### https://www.sprint.com/ — Telecom / pricing / consideration
- URL: https://www.sprint.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.suncorp.com.au/ — Insurance / product / decision
- URL: https://www.suncorp.com.au/
- Failure categories: wrong_cta, incorrect_qualification_timing
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### https://www.walmart.com/browse/electronics — Retail / product / consideration
- URL: https://www.walmart.com/browse/electronics
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.diageo.com/en/ — Food & Beverage / product / research
- URL: https://www.diageo.com/en/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.pepsico.com/ — Food & Beverage / product / awareness
- URL: https://www.pepsico.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.uber.com/business — Transportation / product / consideration
- URL: https://www.uber.com/business
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: recommend_trial, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected recommend_trial but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

### https://www.barnesandnoble.com/ — Retail / product / awareness
- URL: https://www.barnesandnoble.com/
- Failure categories: wrong_cta, incorrect_booking_timing, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: book-demo
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected contact-sales but got book-demo; Booking timing mismatch: expected trigger but got none; Qualification timing mismatch: expected ask_qualification but got none

### https://www.indeed.com/ — Professional services / product / awareness
- URL: https://www.indeed.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.adobe.com/creativecloud/plans.html — SaaS / pricing / decision
- URL: https://www.adobe.com/creativecloud/plans.html
- Failure categories: wrong_cta, incorrect_qualification_timing
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### https://www.merriam-webster.com/ — Education / home / awareness
- URL: https://www.merriam-webster.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.mcdonalds.com/us/en-us.html — Food & Beverage / home / awareness
- URL: https://www.mcdonalds.com/us/en-us.html
- Failure categories: incorrect_booking_timing, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Booking timing mismatch: expected trigger but got none; Qualification timing mismatch: expected ask_qualification but got none

### https://www.wellsfargo.com/personal-banking/ — Finance / product / decision
- URL: https://www.wellsfargo.com/personal-banking/
- Failure categories: wrong_cta, incorrect_qualification_timing
- Expected plan: Professional, actual: Professional
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: start-free-trial
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: CTA mismatch: expected contact-sales but got start-free-trial; Qualification timing mismatch: expected ask_qualification but got none

### https://www.reddit.com/ — Media / home / awareness
- URL: https://www.reddit.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.lululemon.com/ — Retail / product / consideration
- URL: https://www.lululemon.com/
- Failure categories: wrong_cta, incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: recommend_trial, actual: recommend_trial
- Expected CTA: contact-sales, actual: request-quote
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; CTA mismatch: expected contact-sales but got request-quote; Qualification timing mismatch: expected ask_qualification but got none

### https://www.vmware.com/ — SaaS / services / consideration
- URL: https://www.vmware.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.nest.com/ — Consumer electronics / product / consideration
- URL: https://www.nest.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.nature.com/ — Media / product / research
- URL: https://www.nature.com/
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.dw.com/en/top-stories/s-9097 — Media / home / awareness
- URL: https://www.dw.com/en/top-stories/s-9097
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Starter, actual: Starter
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: not detected but got not detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.pwc.com/us/en/services.html — Professional services / services / consideration
- URL: https://www.pwc.com/us/en/services.html
- Failure categories: incorrect_qualification_timing, weak_personalization
- Expected plan: Enterprise, actual: Enterprise
- Expected next step: continue_education, actual: continue_education
- Expected CTA: contact-sales, actual: contact-sales
- Expected bucket: hot, actual: hot
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Qualification timing mismatch: expected ask_qualification but got none

### https://www.kaspersky.com/ — Technology / product / consideration
- URL: https://www.kaspersky.com/
- Failure categories: wrong_cta, wrong_next_best_action, incorrect_qualification_timing, weak_personalization
- Expected plan: Professional, actual: Professional
- Expected next step: review_pricing, actual: continue_education
- Expected CTA: compare-plans, actual: contact-sales
- Expected bucket: warm, actual: warm
- Expected booking: no trigger but got none
- Expected qualification timing: ask_qualification but got none
- Expected objection handling: detected but got detected
- Expected trust signal usage: used but got used
- Root causes: Personalization mismatch: high-value case received a generic plan/CTA/action.; Next step mismatch: expected review_pricing but got continue_education; CTA mismatch: expected compare-plans but got contact-sales; Qualification timing mismatch: expected ask_qualification but got none

## Common failure patterns
- Personalization mismatch: high-value case received a generic plan/CTA/action. (83 cases)
- Qualification timing mismatch: expected ask_qualification but got none (82 cases)
- CTA mismatch: expected compare-plans but got contact-sales (25 cases)
- Next step mismatch: expected recommend_trial but got continue_education (16 cases)
- Next step mismatch: expected review_pricing but got continue_education (11 cases)
- CTA mismatch: expected contact-sales but got start-free-trial (11 cases)

## Ranked failure modes
- weak_personalization: 107 cases - Use persona and company-size conditions earlier in orchestration to select higher-tier plans and enterprise-focused CTAs for high-value visitors.
- incorrect_qualification_timing: 82 cases - Adjust qualification timing to ask budget or timeline questions earlier for awareness cases and later for decision-stage flows.
- wrong_cta: 48 cases - Enhance CTA selection rules by including industry-specific booking and demo heuristics for complex purchase stages.
- wrong_next_best_action: 38 cases - Refine next-step logic to prioritize qualification or demo paths when objections or buying triggers are present.
- incorrect_booking_timing: 9 cases - Refine booking trigger rules to better distinguish immediate demo/order intent from informational browsing or support journeys.
- wrong_product_recommendation: 1 case - Add a stronger product-plan mapping layer in orchestration that weighs persona, budget, and product complexity before plan selection.
- wrong_crm_classification: 0 cases - Improve CRM bucket inference by combining lead score, trust signals, and buyer stage before categorical assignment.
- missed_objection: 0 cases - Surface objection signals sooner in the orchestration layer and mark the conversation as objection-handling ready when price/trust cues are present.
- missing_trust_signal: 0 cases - Inject trust signal checks into the playbook builder when content includes security, customer proof, or enterprise context.

## Improvement recommendations
- Use persona and company-size conditions earlier in orchestration to select higher-tier plans and enterprise-focused CTAs for high-value visitors.
- Adjust qualification timing to ask budget or timeline questions earlier for awareness cases and later for decision-stage flows.
- Enhance CTA selection rules by including industry-specific booking and demo heuristics for complex purchase stages.
- Refine next-step logic to prioritize qualification or demo paths when objections or buying triggers are present.
- Refine booking trigger rules to better distinguish immediate demo/order intent from informational browsing or support journeys.
- Add a stronger product-plan mapping layer in orchestration that weighs persona, budget, and product complexity before plan selection.
- Improve CRM bucket inference by combining lead score, trust signals, and buyer stage before categorical assignment.
- Surface objection signals sooner in the orchestration layer and mark the conversation as objection-handling ready when price/trust cues are present.
- Inject trust signal checks into the playbook builder when content includes security, customer proof, or enterprise context.

## Freeze decision
- Overall accuracy: 82.9% / 80% (PASS)
- Recommended plan accuracy: 99.2% / 70% (PASS)
- Next step accuracy: 70.8% / 75% (FAIL)
- CTA accuracy: 63.1% / 75% (FAIL)
- CRM classification accuracy: 100.0% / 70% (PASS)
- Trust signal usage accuracy: 100.0% / 70% (PASS)
- Booking trigger F1: 74.3% / 80% (FAIL)
- Qualification timing F1: 0.0% / 85% (FAIL)
- Objection handling F1: 100.0% / 80% (PASS)
- Trust signal usage F1: 100.0% / 75% (PASS)
- Per-industry minimum accuracy: 0.0% / 70% (FAIL)

**Freeze recommendation:** DO NOT FREEZE

