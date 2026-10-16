# GitHub Pages deployment / GitHub Pages 部署

Current preview design is **read-only and entirely static**.

## 1. One-time GitHub settings / 一次性启用

1. Open [repository Pages settings](https://github.com/thoth-quest/hike-planner-skill/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**. Saving this setting may be necessary before the first deployment.
3. Check [Actions](https://github.com/thoth-quest/hike-planner-skill/actions/workflows/pages.yml) for the **Deploy hiking plan previews** workflow. Run it with **Run workflow** if a push did not trigger it.
4. When deployment reports success, GitHub Pages should provide a URL like:
   - Directory: `https://thoth-quest.github.io/hike-planner-skill/`
   - Individual plan: `https://thoth-quest.github.io/hike-planner-skill/plan.html?id=oyama-demo`

**A successful workflow is insufficient: verify the catalogue, detail page, JSON and JS content against the deployed commit.**

## 2. No build / 无构建流程

`.github/workflows/pages.yml` uploads `site/` directly using GitHub's Pages actions. There is no Python, React build, static HTML generation, server or weather API. HTML and JavaScript use `fetch()` to read JSON.

## 3. One file for each plan / 一份计划一个文件

```text
site/
  index.html                     # Catalogue
  plan.html                      # One shared plan viewer
  assets/app.js                  # Display only
  plans/
    index.json                   # List of IDs only
    oyama-demo/activity.json     # Plan A
    kintoki-demo/activity.json   # Plan B
    <new-slug>/activity.json     # Plan C
```

To add a plan:

```sh
node scripts/plans.mjs add 2026-11-my-hike "My hike"
```

Or create a folder and JSON manually, then add the slug to `site/plans/index.json`. Edit any individual plan without touching other plans. A push to `main` republishes the static files. The same plan's share link remains stable if its ID does not change.

**Important:** anything in `site/plans/` becomes public when Pages is enabled. For private user plans use an independent local file/workspace, and deliberately publish a sanitized copy. Don't insert personal names, phone numbers, home addresses or sensitive travel details.

## 4. Weather / 天气更新归 Skill

The page displays only `weather` fields already present in `activity.json`. It does **not** call weather services, run timers, or update data. The Skill checks official forecasts, writes a new referenced snapshot, increments the revision and commits the corresponding JSON. After redeployment, reloading the page displays the new snapshot. Browser cache/CDN propagation may delay visibility.

## 5. Troubleshooting

- **404 / "There isn't a GitHub Pages site here":** verify Pages source is **GitHub Actions** and the workflow deployment is successful.
- **Workflow fails in Configure Pages:** set the GitHub Pages source to **GitHub Actions** in repo Settings and rerun.
- **Missing plan:** ensure slug is valid and registered in `site/plans/index.json`, and `id` in its JSON matches the folder.
- **Outdated plan:** check the most recent workflow run and page refresh; remember weather changes only after the Skill writes a new JSON.
- **Local file opens but plan fails to load:** browsers generally restrict `fetch()` with `file://`. Use GitHub Pages or any local static HTTP server; this is not an HTML generator.

GitHub official docs: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Publication conflict / 发布冲突

If the homepage is a Jekyll-rendered README while `plan.html` is 404, a branch-based Pages build may be replacing the Actions artifact. The workflow checks `build_type` and attempts to set `workflow` using its existing Pages permission. If GitHub denies this, an administrator must select **GitHub Actions** in Settings → Pages; no new token or elevated permission is requested by the application.

`node scripts/verify-pages.mjs` with `PAGE_URL` set compares deployed files byte-for-byte against the checkout. HTTP 200 alone is not success. `BASE_URL=https://…/ npm run test:browser` runs the same desktop/mobile interaction suite against a published site. Browser screenshots are retained in the `browser-checks` workflow artifact.
