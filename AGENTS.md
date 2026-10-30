# Screen loading UI

- For every new screen or data-backed section, show the shared `Skeleton` and `SkeletonStatus` components while its initial content is loading. Shape placeholders to match the content's layout so the page does not jump when data arrives.
- Keep placeholder shapes hidden from assistive technology and give each loading region a concise Korean status label. The shared skeleton already respects `prefers-reduced-motion`.
- When refreshing content that is already visible, keep the current content on screen and use a local loading indicator unless the content has been cleared or is no longer valid.
- For form submissions and short user actions, keep the form visible and show progress on the relevant control. Do not replace an editable form with a page skeleton.
