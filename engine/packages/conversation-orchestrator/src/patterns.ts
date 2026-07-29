// Canonical pattern definitions — single source of truth
// All modules MUST import from here; no inline regex duplicates allowed.

export const GREETING_PATTERNS = /^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening|good day|yo|sup|heya|nice to meet you)\b/i;

export const FAREWELL_PATTERNS = /\b(bye|goodbye|see you|talk (?:later|to you (?:later|soon|tomorrow))|catch you|take care|have a (?:good|nice)|cya|farewell|adios|(?:good)?night|g ?night|gn)\b/i;

export const SMALL_TALK_PATTERNS = /\b(?:how are you|how('?s| is) (?:it going|everything|things|life|work)|(?:how'?s|how is) your (?:day|week|morning|afternoon)|what('?s| is) (?:up|new|going on)|how do you do|(?:nice|great|lovely|beautiful)\s+(?:weather|day|afternoon)|(?:long time|been a while)|(?:hope you'?re|you doing) (?:well|okay|good)|(?:have a|had a) (?:great|good|nice|lovely) (?:day|weekend|evening)|tell me (?:new|up|going on))\b/i;

export const GRATITUDE_PATTERNS = /^(?:thanks|thank you|thankyou|ty|thx|appreciate)\b|\b(?:that'?s|that is) (?:helpful|great|awesome|perfect|excellent)\b|\b(?:great|awesome|fantastic) (?:answer|response|explanation)\b|\b(?:this is|that is) (?:exactly what|just what) (?:i|we) (?:needed|wanted|were looking)\b|\b(?:makes sense|got it|i see|understood|clear now)\b/i;

export const OBJECTION_PATTERNS = /\b(?:expensive|too (?:high|much|early|expensive)|overpriced|pricey|steep|why pay|hallucinat|make ?up|wrong answers|false info|guessing|security|privacy|train on data|used to train|public models|data leak|safe|competitor|alternative(?!\s*\/)|already (?:use|have)|happy with|current (?:tool|solution|provider|system)|another (?:tool|platform|solution)|(?:already use|happy with)\s+(?:current|our|my)?\s*(?:tool|solution|provider|system)|not interested|not for us|not ready|not now|hard to|difficult|don'?t (?:need|think|know)|not sure|worried|concerned about|waste|not worth|overkill|switching|migrating|moving.*(?:hard|difficult|complex)|implementation|setup|deploy.*(?:time|cost|effort))\b/i;
