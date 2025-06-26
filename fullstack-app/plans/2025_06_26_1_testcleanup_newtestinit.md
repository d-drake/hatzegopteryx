Next Steps 06-26-25 10:46 AM:
    1. Please move all .png files saved in /frontend/tests/ to ~/tmp/tests/playwright_png/. Then record in CLAUDE.md that all playwright screenshots should be saved in this folder moving forward.
    2. Please move all .md files saved in /frontend/tests/ to ~/tmp/tests/playwright_md/. Then record in CLAUDE.md that all similar markdown notes for playwright should be saved in this folder moving forward. 
    3. Please move all the playwright test.js files you just created and used in /frontend/tests/ to /frontend/tests/playwright/spc-dashboard/, then mention in CLAUDE.md that all playwright tests should be saved in similar fashion moving forward following common theme: save playwright test javascript files in /frontend/tests/playwright/{context_name}/.
    4. Please ask for clarification for above before proceeding.
    5. Currently the main SVG rendered at the Timeline is wider than its div container at narrow Page Widths. Let’s Proceed to test that this SVG is always rendered smaller than its div container by using a test that checks with widths of 800, 1100, 1400, 1700, 2000, 2300.
