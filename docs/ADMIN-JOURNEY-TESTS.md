# Admin journey boundary

No admin routes, customer accounts, tenant records, owner dashboard, payment APIs or backend functions are included in this static public repository. Such URLs must return the genuine not-found page, never a public administrative facade.

Admin authorization, MFA, tenant isolation, private storage, financial audits and backup/restore are not certified by public-page tests. Keep those private-service release gates independent.
