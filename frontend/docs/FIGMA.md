# Getting this into Figma (your own file, your own account)

Nothing here uploads to anyone's artifact or shared space. You are moving your own screens into your own Figma file.

## 1. Tokens, as Figma variables
1. `npm run tokens` writes `design/tokens.json` from `src/styles/tokens.css`.
2. In Figma, install the **Tokens Studio for Figma** plugin. Import `design/tokens.json`. You get a light and a dark set.
3. Apply them as Figma variables/styles, so your frames use the same names as the code.

## 2. Screens, as a head start
1. Deploy the app (README) or run `npm run preview`.
2. Install **html.to.design** in Figma and import your deployed URL, once per screen: it turns a page into editable layers. It works best on the login page and simple screens, and usually needs cleanup. Check its current pricing and limits.
3. Use the Demo tools presets to get each screen into the state you want first (for example the conflict screen, or a deferred order) and import that.

## 3. Screens, rebuilt properly (best for prototyping)
For a clean, clickable prototype, rebuild the key screens by hand using the app as a live reference:
1. In Chrome DevTools use "Capture full size screenshot" for each screen and place it in Figma as a reference layer.
2. Build components once (button, chip, budget bar, route line, ticket card) with variants for each state, then assemble screens with auto layout.
3. Connect frames with Figma's Prototype tab for the flows you present: order, plan, load, deliver, receive, and the offline conflict.

## Tips for the Designathon submission
- The Designathon needs personas, a screen flow with a paragraph per screen, at least one fully designed failure screen, and a prototype link. The deployed app can be one of your prototype links.
- Put the failure-screen rationale next to the conflict screen: why it matters to Waypoint, and how the five-step failure pattern (detect, plain words, safe default, human choice, record it) applies.
