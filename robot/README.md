# FaceTag Robot Framework suites

Acceptance tests for FaceTag using [Robot Framework](https://github.com/robotframework/robotframework#usage).

## Suites

| Suite | What it covers |
| --- | --- |
| `suites/01_logic.robot` | Username, profile merge, onboarding routes, local face signatures, Node unit tests |
| `suites/02_build.robot` | `npm test`, typecheck, lint, package scripts |
| `suites/03_api_live.robot` | Deployed API health + auth gates on `https://face-code-pink.vercel.app` |
| `suites/04_api_local.robot` | Full enroll / profile / scan flows against `robot/tools/mock_api.mjs` |
| `suites/05_web.robot` | Static web export served locally, Selenium headless Chrome |

## Run

```bash
python3 -m pip install -r robot/requirements.txt
npm run export:web   # once, for the web suite
npm run test:robot
```

Reports land in `results/` (`report.html`, `log.html`, `output.xml`).

Override the live API base with `LIVE_API=https://your-deployment.vercel.app`.
