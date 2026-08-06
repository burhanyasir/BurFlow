# Top 20 Failures — Sales Conversion Benchmark

## Summary
- Total failures observed in the current export: 49
- Top failure category counts:
  - `wrong_cta`: 49
  - `wrong_next_best_action`: 49
  - `incorrect_qualification_timing`: 29
  - `weak_personalization`: 24
  - `incorrect_booking_timing`: 5

## Affected benchmark
Sales Conversion Evaluation Benchmark (latest failure export from `engine/packages/conversation-orchestrator/tmp-failing-cases.json`).

## Function impact mapping
- `wrong_cta`: likely `decideAction()`
- `wrong_next_best_action`: likely `decideAction()`
- `incorrect_qualification_timing`: likely `classifyFunnelStage()` and `decideAction()`
- `weak_personalization`: likely `extractSalesPlaybookSignals()` and `decideAction()`
- `incorrect_booking_timing`: likely `decideAction()`

## Top 20 failure cases

1. **https://www.hubspot.com/crm — SaaS / product / consideration**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `no qualification prompt but got none`
   - Likely function: `decideAction()`

2. **https://www.atlassian.com/software/confluence — SaaS / product / awareness**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`, `weak_personalization`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `ask_qualification but got none`
   - Likely functions: `classifyFunnelStage()`, `decideAction()`

3. **https://www.bestbuy.com/ — E-commerce / home / awareness**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`, `weak_personalization`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `ask_qualification but got none`
   - Likely functions: `classifyFunnelStage()`, `decideAction()`

4. **https://www.nike.com/w/new-releases-3n82y — E-commerce / product / consideration**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`, `weak_personalization`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `no qualification prompt but got none`
   - Likely functions: `decideAction()`, `extractSalesPlaybookSignals()`

5. **https://www.amazon.com/ — E-commerce / home / awareness**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`, `weak_personalization`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `ask_qualification but got none`
   - Likely functions: `classifyFunnelStage()`, `decideAction()`

6. **https://www.walmart.com/cp/customer-service/1235 — E-commerce / support / consideration**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_booking_timing`, `weak_personalization`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `start-free-trial`; actual: `compare-plans`
   - Qualification: `no qualification prompt but got none`
   - Likely functions: `decideAction()`, `extractSalesPlaybookSignals()`

7. **https://www.kaiserpermanente.org/health-wellness — Healthcare / product / consideration**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `no qualification prompt but got none`
   - Likely function: `decideAction()`

8. **https://www.airbnb.com/ — Hotels / home / awareness**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`, `weak_personalization`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `ask_qualification but got none`
   - Likely functions: `classifyFunnelStage()`, `decideAction()`

9. **https://www.zillow.com/homes/for_sale/ — Real Estate / product / awareness**
   - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`
   - Expected next step: `continue_education`; actual: `review_pricing`
   - Expected CTA: `contact-sales`; actual: `compare-plans`
   - Qualification: `ask_qualification but got none`
   - Likely functions: `classifyFunnelStage()`, `decideAction()`

10. **https://www.accenture.com/us-en/services/consulting/technology — Professional services / product / consideration**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `no qualification prompt but got none`
    - Likely function: `decideAction()`

11. **https://www.deloitte.com/us/en/pages/consulting/solutions.html — Professional services / product / consideration**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `ask_qualification but got none`
    - Likely functions: `classifyFunnelStage()`, `decideAction()`

12. **https://www.mcdonalds.com/us/en-us.html — Restaurants / home / awareness**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`, `weak_personalization`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `ask_qualification but got none`
    - Likely functions: `classifyFunnelStage()`, `decideAction()`

13. **https://www.target.com/ — E-commerce / home / awareness**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`, `weak_personalization`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `ask_qualification but got none`
    - Likely functions: `classifyFunnelStage()`, `decideAction()`

14. **https://www.oracle.com/cloud/ — SaaS / product / consideration**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `weak_personalization`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `no qualification prompt but got none`
    - Likely functions: `decideAction()`, `extractSalesPlaybookSignals()`

15. **https://www.microsoft.com/en-us/microsoft-365 — SaaS / product / awareness**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `ask_qualification but got none`
    - Likely functions: `classifyFunnelStage()`, `decideAction()`

16. **https://www.salesforce.com/editions-pricing/ — SaaS / pricing / decision**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`
    - Expected next step: `recommend_trial`; actual: `review_pricing`
    - Expected CTA: `compare-plans`; actual: `compare-plans`
    - Qualification: `ask_qualification but got none`
    - Likely functions: `classifyFunnelStage()`, `decideAction()`

17. **https://www.shopify.com/pricing — E-commerce / pricing / decision**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `weak_personalization`
    - Expected next step: `review_pricing`; actual: `review_pricing`
    - Expected CTA: `request-quote`; actual: `compare-plans`
    - Qualification: `no qualification prompt but got none`
    - Likely function: `decideAction()`

18. **https://www.apple.com/business/ — Technology / product / awareness**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`, `weak_personalization`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `ask_qualification but got none`
    - Likely functions: `classifyFunnelStage()`, `decideAction()`

19. **https://www.ibm.com/cloud/ — Technology / product / consideration**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `weak_personalization`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `no qualification prompt but got none`
    - Likely function: `decideAction()`

20. **https://www.salesforce.com/solutions/small-business/ — SaaS / product / consideration**
    - Failure categories: `wrong_cta`, `wrong_next_best_action`, `incorrect_qualification_timing`
    - Expected next step: `continue_education`; actual: `review_pricing`
    - Expected CTA: `contact-sales`; actual: `compare-plans`
    - Qualification: `ask_qualification but got none`
    - Likely functions: `classifyFunnelStage()`, `decideAction()`

## Key failure patterns
- Most failures are misclassified too early as `review_pricing` instead of `continue_education`.
- CTA mismatches are overwhelmingly `compare-plans` vs `contact-sales` or `start-free-trial`.
- Qualification timing failures cluster around missed `ask_qualification` expectations.
- Personalization gaps contribute to plan/CTA selection mismatches in high-value or industry-specific cases.
