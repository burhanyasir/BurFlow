# Visitor Intent Final Benchmark

## Summary
- Total evaluated pages: 250
- Overall accuracy: 91.60%
- Macro precision: 43.65%
- Macro recall: 96.24%
- Macro F1: 54.29%
- Previous benchmark accuracy: 48.00%
- Improvement vs. previous benchmark: 43.60% absolute (90.83% relative)

## Per-industry accuracy
| Industry | Accuracy |
| --- | ---: |
| SaaS | 100.00% |
| Education | 100.00% |
| Agencies | 100.00% |
| Restaurants | 100.00% |
| Automotive | 100.00% |
| Nonprofits | 100.00% |
| Careers | 100.00% |
| Ecommerce | 95.24% |
| Healthcare | 93.75% |
| Hotels | 93.75% |
| Local Businesses | 93.75% |
| Real Estate | 87.50% |
| Legal | 81.25% |
| Finance | 81.25% |
| Manufacturing | 75.00% |
| Construction | 68.75% |

## Per-intent accuracy
| Intent | Accuracy |
| --- | ---: |
| Buying | 100.00% |
| Pricing | 100.00% |
| Comparison | 100.00% |
| Booking | 100.00% |
| Careers | 100.00% |
| Product Research | 98.75% |
| Contact | 96.30% |
| Support | 90.91% |
| General Information | 80.22% |

## Confusion matrix
| Expected  Predicted | Buying | Pricing | Product Research | Support | Comparison | Booking | Contact | Careers | General Information |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Buying | 18 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Pricing | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Product Research | 0 | 0 | 79 | 0 | 0 | 0 | 1 | 0 | 0 |
| Support | 0 | 0 | 1 | 10 | 0 | 0 | 0 | 0 | 0 |
| Comparison | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| Booking | 0 | 0 | 0 | 0 | 0 | 10 | 0 | 0 | 0 |
| Contact | 0 | 0 | 1 | 0 | 0 | 0 | 26 | 0 | 0 |
| Careers | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| General Information | 0 | 0 | 15 | 1 | 0 | 1 | 1 | 0 | 73 |

## Top incorrect predictions
| URL | Expected | Predicted | Root cause |
| --- | --- | --- | --- |
| https://www.bestbuy.com/site/store-locator | Contact | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.nhs.uk/nhs-services/urgent-and-emergency-care/ | Support | Product Research | The page lacked a strong discriminating signal for the expected intent. |
| https://www.law.cornell.edu/ | General Information | Contact | Pricing-related vocabulary produced competing intent signals. |
| https://www.gibsondunn.com/ | General Information | Product Research | Support and contact signals were ambiguous in the page copy. |
| https://www.littler.com/ | General Information | Product Research | Support and contact signals were ambiguous in the page copy. |
| https://www.chase.com/ | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.americanexpress.com/ | General Information | Product Research | Support and contact signals were ambiguous in the page copy. |
| https://www.capitalone.com/ | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.siemens.com/global/en.html | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.3m.com/3M/en_US/company-us/ | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.honeywell.com/us/en | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.bosch.com/ | General Information | Product Research | Support and contact signals were ambiguous in the page copy. |
| https://www.booking.com/ | General Information | Booking | Booking cues were mixed with broader marketing language. |
| https://www.realtor.com/ | General Information | Product Research | The page lacked a strong discriminating signal for the expected intent. |
| https://www.homelistings.com/ | General Information | Product Research | The page lacked a strong discriminating signal for the expected intent. |
| https://www.kiewit.com/ | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.lennar.com/homes | Product Research | Contact | Support and contact signals were ambiguous in the page copy. |
| https://www.bechtel.com/ | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |
| https://www.aecom.com/ | General Information | Product Research | Support and contact signals were ambiguous in the page copy. |
| https://www.fluor.com/ | General Information | Product Research | Pricing-related vocabulary produced competing intent signals. |

