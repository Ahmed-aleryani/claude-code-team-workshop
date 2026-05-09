Create an agent team called ship-squad to QA my app
before I deploy. It's running at http://localhost:3000.
Spawn three teammates:
  – release-captain: orchestrates and produces the final report
  – changelog-writer: drafts release notes from git log
  – deploy-checker: hits every route, checks console errors,
    flags broken images and 404s
Each teammate uses Sonnet. Return one consolidated report.
