# Proactive recommendations

Kâşif can show returning, authenticated users newly approved catalog tools that
match their previous work.

The first layer is intentionally conservative:

- only completed jobs or explicitly selected packs become recommendation themes;
- a tool must have been added after the source interaction;
- tools already selected or returned in that interaction are excluded;
- low-confidence lexical matches are suppressed;
- dismissed suggestions are not shown again;
- every event is checked against an interaction owned by the authenticated user.

`kasif_interactions.user_id` is populated only on new authenticated requests.
Anonymous interactions remain anonymous and are never guessed or reassigned.
Recommendation history and delivery events are read through server-only clients;
the underlying tables remain unavailable to browser roles.

This phase surfaces suggestions when the user returns to the Kâşif page. Email,
push, and notification-center delivery require separate consent, frequency caps,
and lifecycle policies before activation.
