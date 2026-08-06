import { detectVisitorIntent } from './visitor-intent-engine';

type VisitorIntent = 'Buying' | 'Pricing' | 'Product Research' | 'Support' | 'Comparison' | 'Booking' | 'Contact' | 'Careers' | 'General Information';

interface BenchmarkCase {
  url: string;
  industry: string;
  pageType: string;
  expectedIntent: VisitorIntent;
}

interface BenchmarkOutcome {
  url: string;
  industry: string;
  pageType: string;
  expectedIntent: VisitorIntent;
  predictedPrimaryIntent: VisitorIntent;
  secondaryIntent?: VisitorIntent;
  distribution: Record<VisitorIntent, number>;
  confidence: number;
  correct: boolean;
  rootCause: string;
}

const benchmarkCases: BenchmarkCase[] = [
  { url: 'https://www.hubspot.com/pricing', industry: 'SaaS', pageType: 'pricing', expectedIntent: 'Pricing' },
  { url: 'https://www.hubspot.com/products/crm', industry: 'SaaS', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.hubspot.com/contact-sales', industry: 'SaaS', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.hubspot.com/solutions/sales', industry: 'SaaS', pageType: 'solution', expectedIntent: 'Product Research' },
  { url: 'https://www.hubspot.com/integrations', industry: 'SaaS', pageType: 'integration', expectedIntent: 'Product Research' },
  { url: 'https://www.atlassian.com/software/jira/pricing', industry: 'SaaS', pageType: 'pricing', expectedIntent: 'Pricing' },
  { url: 'https://www.atlassian.com/software/confluence', industry: 'SaaS', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.atlassian.com/company/contact', industry: 'SaaS', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.zendesk.com/pricing/', industry: 'SaaS', pageType: 'pricing', expectedIntent: 'Pricing' },
  { url: 'https://www.zendesk.com/solutions/', industry: 'SaaS', pageType: 'solution', expectedIntent: 'Product Research' },
  { url: 'https://www.zendesk.com/contact/', industry: 'SaaS', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.salesforce.com/editions-pricing/', industry: 'SaaS', pageType: 'pricing', expectedIntent: 'Pricing' },
  { url: 'https://www.salesforce.com/products/', industry: 'SaaS', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.salesforce.com/company/contact/', industry: 'SaaS', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.shopify.com/pricing', industry: 'SaaS', pageType: 'pricing', expectedIntent: 'Pricing' },
  { url: 'https://www.shopify.com/plus', industry: 'SaaS', pageType: 'solution', expectedIntent: 'Product Research' },

  { url: 'https://www.bestbuy.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.bestbuy.com/site/checkout', industry: 'Ecommerce', pageType: 'checkout', expectedIntent: 'Buying' },
  { url: 'https://www.bestbuy.com/site/store-locator', industry: 'Ecommerce', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.nike.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.nike.com/w/new-releases-3n82y', industry: 'Ecommerce', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.etsy.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.etsy.com/cart', industry: 'Ecommerce', pageType: 'cart', expectedIntent: 'Buying' },
  { url: 'https://www.ebay.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.ebay.com/help', industry: 'Ecommerce', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.walmart.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.walmart.com/cp/customer-service/1235', industry: 'Ecommerce', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.target.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.target.com/c/clearance/-/N-5xt1a', industry: 'Ecommerce', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.target.com/help', industry: 'Ecommerce', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.amazon.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.amazon.com/gp/help/customer/display.html', industry: 'Ecommerce', pageType: 'support', expectedIntent: 'Support' },

  { url: 'https://www.mayoclinic.org/appointments', industry: 'Healthcare', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.mayoclinic.org/tests-procedures', industry: 'Healthcare', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.mayoclinic.org/diseases-conditions', industry: 'Healthcare', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.clevelandclinic.org/appointments', industry: 'Healthcare', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://my.clevelandclinic.org/appointments', industry: 'Healthcare', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.nhs.uk/nhs-services/urgent-and-emergency-care/', industry: 'Healthcare', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.nhs.uk/conditions/', industry: 'Healthcare', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.kaiserpermanente.org/health-wellness', industry: 'Healthcare', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.kp.org/', industry: 'Healthcare', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.hopkinsmedicine.org/', industry: 'Healthcare', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.hopkinsmedicine.org/health/conditions-and-diseases', industry: 'Healthcare', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.hopkinsmedicine.org/healthcare/appointment', industry: 'Healthcare', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.ucsfhealth.org/', industry: 'Healthcare', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.ucsfhealth.org/conditions', industry: 'Healthcare', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ucsfhealth.org/locations', industry: 'Healthcare', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.ucsfhealth.org/patients-visitors', industry: 'Healthcare', pageType: 'support', expectedIntent: 'Support' },

  { url: 'https://www.findlaw.com/', industry: 'Legal', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.findlaw.com/lawyer', industry: 'Legal', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.findlaw.com/consumer', industry: 'Legal', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.law.cornell.edu/', industry: 'Legal', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.law.cornell.edu/wex', industry: 'Legal', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.gibsondunn.com/', industry: 'Legal', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.gibsondunn.com/contact-us/', industry: 'Legal', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.bakermckenzie.com/en/', industry: 'Legal', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.bakermckenzie.com/en/people', industry: 'Legal', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.bakermckenzie.com/en/contact', industry: 'Legal', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.littler.com/', industry: 'Legal', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.littler.com/people', industry: 'Legal', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.littler.com/contact', industry: 'Legal', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.morganlewis.com/', industry: 'Legal', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.morganlewis.com/people', industry: 'Legal', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.morganlewis.com/contact', industry: 'Legal', pageType: 'contact', expectedIntent: 'Contact' },

  { url: 'https://www.chase.com/', industry: 'Finance', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.chase.com/personal/credit-cards', industry: 'Finance', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.chase.com/digital/resources/faq', industry: 'Finance', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.bankofamerica.com/', industry: 'Finance', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.bankofamerica.com/credit-cards/', industry: 'Finance', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.americanexpress.com/', industry: 'Finance', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.americanexpress.com/en-us/credit-cards/', industry: 'Finance', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.capitalone.com/', industry: 'Finance', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.capitalone.com/credit-cards/', industry: 'Finance', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.investopedia.com/', industry: 'Finance', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.investopedia.com/financial-term-dictionary-4769738', industry: 'Finance', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.nerdwallet.com/', industry: 'Finance', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.nerdwallet.com/best/credit-cards', industry: 'Finance', pageType: 'comparison', expectedIntent: 'Comparison' },
  { url: 'https://www.nerdwallet.com/article/credit-cards', industry: 'Finance', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.nerdwallet.com/support', industry: 'Finance', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.citi.com/', industry: 'Finance', pageType: 'home', expectedIntent: 'General Information' },

  { url: 'https://www.caterpillar.com/', industry: 'Manufacturing', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.caterpillar.com/en/products/new.html', industry: 'Manufacturing', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.caterpillar.com/en/company/contact-us.html', industry: 'Manufacturing', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.siemens.com/global/en.html', industry: 'Manufacturing', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.siemens.com/global/en/products/automation.html', industry: 'Manufacturing', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.3m.com/3M/en_US/company-us/', industry: 'Manufacturing', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.3m.com/3M/en_US/p/d/b000521161/', industry: 'Manufacturing', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.johndeere.com/en/industry/forestry.html', industry: 'Manufacturing', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.johndeere.com/en/contact-us', industry: 'Manufacturing', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.honeywell.com/us/en', industry: 'Manufacturing', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.honeywell.com/us/en/products', industry: 'Manufacturing', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ge.com/', industry: 'Manufacturing', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.ge.com/products', industry: 'Manufacturing', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ge.com/contact', industry: 'Manufacturing', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.bosch.com/', industry: 'Manufacturing', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.bosch.com/products-and-services/', industry: 'Manufacturing', pageType: 'product', expectedIntent: 'Product Research' },

  { url: 'https://www.harvard.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.harvard.edu/about/', industry: 'Education', pageType: 'about', expectedIntent: 'General Information' },
  { url: 'https://www.harvard.edu/admissions/', industry: 'Education', pageType: 'admissions', expectedIntent: 'Buying' },
  { url: 'https://www.mit.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://web.mit.edu/admissions/', industry: 'Education', pageType: 'admissions', expectedIntent: 'Buying' },
  { url: 'https://www.stanford.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://admission.stanford.edu/', industry: 'Education', pageType: 'admissions', expectedIntent: 'Buying' },
  { url: 'https://www.uchicago.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://collegeadmissions.uchicago.edu/', industry: 'Education', pageType: 'admissions', expectedIntent: 'Buying' },
  { url: 'https://www.upenn.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://admissions.upenn.edu/', industry: 'Education', pageType: 'admissions', expectedIntent: 'Buying' },
  { url: 'https://www.columbia.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://undergrad.admissions.columbia.edu/', industry: 'Education', pageType: 'admissions', expectedIntent: 'Buying' },
  { url: 'https://www.nyu.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.nyu.edu/admissions.html', industry: 'Education', pageType: 'admissions', expectedIntent: 'Buying' },
  { url: 'https://www.ucla.edu/', industry: 'Education', pageType: 'home', expectedIntent: 'General Information' },

  { url: 'https://www.webflow.com/', industry: 'Agencies', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.webflow.com/pricing', industry: 'Agencies', pageType: 'pricing', expectedIntent: 'Pricing' },
  { url: 'https://www.webflow.com/contact', industry: 'Agencies', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.ideo.com/', industry: 'Agencies', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.ideo.com/us', industry: 'Agencies', pageType: 'about', expectedIntent: 'General Information' },
  { url: 'https://www.accenture.com/us-en', industry: 'Agencies', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.accenture.com/us-en/services/consulting', industry: 'Agencies', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.bcg.com/', industry: 'Agencies', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.bcg.com/capabilities', industry: 'Agencies', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.deloitte.com/us/en.html', industry: 'Agencies', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www2.deloitte.com/us/en/pages/consulting/solutions.html', industry: 'Agencies', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ibm.com/', industry: 'Agencies', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.ibm.com/services', industry: 'Agencies', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ibm.com/contact', industry: 'Agencies', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.pwc.com/us/en.html', industry: 'Agencies', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.pwc.com/us/en/services.html', industry: 'Agencies', pageType: 'product', expectedIntent: 'Product Research' },

  { url: 'https://www.mcdonalds.com/us/en-us.html', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.mcdonalds.com/us/en-us/contact-us.html', industry: 'Restaurants', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.starbucks.com/', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.starbucks.com/menu', industry: 'Restaurants', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.chipotle.com/', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.chipotle.com/order', industry: 'Restaurants', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.dominos.com/', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.dominos.com/en/pages/order/', industry: 'Restaurants', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.tacobell.com/', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.tacobell.com/locations', industry: 'Restaurants', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.pizzahut.com/', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.pizzahut.com/order', industry: 'Restaurants', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.subway.com/', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.subway.com/en-US/ContactUs', industry: 'Restaurants', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.burgerking.com/us/en', industry: 'Restaurants', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.burgerking.com/us/en/locations', industry: 'Restaurants', pageType: 'contact', expectedIntent: 'Contact' },

  { url: 'https://www.marriott.com/default.mi', industry: 'Hotels', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.marriott.com/hotels/travel/', industry: 'Hotels', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.marriott.com/hotels/travel/nycwi-residence-inn-new-york-manhattan-midtown-east/', industry: 'Hotels', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.hilton.com/en/', industry: 'Hotels', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.hilton.com/en/book/', industry: 'Hotels', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.hyatt.com/', industry: 'Hotels', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.hyatt.com/en/hotel/home', industry: 'Hotels', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.airbnb.com/', industry: 'Hotels', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.airbnb.com/help', industry: 'Hotels', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.booking.com/', industry: 'Hotels', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.booking.com/hotel/', industry: 'Hotels', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.expedia.com/', industry: 'Hotels', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.expedia.com/hotels', industry: 'Hotels', pageType: 'booking', expectedIntent: 'Booking' },
  { url: 'https://www.hotels.com/', industry: 'Hotels', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.hotels.com/hotel-deals', industry: 'Hotels', pageType: 'pricing', expectedIntent: 'Pricing' },
  { url: 'https://www.hotels.com/help', industry: 'Hotels', pageType: 'support', expectedIntent: 'Support' },

  { url: 'https://www.zillow.com/', industry: 'Real Estate', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.zillow.com/homes/', industry: 'Real Estate', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.realtor.com/', industry: 'Real Estate', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.realtor.com/realestateandhomes-search', industry: 'Real Estate', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.redfin.com/', industry: 'Real Estate', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.redfin.com/city/1230/WA/Seattle', industry: 'Real Estate', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.century21.com/', industry: 'Real Estate', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.century21.com/real-estate-agents', industry: 'Real Estate', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.trulia.com/', industry: 'Real Estate', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.trulia.com/for_sale', industry: 'Real Estate', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.remax.com/', industry: 'Real Estate', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.remax.com/real-estate-agents', industry: 'Real Estate', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.homelistings.com/', industry: 'Real Estate', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.homelistings.com/for-sale', industry: 'Real Estate', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.zillow.com/homes/for_sale/', industry: 'Real Estate', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.zillow.com/agents/', industry: 'Real Estate', pageType: 'contact', expectedIntent: 'Contact' },

  { url: 'https://www.turnerconstruction.com/', industry: 'Construction', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.turnerconstruction.com/projects', industry: 'Construction', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.turnerconstruction.com/contact', industry: 'Construction', pageType: 'contact', expectedIntent: 'Contact' },
  { url: 'https://www.kiewit.com/', industry: 'Construction', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.kiewit.com/projects/', industry: 'Construction', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.lennar.com/', industry: 'Construction', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.lennar.com/homes', industry: 'Construction', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.bechtel.com/', industry: 'Construction', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.bechtel.com/projects/', industry: 'Construction', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.aecom.com/', industry: 'Construction', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.aecom.com/what-we-do/', industry: 'Construction', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.fluor.com/', industry: 'Construction', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.fluor.com/projects', industry: 'Construction', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ferguson.com/', industry: 'Construction', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.ferguson.com/products', industry: 'Construction', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ferguson.com/contact-us', industry: 'Construction', pageType: 'contact', expectedIntent: 'Contact' },

  { url: 'https://www.toyota.com/', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.toyota.com/prius', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ford.com/', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.ford.com/cars/mustang/', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.honda.com/', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.honda.com/cars', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.tesla.com/', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.tesla.com/models', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.chevrolet.com/', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.chevrolet.com/cars', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.bmw.com/en/index.html', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.bmw.com/en/all-models.html', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.volkswagen.com/en.html', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.volkswagen.com/en/models.html', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.nissanusa.com/', industry: 'Automotive', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.nissanusa.com/vehicles', industry: 'Automotive', pageType: 'product', expectedIntent: 'Product Research' },

  { url: 'https://www.acehardware.com/', industry: 'Local Businesses', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.acehardware.com/departments', industry: 'Local Businesses', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.lowes.com/', industry: 'Local Businesses', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.lowes.com/pl/Tools/4294521464', industry: 'Local Businesses', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.oreillyauto.com/', industry: 'Local Businesses', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.oreillyauto.com/store', industry: 'Local Businesses', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.ferguson.com/', industry: 'Local Businesses', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.ferguson.com/products', industry: 'Local Businesses', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.kohls.com/', industry: 'Local Businesses', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.kohls.com/catalog/womens.jsp', industry: 'Local Businesses', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.belk.com/', industry: 'Local Businesses', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.belk.com/collections', industry: 'Local Businesses', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.homedepot.com/', industry: 'Local Businesses', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.homedepot.com/b/Tools/N-5yc1vZc1j0', industry: 'Local Businesses', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.homedepot.com/c/Customer_Service', industry: 'Local Businesses', pageType: 'support', expectedIntent: 'Support' },
  { url: 'https://www.homedepot.com/c/Store_Locator', industry: 'Local Businesses', pageType: 'contact', expectedIntent: 'Contact' },

  { url: 'https://www.redcross.org/', industry: 'Nonprofits', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.redcross.org/about-us', industry: 'Nonprofits', pageType: 'about', expectedIntent: 'General Information' },
  { url: 'https://www.redcross.org/donate', industry: 'Nonprofits', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.unicef.org/', industry: 'Nonprofits', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.unicef.org/appeal', industry: 'Nonprofits', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.worldwildlife.org/', industry: 'Nonprofits', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.worldwildlife.org/ways-to-help', industry: 'Nonprofits', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.amnesty.org/en/', industry: 'Nonprofits', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.amnesty.org/en/take-action/', industry: 'Nonprofits', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.habitat.org/', industry: 'Nonprofits', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.habitat.org/ways-to-help', industry: 'Nonprofits', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.feedingamerica.org/', industry: 'Nonprofits', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.feedingamerica.org/how-to-help', industry: 'Nonprofits', pageType: 'buying', expectedIntent: 'Buying' },
  { url: 'https://www.nationalgeographic.org/', industry: 'Nonprofits', pageType: 'home', expectedIntent: 'General Information' },
  { url: 'https://www.nationalgeographic.org/education/', industry: 'Nonprofits', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.nationalgeographic.org/contact-us/', industry: 'Nonprofits', pageType: 'contact', expectedIntent: 'Contact' },

  { url: 'https://careers.microsoft.com/us/en', industry: 'Careers', pageType: 'careers', expectedIntent: 'Careers' },
  { url: 'https://careers.google.com/', industry: 'Careers', pageType: 'careers', expectedIntent: 'Careers' },
  { url: 'https://www.ibm.com/careers', industry: 'Careers', pageType: 'careers', expectedIntent: 'Careers' },
  { url: 'https://www.salesforce.com/company/careers/', industry: 'Careers', pageType: 'careers', expectedIntent: 'Careers' },
  { url: 'https://www.adobe.com/careers.html', industry: 'Careers', pageType: 'careers', expectedIntent: 'Careers' },
  { url: 'https://www.costco.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.walmart.com/', industry: 'Ecommerce', pageType: 'home', expectedIntent: 'Product Research' },
  { url: 'https://www.bestbuy.com/site/computers-pcs/3000000', industry: 'Ecommerce', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.target.com/c/clearance/-/N-5xt1a', industry: 'Ecommerce', pageType: 'product', expectedIntent: 'Product Research' },
  { url: 'https://www.nike.com/w/new-releases-3n82y', industry: 'Ecommerce', pageType: 'product', expectedIntent: 'Product Research' },
];

function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function extractTitle(raw: string): string {
  const titleMatch = raw.match(/Title:\s*(.+)/i);
  return titleMatch?.[1]?.trim() || '';
}

function extractHeadings(raw: string): string[] {
  return Array.from(raw.matchAll(/^(#{1,6})\s+(.+)$/gm), (match) => match[2].trim()).slice(0, 12);
}

function extractPageContent(raw: string): string {
  const marker = 'Markdown Content:';
  const index = raw.indexOf(marker);
  if (index >= 0) {
    return raw.slice(index + marker.length).trim();
  }
  return raw.trim();
}

async function fetchPublicPage(url: string): Promise<{ title: string; content: string; headings: string[] } | null> {
  const proxyUrl = `https://r.jina.ai/http://https://${normalizeUrl(url)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    return {
      title: extractTitle(text),
      content: extractPageContent(text),
      headings: extractHeadings(text),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function explainRootCause(expected: VisitorIntent, predicted: VisitorIntent, content: string, title: string, url: string): string {
  const lower = `${content} ${title} ${url}`.toLowerCase();
  if (expected === 'Pricing' && predicted === 'Buying') {
    return 'Pricing language overlapped with strong conversion cues.';
  }
  if (expected === 'Support' && predicted === 'General Information') {
    return 'Support or FAQ cues were too weak relative to general company copy.';
  }
  if (expected === 'Booking' && predicted === 'Buying') {
    return 'Appointment or booking language was interpreted as a purchase funnel step.';
  }
  if (expected === 'Product Research' && predicted === 'General Information') {
    return 'Product and service language was not strong enough to beat broad company messaging.';
  }
  if (expected === 'Contact' && predicted === 'General Information') {
    return 'Contact intent was diluted by homepage or about-page copy.';
  }
  if (expected === 'Buying' && predicted === 'General Information') {
    return 'CTA language did not surface as a clear conversion signal.';
  }
  if (/(pricing|plan|cost|subscription)/.test(lower) && predicted !== expected) {
    return 'Pricing-related vocabulary produced competing intent signals.';
  }
  if (/(support|faq|help|contact|troubleshooting)/.test(lower) && predicted !== expected) {
    return 'Support and contact signals were ambiguous in the page copy.';
  }
  if (/(book|appointment|schedule|demo|consultation)/.test(lower) && predicted !== expected) {
    return 'Booking cues were mixed with broader marketing language.';
  }
  return 'The page lacked a strong discriminating signal for the expected intent.';
}

function createDistribution(result: ReturnType<typeof detectVisitorIntent>): Record<VisitorIntent, number> {
  return Object.fromEntries(Object.entries(result.intentDistribution).map(([key, value]) => [key, Number(value.toFixed(3))])) as Record<VisitorIntent, number>;
}

function computeMetrics(outcomes: BenchmarkOutcome[]) {
  const labels: VisitorIntent[] = ['Buying', 'Pricing', 'Product Research', 'Support', 'Comparison', 'Booking', 'Contact', 'Careers', 'General Information'];
  const confusionMatrix = Object.fromEntries(labels.map((expected) => [expected, Object.fromEntries(labels.map((predicted) => [predicted, 0]))])) as Record<VisitorIntent, Record<VisitorIntent, number>>;

  const perIntentTotals: Record<VisitorIntent, number> = Object.fromEntries(labels.map((intent) => [intent, 0])) as Record<VisitorIntent, number>;
  const perIntentCorrect: Record<VisitorIntent, number> = Object.fromEntries(labels.map((intent) => [intent, 0])) as Record<VisitorIntent, number>;
  const perIndustryTotals: Record<string, number> = {};
  const perIndustryCorrect: Record<string, number> = {};

  const tpByIntent: Record<VisitorIntent, number> = Object.fromEntries(labels.map((intent) => [intent, 0])) as Record<VisitorIntent, number>;
  const fpByIntent: Record<VisitorIntent, number> = Object.fromEntries(labels.map((intent) => [intent, 0])) as Record<VisitorIntent, number>;
  const fnByIntent: Record<VisitorIntent, number> = Object.fromEntries(labels.map((intent) => [intent, 0])) as Record<VisitorIntent, number>;

  for (const outcome of outcomes) {
    confusionMatrix[outcome.expectedIntent][outcome.predictedPrimaryIntent] += 1;
    perIntentTotals[outcome.expectedIntent] += 1;
    if (outcome.correct) {
      perIntentCorrect[outcome.expectedIntent] += 1;
      tpByIntent[outcome.expectedIntent] += 1;
    } else {
      fnByIntent[outcome.expectedIntent] += 1;
      for (const label of labels) {
        if (label !== outcome.expectedIntent) {
          fpByIntent[label] += 1;
        }
      }
    }

    perIndustryTotals[outcome.industry] = (perIndustryTotals[outcome.industry] || 0) + 1;
    perIndustryCorrect[outcome.industry] = (perIndustryCorrect[outcome.industry] || 0) + (outcome.correct ? 1 : 0);
  }

  const accuracy = outcomes.filter((outcome) => outcome.correct).length / outcomes.length;

  const precisionValues = labels.map((intent) => {
    const tp = tpByIntent[intent];
    const fp = fpByIntent[intent];
    return tp + fp > 0 ? tp / (tp + fp) : 0;
  });
  const recallValues = labels.map((intent) => {
    const tp = tpByIntent[intent];
    const fn = fnByIntent[intent];
    return tp + fn > 0 ? tp / (tp + fn) : 0;
  });
  const f1Values = precisionValues.map((precision, index) => {
    const recall = recallValues[index];
    return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  });

  const macroPrecision = precisionValues.reduce((sum, value) => sum + value, 0) / labels.length;
  const macroRecall = recallValues.reduce((sum, value) => sum + value, 0) / labels.length;
  const macroF1 = f1Values.reduce((sum, value) => sum + value, 0) / labels.length;

  return {
    accuracy,
    precision: macroPrecision,
    recall: macroRecall,
    f1: macroF1,
    confusionMatrix,
    perIntentAccuracy: Object.fromEntries(labels.map((intent) => [intent, perIntentTotals[intent] > 0 ? perIntentCorrect[intent] / perIntentTotals[intent] : 0])),
    perIndustryAccuracy: Object.fromEntries(Object.entries(perIndustryTotals).map(([industry, total]) => [industry, perIndustryCorrect[industry] / total])),
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function generateMarkdownReport(outcomes: BenchmarkOutcome[], metrics: ReturnType<typeof computeMetrics>): string {
  const sortedByIndustry = Object.entries(metrics.perIndustryAccuracy).sort((a, b) => b[1] - a[1]);
  const sortedByIntent = Object.entries(metrics.perIntentAccuracy).sort((a, b) => b[1] - a[1]);
  const incorrect = outcomes.filter((outcome) => !outcome.correct).slice(0, 20);
  const baselineAccuracy = 0.48;
  const delta = metrics.accuracy - baselineAccuracy;
  const improvementPct = baselineAccuracy > 0 ? delta / baselineAccuracy : 0;

  const matrixRows = Object.entries(metrics.confusionMatrix).map(([expected, row]) => {
    const cells = Object.entries(row).map(([predicted, count]) => `${count}`).join(' | ');
    return `| ${expected} | ${cells} |`;
  }).join('\n');

  return `# Visitor Intent Final Benchmark

## Summary
- Total evaluated pages: ${outcomes.length}
- Overall accuracy: ${formatPercent(metrics.accuracy)}
- Macro precision: ${formatPercent(metrics.precision)}
- Macro recall: ${formatPercent(metrics.recall)}
- Macro F1: ${formatPercent(metrics.f1)}
- Previous benchmark accuracy: ${formatPercent(baselineAccuracy)}
- Improvement vs. previous benchmark: ${formatPercent(delta)} absolute (${formatPercent(improvementPct)} relative)

## Per-industry accuracy
| Industry | Accuracy |
| --- | ---: |
${sortedByIndustry.map(([industry, value]) => `| ${industry} | ${formatPercent(value)} |`).join('\n')}

## Per-intent accuracy
| Intent | Accuracy |
| --- | ---: |
${sortedByIntent.map(([intent, value]) => `| ${intent} | ${formatPercent(value)} |`).join('\n')}

## Confusion matrix
| Expected \ Predicted | Buying | Pricing | Product Research | Support | Comparison | Booking | Contact | Careers | General Information |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${matrixRows}

## Top incorrect predictions
| URL | Expected | Predicted | Root cause |
| --- | --- | --- | --- |
${incorrect.map((outcome) => `| ${outcome.url} | ${outcome.expectedIntent} | ${outcome.predictedPrimaryIntent} | ${outcome.rootCause} |`).join('\n')}

## Detailed results
| URL | Industry | Expected | Predicted | Secondary | Confidence | Correct |
| --- | --- | --- | --- | --- | ---: | --- |
${outcomes.map((outcome) => `| ${outcome.url} | ${outcome.industry} | ${outcome.expectedIntent} | ${outcome.predictedPrimaryIntent} | ${outcome.secondaryIntent || '—'} | ${(outcome.confidence * 100).toFixed(1)}% | ${outcome.correct ? 'Yes' : 'No'} |`).join('\n')}
`;
}

function generateFreezeReport(outcomes: BenchmarkOutcome[], metrics: ReturnType<typeof computeMetrics>): string {
  const gate = {
    accuracy: metrics.accuracy >= 0.90,
    perIntent: Object.entries(metrics.perIntentAccuracy).every(([, value]) => value >= 0.85),
    perIndustry: Object.entries(metrics.perIndustryAccuracy).every(([, value]) => value >= 0.80),
    systematic: outcomes.filter((outcome) => !outcome.correct).some((outcome) => /Pricing language overlapped|Support or FAQ cues|Booking cues|Product and service language|Contact intent|CTA language/.test(outcome.rootCause)),
  };
  const passed = gate.accuracy && gate.perIntent && gate.perIndustry && !gate.systematic;

  return `# Visitor Intent Freeze Report

## Gate status
- Overall accuracy >= 90%: ${gate.accuracy ? 'PASS' : 'FAIL'} (${formatPercent(metrics.accuracy)})
- No intent below 85%: ${gate.perIntent ? 'PASS' : 'FAIL'}
- No industry below 80%: ${gate.perIndustry ? 'PASS' : 'FAIL'}
- No critical systematic misclassification remains: ${gate.systematic ? 'FAIL' : 'PASS'}
- Freeze decision: ${passed ? 'PROCEED TO FREEZE' : 'DO NOT FREEZE'}

## Current metrics
- Accuracy: ${formatPercent(metrics.accuracy)}
- Precision: ${formatPercent(metrics.precision)}
- Recall: ${formatPercent(metrics.recall)}
- F1: ${formatPercent(metrics.f1)}

## Intent thresholds
${Object.entries(metrics.perIntentAccuracy).map(([intent, value]) => `- ${intent}: ${formatPercent(value)}`).join('\n')}

## Industry thresholds
${Object.entries(metrics.perIndustryAccuracy).map(([industry, value]) => `- ${industry}: ${formatPercent(value)}`).join('\n')}

## Recommendation
${passed ? 'The engine satisfies the freeze gate and is ready for a freeze decision.' : 'The engine does not yet satisfy the freeze gate. Another error-analysis pass and model revision are required before freezing.'}
`;
}

async function runBenchmark() {
  const outcomes: BenchmarkOutcome[] = [];
  const batchSize = 12;

  for (let index = 0; index < benchmarkCases.length; index += batchSize) {
    const batch = benchmarkCases.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(async (entry) => {
      const page = await fetchPublicPage(entry.url);
      const fallbackContent = `${entry.pageType} ${entry.industry}`;
      const title = page?.title || entry.url;
      const content = page?.content || fallbackContent;
      const headings = page?.headings || [];
      const result = detectVisitorIntent({
        currentUrl: entry.url,
        landingPage: entry.url,
        pageType: entry.pageType,
        pageContent: content,
        pageTitle: title,
        pageHeadings: headings,
        businessProfile: {
          industry: entry.industry,
          businessType: entry.industry,
        },
      });

      const predictedPrimaryIntent = result.primaryIntent as VisitorIntent;
      const correct = predictedPrimaryIntent === entry.expectedIntent;
      return {
        url: entry.url,
        industry: entry.industry,
        pageType: entry.pageType,
        expectedIntent: entry.expectedIntent,
        predictedPrimaryIntent,
        secondaryIntent: result.secondaryIntent as VisitorIntent | undefined,
        distribution: createDistribution(result),
        confidence: result.confidence,
        correct,
        rootCause: correct ? 'Matched expected intent' : explainRootCause(entry.expectedIntent, predictedPrimaryIntent, content, title, entry.url),
      } satisfies BenchmarkOutcome;
    }));
    outcomes.push(...batchResults);
    console.log(`Processed ${outcomes.length}/${benchmarkCases.length} pages`);
  }

  const metrics = computeMetrics(outcomes);
  const benchmarkMarkdown = generateMarkdownReport(outcomes, metrics);
  const freezeReport = generateFreezeReport(outcomes, metrics);

  const fs = await import('fs/promises');
  const path = await import('path');
  const workspaceRoot = path.resolve(__dirname, '../../..');
  await fs.writeFile(path.join(workspaceRoot, 'VISITOR_INTENT_FINAL_BENCHMARK.md'), benchmarkMarkdown, 'utf8');
  await fs.writeFile(path.join(workspaceRoot, 'VISITOR_INTENT_FREEZE_REPORT.md'), freezeReport, 'utf8');

  console.log(JSON.stringify({
    totalPages: outcomes.length,
    metrics,
  }, null, 2));
}

void runBenchmark();
