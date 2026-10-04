# How to test, and where

## Automated

```bash
npm test          # 27 tests, under a second
npm run typecheck
npm run build     # catches anything the dev server hides
```

The tests cover the challenge's own worked examples (a Gampaha trip takes 101 minutes, a Colombo trip 112, two Fresh trips use 213 of 270), each feasibility rule, the planner (every order served or deferred exactly once, every trip valid, workshop vehicles never used), publishing, offline sync, sync conflicts and both ways to resolve them, vehicle breakdown, fuel exhaustion, and that a driver's phone only holds that driver's trips.

## Where to test

| What | How |
|---|---|
| Dispatcher and store manager | Chrome on a laptop, window at least 1280 px wide |
| Loader (tablet) | Chrome DevTools > device toolbar > iPad, landscape (1024 x 768) |
| Driver (phone) | DevTools > iPhone 14 (390 x 844), or a real phone: `npm run dev:lan`, then open `http://<your-laptop-ip>:5173` on the same Wi-Fi |
| Two roles at once | Open two windows of the **same** browser (not one incognito and one normal). Sign in as a different role in each. Data syncs between them. |
| No signal, simulated | Demo tools > Simulate no signal. Affects only that window. |
| No signal, real | DevTools > Network > Offline. The app reacts to the browser going offline. |
| Installing and loading offline | `npm run build && npm run preview`, open it once, then set Network to Offline and reload. Installing as an app needs HTTPS, so test that on the deployed site. |

## Scenarios

Reset first with Demo tools > "Before the 4 PM cutoff" unless a step says otherwise.

1. **Happy path.** Follow the walkthrough in the README. Expect every status to move forward for every role, and notifications to arrive for the next person.
2. **Order after the cutoff.** Reset to "Orders closed". As `tharindu` place an order. Expect "Order received for the next run", and the order to appear under the dispatcher's Next run tab.
3. **Change or cancel before 4 PM.** As `tharindu`, place an order, then change its units or cancel it from the same page. Expect the dispatcher's queue to update.
4. **A rule explains itself.** As `kasun` on the planning board, Move a chilled order and look at an ambient truck: expect a plain-words reason such as "need chilled transport, and VEH006 is an ambient vehicle". Try a van-only outlet on a truck, and a trip that mixes districts.
5. **Publishing is guarded.** Before deferring or placing every order, the Publish button is off with the reason. After a rule break (see 11) it is off again.
6. **Deferral and fairness.** Defer an order marked "Skipped yesterday": expect the "second skip in a row" warning. Publish, then sign in as that outlet's manager: expect a deferral notice with the reason. On Deferrals, change a playbook weight and rebuild the suggestion before publishing.
7. **Plan change after publishing.** Reset to "Plan published, loading". As dispatcher, move or defer an order on a trip. Expect the loader's vehicle card to say "Plan changed" with what changed, the driver to see the same banner, and the store to be notified.
8. **Loading shortfall.** Reset to "Plan published, loading". Demo tools > "Loader finds damaged goods". As the dispatcher, Live runs > Decide. As the loader, expect Seal to stay off until it is decided.
9. **Offline delivery.** Reset to "Trucks on the road". As `ruwan`, Simulate no signal, then deliver the next stop with the store's code (the store sees it on its tracker). Expect "Saved on this phone", and the Sync tab to list it. Switch signal on: expect it to send, and the dispatcher to see it.
10. **Offline conflict.** As 9, but before reconnecting, have the dispatcher reschedule that same stop (Demo tools > "Dispatcher defers the driver's next stop"). Reconnect: expect "Two changes clash" with both sides, and two choices. Try both.
11. **Vehicle breakdown.** Reset to "Trucks on the road", then Demo tools > "Break down the driver's truck". Expect stranded stops on the dispatcher's Live runs with a Move button. Assign them to another vehicle and check the store gets a delay notice.
12. **Fuel quota.** Demo tools > "Use up the fuel quota on VEH003". On Fleet and fuel: VEH003 shows very little fuel. If it had trips, the planning board flags them and Publish turns off.
13. **Wrong code, no code.** As the driver, enter a wrong 4-digit code: expect an error. Use "Take a photo instead" as the fallback.
14. **Part delivery and short receipt.** As the driver, reduce the units delivered: expect "part delivery". As the store, count fewer units: expect the issue on the dispatcher's End of day.
15. **Sign in.** Three wrong PINs: expect the locked message. "Remember this device" survives closing the tab.

## Checks worth doing

- Keyboard only: Tab through the login and a modal; focus is visible and Escape closes dialogs.
- Tap targets: loader and driver buttons are 56 px tall.
- Contrast: run a Lighthouse accessibility audit on the dispatcher and driver screens, or check pairs in a contrast checker.
- Reduced motion: turn on "reduce motion" in your OS. The app stops animating.