## Detailed results
| URL | Industry | Expected | Predicted | Secondary | Confidence | Correct |
| --- | --- | --- | --- | --- | ---: | --- |
| https://www.hubspot.com/pricing | SaaS | Pricing | Pricing | Product Research | 99.0% | Yes |
| https://www.hubspot.com/products/crm | SaaS | Product Research | Product Research | Pricing | 99.0% | Yes |
| https://www.hubspot.com/contact-sales | SaaS | Contact | Contact | Product Research | 99.0% | Yes |
| https://www.hubspot.com/solutions/sales | SaaS | Product Research | Product Research | Pricing | 99.0% | Yes |
| https://www.hubspot.com/integrations | SaaS | Product Research | Product Research | Pricing | 99.0% | Yes |
| https://www.atlassian.com/software/jira/pricing | SaaS | Pricing | Pricing | Product Research | 99.0% | Yes |
| https://www.atlassian.com/software/confluence | SaaS | Product Research | Product Research | Pricing | 99.0% | Yes |
| https://www.atlassian.com/company/contact | SaaS | Contact | Contact | Product Research | 99.0% | Yes |
| https://www.zendesk.com/pricing/ | SaaS | Pricing | Pricing | Product Research | 99.0% | Yes |
| https://www.zendesk.com/solutions/ | SaaS | Product Research | Product Research | Pricing | 99.0% | Yes |
| https://www.zendesk.com/contact/ | SaaS | Contact | Contact | Product Research | 99.0% | Yes |
| https://www.salesforce.com/editions-pricing/ | SaaS | Pricing | Pricing | Product Research | 99.0% | Yes |
| https://www.salesforce.com/products/ | SaaS | Product Research | Product Research | Pricing | 99.0% | Yes |
| https://www.salesforce.com/company/contact/ | SaaS | Contact | Contact | Product Research | 99.0% | Yes |
| https://www.shopify.com/pricing | SaaS | Pricing | Pricing | Product Research | 99.0% | Yes |
| https://www.shopify.com/plus | SaaS | Product Research | Product Research | Support | 99.0% | Yes |
| https://www.bestbuy.com/ | Ecommerce | Product Research | Product Research | Support | 99.0% | Yes |
| https://www.bestbuy.com/site/checkout | Ecommerce | Buying | Buying | Product Research | 99.0% | Yes |
| https://www.bestbuy.com/site/store-locator | Ecommerce | Contact | Product Research | Contact | 99.0% | No |
| https://www.nike.com/ | Ecommerce | Product Research | Product Research | Support | 88.0% | Yes |
| https://www.nike.com/w/new-releases-3n82y | Ecommerce | Product Research | Product Research | Careers | 85.0% | Yes |
| https://www.etsy.com/ | Ecommerce | Product Research | Product Research | General Information | 87.0% | Yes |
| https://www.etsy.com/cart | Ecommerce | Buying | Buying | General Information | 93.0% | Yes |
| https://www.ebay.com/ | Ecommerce | Product Research | Product Research | Support | 99.0% | Yes |
| https://www.ebay.com/help | Ecommerce | Support | Support | Buying | 98.0% | Yes |
| https://www.walmart.com/ | Ecommerce | Product Research | Product Research | Support | 99.0% | Yes |
| https://www.walmart.com/cp/customer-service/1235 | Ecommerce | Support | Support | Product Research | 96.0% | Yes |
| https://www.target.com/ | Ecommerce | Product Research | Product Research | Support | 94.0% | Yes |
| https://www.target.com/c/clearance/-/N-5xt1a | Ecommerce | Product Research | Product Research | Buying | 99.0% | Yes |
| https://www.target.com/help | Ecommerce | Support | Support | Product Research | 99.0% | Yes |
| https://www.amazon.com/ | Ecommerce | Product Research | Product Research | Support | 97.0% | Yes |
| https://www.amazon.com/gp/help/customer/display.html | Ecommerce | Support | Support | Product Research | 99.0% | Yes |
| https://www.mayoclinic.org/appointments | Healthcare | Booking | Booking | General Information | 99.0% | Yes |
| https://www.mayoclinic.org/tests-procedures | Healthcare | Product Research | Product Research | Booking | 99.0% | Yes |
| https://www.mayoclinic.org/diseases-conditions | Healthcare | Product Research | Product Research | Support | 91.0% | Yes |
| https://www.clevelandclinic.org/appointments | Healthcare | Booking | Booking | Product Research | 96.0% | Yes |
| https://my.clevelandclinic.org/appointments | Healthcare | Booking | Booking | Product Research | 95.0% | Yes |
| https://www.nhs.uk/nhs-services/urgent-and-emergency-care/ | Healthcare | Support | Product Research | Support | 83.0% | No |
| https://www.nhs.uk/conditions/ | Healthcare | Product Research | Product Research | Support | 99.0% | Yes |
| https://www.kaiserpermanente.org/health-wellness | Healthcare | Product Research | Product Research | Booking | 99.0% | Yes |
| https://www.kp.org/ | Healthcare | General Information | General Information | — | 91.0% | Yes |
| https://www.hopkinsmedicine.org/ | Healthcare | General Information | General Information | Support | 99.0% | Yes |
| https://www.hopkinsmedicine.org/health/conditions-and-diseases | Healthcare | Product Research | Product Research | Booking | 99.0% | Yes |
| https://www.hopkinsmedicine.org/healthcare/appointment | Healthcare | Booking | Booking | Product Research | 99.0% | Yes |
| https://www.ucsfhealth.org/ | Healthcare | General Information | General Information | Product Research | 99.0% | Yes |
| https://www.ucsfhealth.org/conditions | Healthcare | Product Research | Product Research | Booking | 99.0% | Yes |
| https://www.ucsfhealth.org/locations | Healthcare | Contact | Contact | Product Research | 99.0% | Yes |
| https://www.ucsfhealth.org/patients-visitors | Healthcare | Support | Support | — | 91.0% | Yes |
| https://www.findlaw.com/ | Legal | General Information | General Information | Product Research | 86.0% | Yes |
| https://www.findlaw.com/lawyer | Legal | Contact | Contact | Product Research | 98.0% | Yes |
| https://www.findlaw.com/consumer | Legal | Product Research | Product Research | — | 91.0% | Yes |
| https://www.law.cornell.edu/ | Legal | General Information | Contact | Product Research | 93.0% | No |
| https://www.law.cornell.edu/wex | Legal | Product Research | Product Research | — | 91.0% | Yes |
| https://www.gibsondunn.com/ | Legal | General Information | Product Research | Contact | 79.0% | No |
| https://www.gibsondunn.com/contact-us/ | Legal | Contact | Contact | Product Research | 92.0% | Yes |
| https://www.bakermckenzie.com/en/ | Legal | General Information | General Information | Product Research | 63.0% | Yes |
| https://www.bakermckenzie.com/en/people | Legal | Product Research | Product Research | — | 91.0% | Yes |
| https://www.bakermckenzie.com/en/contact | Legal | Contact | Contact | Product Research | 92.0% | Yes |
| https://www.littler.com/ | Legal | General Information | Product Research | Contact | 79.0% | No |
| https://www.littler.com/people | Legal | Product Research | Product Research | — | 91.0% | Yes |
| https://www.littler.com/contact | Legal | Contact | Contact | Product Research | 99.0% | Yes |
| https://www.morganlewis.com/ | Legal | General Information | General Information | Product Research | 86.0% | Yes |
| https://www.morganlewis.com/people | Legal | Product Research | Product Research | — | 91.0% | Yes |
| https://www.morganlewis.com/contact | Legal | Contact | Contact | Product Research | 92.0% | Yes |
| https://www.chase.com/ | Finance | General Information | Product Research | Support | 94.0% | No |
| https://www.chase.com/personal/credit-cards | Finance | Product Research | Product Research | — | 91.0% | Yes |
| https://www.chase.com/digital/resources/faq | Finance | Support | Support | — | 91.0% | Yes |
| https://www.bankofamerica.com/ | Finance | General Information | General Information | — | 71.0% | Yes |
| https://www.bankofamerica.com/credit-cards/ | Finance | Product Research | Product Research | — | 91.0% | Yes |
| https://www.americanexpress.com/ | Finance | General Information | Product Research | Support | 94.0% | No |
| https://www.americanexpress.com/en-us/credit-cards/ | Finance | Product Research | Product Research | — | 91.0% | Yes |
| https://www.capitalone.com/ | Finance | General Information | Product Research | Support | 99.0% | No |
| https://www.capitalone.com/credit-cards/ | Finance | Product Research | Product Research | — | 91.0% | Yes |
| https://www.investopedia.com/ | Finance | General Information | General Information | — | 71.0% | Yes |
| https://www.investopedia.com/financial-term-dictionary-4769738 | Finance | Product Research | Product Research | — | 91.0% | Yes |
| https://www.nerdwallet.com/ | Finance | General Information | General Information | — | 71.0% | Yes |
| https://www.nerdwallet.com/best/credit-cards | Finance | Comparison | Comparison | Product Research | 86.0% | Yes |
| https://www.nerdwallet.com/article/credit-cards | Finance | Product Research | Product Research | — | 91.0% | Yes |
| https://www.nerdwallet.com/support | Finance | Support | Support | — | 91.0% | Yes |
| https://www.citi.com/ | Finance | General Information | General Information | — | 71.0% | Yes |
| https://www.caterpillar.com/ | Manufacturing | General Information | General Information | — | 71.0% | Yes |
| https://www.caterpillar.com/en/products/new.html | Manufacturing | Product Research | Product Research | — | 91.0% | Yes |
| https://www.caterpillar.com/en/company/contact-us.html | Manufacturing | Contact | Contact | General Information | 91.0% | Yes |
| https://www.siemens.com/global/en.html | Manufacturing | General Information | Product Research | Contact | 99.0% | No |
| https://www.siemens.com/global/en/products/automation.html | Manufacturing | Product Research | Product Research | Contact | 99.0% | Yes |
| https://www.3m.com/3M/en_US/company-us/ | Manufacturing | General Information | Product Research | General Information | 83.0% | No |
| https://www.3m.com/3M/en_US/p/d/b000521161/ | Manufacturing | Product Research | Product Research | Contact | 85.0% | Yes |
| https://www.johndeere.com/en/industry/forestry.html | Manufacturing | Product Research | Product Research | — | 91.0% | Yes |
| https://www.johndeere.com/en/contact-us | Manufacturing | Contact | Contact | — | 91.0% | Yes |
| https://www.honeywell.com/us/en | Manufacturing | General Information | Product Research | General Information | 96.0% | No |
| https://www.honeywell.com/us/en/products | Manufacturing | Product Research | Product Research | — | 91.0% | Yes |
| https://www.ge.com/ | Manufacturing | General Information | General Information | — | 71.0% | Yes |
| https://www.ge.com/products | Manufacturing | Product Research | Product Research | — | 91.0% | Yes |
| https://www.ge.com/contact | Manufacturing | Contact | Contact | Product Research | 97.0% | Yes |
| https://www.bosch.com/ | Manufacturing | General Information | Product Research | Contact | 95.0% | No |
| https://www.bosch.com/products-and-services/ | Manufacturing | Product Research | Product Research | Contact | 99.0% | Yes |
| https://www.harvard.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://www.harvard.edu/about/ | Education | General Information | General Information | — | 91.0% | Yes |
| https://www.harvard.edu/admissions/ | Education | Buying | Buying | General Information | 81.0% | Yes |
| https://www.mit.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://web.mit.edu/admissions/ | Education | Buying | Buying | General Information | 81.0% | Yes |
| https://www.stanford.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://admission.stanford.edu/ | Education | Buying | Buying | General Information | 81.0% | Yes |
| https://www.uchicago.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://collegeadmissions.uchicago.edu/ | Education | Buying | Buying | General Information | 81.0% | Yes |
| https://www.upenn.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://admissions.upenn.edu/ | Education | Buying | Buying | General Information | 81.0% | Yes |
| https://www.columbia.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://undergrad.admissions.columbia.edu/ | Education | Buying | Buying | General Information | 81.0% | Yes |
| https://www.nyu.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://www.nyu.edu/admissions.html | Education | Buying | Buying | General Information | 81.0% | Yes |
| https://www.ucla.edu/ | Education | General Information | General Information | — | 71.0% | Yes |
| https://www.webflow.com/ | Agencies | General Information | General Information | — | 71.0% | Yes |
| https://www.webflow.com/pricing | Agencies | Pricing | Pricing | General Information | 91.0% | Yes |
| https://www.webflow.com/contact | Agencies | Contact | Contact | — | 91.0% | Yes |
| https://www.ideo.com/ | Agencies | General Information | General Information | — | 71.0% | Yes |
| https://www.ideo.com/us | Agencies | General Information | General Information | — | 91.0% | Yes |
| https://www.accenture.com/us-en | Agencies | General Information | General Information | — | 71.0% | Yes |
| https://www.accenture.com/us-en/services/consulting | Agencies | Product Research | Product Research | — | 91.0% | Yes |
| https://www.bcg.com/ | Agencies | General Information | General Information | — | 71.0% | Yes |
| https://www.bcg.com/capabilities | Agencies | Product Research | Product Research | — | 91.0% | Yes |
| https://www.deloitte.com/us/en.html | Agencies | General Information | General Information | — | 71.0% | Yes |
| https://www2.deloitte.com/us/en/pages/consulting/solutions.html | Agencies | Product Research | Product Research | — | 91.0% | Yes |
| https://www.ibm.com/ | Agencies | General Information | General Information | — | 71.0% | Yes |
| https://www.ibm.com/services | Agencies | Product Research | Product Research | — | 91.0% | Yes |
| https://www.ibm.com/contact | Agencies | Contact | Contact | — | 91.0% | Yes |
| https://www.pwc.com/us/en.html | Agencies | General Information | General Information | — | 71.0% | Yes |
| https://www.pwc.com/us/en/services.html | Agencies | Product Research | Product Research | — | 91.0% | Yes |
| https://www.mcdonalds.com/us/en-us.html | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.mcdonalds.com/us/en-us/contact-us.html | Restaurants | Contact | Contact | — | 91.0% | Yes |
| https://www.starbucks.com/ | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.starbucks.com/menu | Restaurants | Product Research | Product Research | — | 91.0% | Yes |
| https://www.chipotle.com/ | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.chipotle.com/order | Restaurants | Buying | Buying | Booking | 91.0% | Yes |
| https://www.dominos.com/ | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.dominos.com/en/pages/order/ | Restaurants | Buying | Buying | Booking | 91.0% | Yes |
| https://www.tacobell.com/ | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.tacobell.com/locations | Restaurants | Contact | Contact | — | 91.0% | Yes |
| https://www.pizzahut.com/ | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.pizzahut.com/order | Restaurants | Buying | Buying | Booking | 91.0% | Yes |
| https://www.subway.com/ | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.subway.com/en-US/ContactUs | Restaurants | Contact | Contact | — | 91.0% | Yes |
| https://www.burgerking.com/us/en | Restaurants | General Information | General Information | — | 71.0% | Yes |
| https://www.burgerking.com/us/en/locations | Restaurants | Contact | Contact | — | 91.0% | Yes |
| https://www.marriott.com/default.mi | Hotels | General Information | General Information | — | 71.0% | Yes |
| https://www.marriott.com/hotels/travel/ | Hotels | Booking | Booking | Buying | 90.0% | Yes |
| https://www.marriott.com/hotels/travel/nycwi-residence-inn-new-york-manhattan-midtown-east/ | Hotels | Booking | Booking | Buying | 90.0% | Yes |
| https://www.hilton.com/en/ | Hotels | General Information | General Information | — | 71.0% | Yes |
| https://www.hilton.com/en/book/ | Hotels | Booking | Booking | Buying | 91.0% | Yes |
| https://www.hyatt.com/ | Hotels | General Information | General Information | — | 71.0% | Yes |
| https://www.hyatt.com/en/hotel/home | Hotels | Booking | Booking | Buying | 90.0% | Yes |
| https://www.airbnb.com/ | Hotels | General Information | General Information | — | 71.0% | Yes |
| https://www.airbnb.com/help | Hotels | Support | Support | — | 91.0% | Yes |
| https://www.booking.com/ | Hotels | General Information | Booking | Buying | 88.0% | No |
| https://www.booking.com/hotel/ | Hotels | Booking | Booking | Buying | 91.0% | Yes |
| https://www.expedia.com/ | Hotels | General Information | General Information | — | 71.0% | Yes |
| https://www.expedia.com/hotels | Hotels | Booking | Booking | Buying | 90.0% | Yes |
| https://www.hotels.com/ | Hotels | General Information | General Information | — | 71.0% | Yes |
| https://www.hotels.com/hotel-deals | Hotels | Pricing | Pricing | General Information | 91.0% | Yes |
| https://www.hotels.com/help | Hotels | Support | Support | Booking | 99.0% | Yes |
| https://www.zillow.com/ | Real Estate | General Information | General Information | — | 91.0% | Yes |
| https://www.zillow.com/homes/ | Real Estate | Product Research | Product Research | — | 91.0% | Yes |
| https://www.realtor.com/ | Real Estate | General Information | Product Research | Contact | 66.0% | No |
| https://www.realtor.com/realestateandhomes-search | Real Estate | Product Research | Product Research | Contact | 98.0% | Yes |
| https://www.redfin.com/ | Real Estate | General Information | General Information | — | 91.0% | Yes |
| https://www.redfin.com/city/1230/WA/Seattle | Real Estate | Product Research | Product Research | Support | 85.0% | Yes |
| https://www.century21.com/ | Real Estate | General Information | General Information | — | 91.0% | Yes |
| https://www.century21.com/real-estate-agents | Real Estate | Contact | Contact | Product Research | 89.0% | Yes |
| https://www.trulia.com/ | Real Estate | General Information | General Information | — | 91.0% | Yes |
| https://www.trulia.com/for_sale | Real Estate | Product Research | Product Research | Contact | 90.0% | Yes |
| https://www.remax.com/ | Real Estate | General Information | General Information | — | 91.0% | Yes |
| https://www.remax.com/real-estate-agents | Real Estate | Contact | Contact | Product Research | 89.0% | Yes |
| https://www.homelistings.com/ | Real Estate | General Information | Product Research | General Information | 46.0% | No |
| https://www.homelistings.com/for-sale | Real Estate | Product Research | Product Research | — | 91.0% | Yes |
| https://www.zillow.com/homes/for_sale/ | Real Estate | Product Research | Product Research | Contact | 97.0% | Yes |
| https://www.zillow.com/agents/ | Real Estate | Contact | Contact | Product Research | 87.0% | Yes |
| https://www.turnerconstruction.com/ | Construction | General Information | General Information | — | 71.0% | Yes |
| https://www.turnerconstruction.com/projects | Construction | Product Research | Product Research | Contact | 98.0% | Yes |
| https://www.turnerconstruction.com/contact | Construction | Contact | Contact | Product Research | 99.0% | Yes |
| https://www.kiewit.com/ | Construction | General Information | Product Research | Contact | 99.0% | No |
| https://www.kiewit.com/projects/ | Construction | Product Research | Product Research | Contact | 95.0% | Yes |
| https://www.lennar.com/ | Construction | General Information | General Information | — | 71.0% | Yes |
| https://www.lennar.com/homes | Construction | Product Research | Contact | Product Research | 84.0% | No |
| https://www.bechtel.com/ | Construction | General Information | Product Research | Contact | 98.0% | No |
| https://www.bechtel.com/projects/ | Construction | Product Research | Product Research | — | 91.0% | Yes |
| https://www.aecom.com/ | Construction | General Information | Product Research | Contact | 94.0% | No |
| https://www.aecom.com/what-we-do/ | Construction | Product Research | Product Research | Careers | 94.0% | Yes |
| https://www.fluor.com/ | Construction | General Information | Product Research | Contact | 99.0% | No |
| https://www.fluor.com/projects | Construction | Product Research | Product Research | Careers | 99.0% | Yes |
| https://www.ferguson.com/ | Construction | General Information | General Information | — | 71.0% | Yes |
| https://www.ferguson.com/products | Construction | Product Research | Product Research | — | 91.0% | Yes |
| https://www.ferguson.com/contact-us | Construction | Contact | Contact | — | 91.0% | Yes |
| https://www.toyota.com/ | Automotive | General Information | General Information | — | 71.0% | Yes |
| https://www.toyota.com/prius | Automotive | Product Research | Product Research | Support | 99.0% | Yes |
| https://www.ford.com/ | Automotive | General Information | General Information | Product Research | 82.0% | Yes |
| https://www.ford.com/cars/mustang/ | Automotive | Product Research | Product Research | Pricing | 99.0% | Yes |
| https://www.honda.com/ | Automotive | General Information | General Information | — | 71.0% | Yes |
| https://www.honda.com/cars | Automotive | Product Research | Product Research | — | 91.0% | Yes |
| https://www.tesla.com/ | Automotive | General Information | General Information | Support | 89.0% | Yes |
| https://www.tesla.com/models | Automotive | Product Research | Product Research | General Information | 69.0% | Yes |
| https://www.chevrolet.com/ | Automotive | General Information | General Information | Pricing | 93.0% | Yes |
| https://www.chevrolet.com/cars | Automotive | Product Research | Product Research | — | 91.0% | Yes |
| https://www.bmw.com/en/index.html | Automotive | General Information | General Information | — | 71.0% | Yes |
| https://www.bmw.com/en/all-models.html | Automotive | Product Research | Product Research | — | 91.0% | Yes |
| https://www.volkswagen.com/en.html | Automotive | General Information | General Information | — | 71.0% | Yes |
| https://www.volkswagen.com/en/models.html | Automotive | Product Research | Product Research | — | 91.0% | Yes |
| https://www.nissanusa.com/ | Automotive | General Information | General Information | Product Research | 93.0% | Yes |
| https://www.nissanusa.com/vehicles | Automotive | Product Research | Product Research | — | 91.0% | Yes |
| https://www.acehardware.com/ | Local Businesses | General Information | Support | General Information | 81.0% | No |
| https://www.acehardware.com/departments | Local Businesses | Product Research | Product Research | Support | 98.0% | Yes |
| https://www.lowes.com/ | Local Businesses | General Information | General Information | Product Research | 86.0% | Yes |
| https://www.lowes.com/pl/Tools/4294521464 | Local Businesses | Product Research | Product Research | General Information | 69.0% | Yes |
| https://www.oreillyauto.com/ | Local Businesses | General Information | General Information | Product Research | 98.0% | Yes |
| https://www.oreillyauto.com/store | Local Businesses | Product Research | Product Research | — | 91.0% | Yes |
| https://www.ferguson.com/ | Local Businesses | General Information | General Information | Support | 89.0% | Yes |
| https://www.ferguson.com/products | Local Businesses | Product Research | Product Research | — | 91.0% | Yes |
| https://www.kohls.com/ | Local Businesses | General Information | General Information | Support | 89.0% | Yes |
| https://www.kohls.com/catalog/womens.jsp | Local Businesses | Product Research | Product Research | — | 91.0% | Yes |
| https://www.belk.com/ | Local Businesses | General Information | General Information | — | 71.0% | Yes |
| https://www.belk.com/collections | Local Businesses | Product Research | Product Research | — | 91.0% | Yes |
| https://www.homedepot.com/ | Local Businesses | General Information | General Information | Support | 73.0% | Yes |
| https://www.homedepot.com/b/Tools/N-5yc1vZc1j0 | Local Businesses | Product Research | Product Research | Support | 88.0% | Yes |
| https://www.homedepot.com/c/Customer_Service | Local Businesses | Support | Support | Product Research | 88.0% | Yes |
| https://www.homedepot.com/c/Store_Locator | Local Businesses | Contact | Contact | — | 91.0% | Yes |
| https://www.redcross.org/ | Nonprofits | General Information | General Information | Buying | 99.0% | Yes |
| https://www.redcross.org/about-us | Nonprofits | General Information | General Information | — | 91.0% | Yes |
| https://www.redcross.org/donate | Nonprofits | Buying | Buying | General Information | 92.0% | Yes |
| https://www.unicef.org/ | Nonprofits | General Information | General Information | Buying | 99.0% | Yes |
| https://www.unicef.org/appeal | Nonprofits | Buying | Buying | General Information | 99.0% | Yes |
| https://www.worldwildlife.org/ | Nonprofits | General Information | General Information | Buying | 99.0% | Yes |
| https://www.worldwildlife.org/ways-to-help | Nonprofits | Buying | Buying | General Information | 99.0% | Yes |
| https://www.amnesty.org/en/ | Nonprofits | General Information | General Information | Buying | 95.0% | Yes |
| https://www.amnesty.org/en/take-action/ | Nonprofits | Buying | Buying | General Information | 98.0% | Yes |
| https://www.habitat.org/ | Nonprofits | General Information | General Information | Buying | 95.0% | Yes |
| https://www.habitat.org/ways-to-help | Nonprofits | Buying | Buying | Support | 85.0% | Yes |
| https://www.feedingamerica.org/ | Nonprofits | General Information | General Information | — | 71.0% | Yes |
| https://www.feedingamerica.org/how-to-help | Nonprofits | Buying | Buying | General Information | 99.0% | Yes |
| https://www.nationalgeographic.org/ | Nonprofits | General Information | General Information | Buying | 95.0% | Yes |
| https://www.nationalgeographic.org/education/ | Nonprofits | Product Research | Product Research | General Information | 98.0% | Yes |
| https://www.nationalgeographic.org/contact-us/ | Nonprofits | Contact | Contact | Buying | 99.0% | Yes |
| https://careers.microsoft.com/us/en | Careers | Careers | Careers | — | 91.0% | Yes |
| https://careers.google.com/ | Careers | Careers | Careers | General Information | 91.0% | Yes |
| https://www.ibm.com/careers | Careers | Careers | Careers | — | 91.0% | Yes |
| https://www.salesforce.com/company/careers/ | Careers | Careers | Careers | General Information | 95.0% | Yes |
| https://www.adobe.com/careers.html | Careers | Careers | Careers | — | 91.0% | Yes |
| https://www.costco.com/ | Ecommerce | Product Research | Product Research | Pricing | 84.0% | Yes |
| https://www.walmart.com/ | Ecommerce | Product Research | Product Research | General Information | 87.0% | Yes |
| https://www.bestbuy.com/site/computers-pcs/3000000 | Ecommerce | Product Research | Product Research | Support | 99.0% | Yes |
| https://www.target.com/c/clearance/-/N-5xt1a | Ecommerce | Product Research | Product Research | — | 91.0% | Yes |
| https://www.nike.com/w/new-releases-3n82y | Ecommerce | Product Research | Product Research | — | 91.0% | Yes |
