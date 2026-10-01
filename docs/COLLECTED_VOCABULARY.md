# Collected GRE vocabulary

The `/gre/#collected` view uses the existing shared `StudyPage` with independent progress (`gre-collected-memory-v1` and `gre-collected-history-v1`). Each card is a singleton with an empty `pair`; no paired memory word is shown. IDs such as `kmf-mirthful` must stay stable to preserve progress.

The initial collection contains all 123 entries in `data/kmf-collected-words-2026-10-01.json`, in its original collection order. That file preserves the raw KMF translations, pronunciations and URLs; the display data uses corrected meanings and original examples. Existing main-deck entries are deliberately retained in this separate collection too.

Bulk drafting and repetitive editorial checks were delegated to the DeepSeek API (`deepseek-flash`) using the `gre-etymology` skill and retrieved Etymonline evidence. A second call checked each draft against the evidence and proposed exact text edits. Final editorial overrides are saved in `data/collected-editorial-corrections.json`; the count and per-card source references are in `data/collected-content-review.json`. A model review is not proof of correctness: uncertain origins remain explicitly qualified.

The three Python scripts under `scripts/` prepare, review, and merge this initial batch. Drafts, retrieved evidence, review responses, and logs remain in the sibling `.collected-build/` directory, allowing interrupted calls to resume. Set `DEEPSEEK_API_KEY` in the process environment; never put a credential in source, logs, or Git. The preparation script also supports `COLLECTED_VOCABULARY_INPUT` for an alternate input file. The review and merge stages require complete matching results before the website data is replaced.

For subsequent collections, preserve existing cards and their IDs, append genuinely new words in collection order, and adapt the merge stage to include every batch; do not run this initial-batch-only merge against a larger live collection. Continue to delegate batch drafting and checks to DeepSeek, then check questionable relationships and examples before publishing. Do not invent a paired memory word, fake etymology, unverified sound changes, or a family relationship based only on matching prefixes. Keep source citations with each explanation.

On xiao-chen.org this is a hash view of the single static /gre page. `/gre/#collected-words` opens its word list. The main deck keeps its existing storage keys and reveal-before-speech behavior. Deploy through the personal website repository’s `deploy.sh` with this repository as `GRE_SOURCE_DIR`.
