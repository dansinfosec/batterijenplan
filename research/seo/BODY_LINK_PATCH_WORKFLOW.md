# Future body-link patch workflow (documented — NOT applied in this release)

Adding internal links to an existing article must never replace the whole body. The safe future
approach patches the EXACT production `Post.body`:

1. Export the exact raw `Post.body` from production (Render dumpdata / ORM), never API body_html.
2. Define small, explicit old->new anchor replacements (a short exact substring -> the same substring
   wrapped in a Markdown/HTML link, matching the body's actual format).
3. Require every `old` anchor to match **exactly once** in the raw body; abort on zero or multiple matches.
4. Show every patch (old, new, match offset) in dry-run.
5. Preserve a pre-patch body SHA-256; after patching, only the intended anchors may differ.
6. Never replace the complete body merely to add links.
7. Detect the body's representation (HTML vs Markdown) and build link syntax accordingly.

Until this exists, `verify_seo_post_reconciliation` BLOCKS full-body manifests, and only
metadata-only (`preserve_body:true`) updates are applied.
