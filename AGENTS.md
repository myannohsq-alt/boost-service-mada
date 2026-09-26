<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep one `ServiceForm` for all catalogue orders and use `reaction:<key>` in order notes for reaction routing; this preserves the existing order RPC and lets the server select the correct provider product.
- Treat catalogue pack `unit` as a pricing divisor rather than a universal order minimum; the public minimum is 100 and the backend validates provider limits before charging.
- Only Réactions Vazaha exposes visibility: invisible appends `;visibility:invisible` to `reaction:<key>`; both choices retain the same price for consistent billing.
- Keep Facebook Gasy as one catalogue card with two underlying orderable services; the selected service ID preserves distinct reaction/follower provider routing and server-side pricing.
- Keep the client sidebar navigation in Layout separate from the full admin navigation; clients need exactly five menu actions while admins retain their complete menu.
- Share the login experience between / and /auth; this keeps sign-in, signup, recovery, and post-auth Services navigation consistent without duplicate forms.
- Keep the dark navy/orange palette in global semantic tokens and reuse the shared login on / and /auth; this keeps every page themed consistently.
- Keep home-screen installability manifest-only, without an app-shell service worker; the site requires live network access and preview must not serve stale cached code.
