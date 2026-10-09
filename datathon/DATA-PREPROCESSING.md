# Datathon data preparation

This document describes the reproducible preparation used by
`datathon/solution.py`. The supplied competition data remains local under
`datathon/data/` and is ignored by Git.

## Task 1 labels

Training deliveries are joined to route legs using `(route_id,
seq_in_route) = (route_id, seq)`. Outlet metadata is joined by `outlet_id`.

For each matched delivery:

- service time is `leave_outlet_time - max(actual_arrival_time,
  window_open_time)`;
- an arrival is late when `actual_arrival_time > window_close_time`;
- service labels are clipped to at least one minute;
- rows without a route leg are excluded from supervised training because they
  have no observed arrival and handling outcome.

The feature set uses only information available before the delivery occurs:
brand, district, depot, product temperature, vehicle type and temperature,
outlet access, order size, route sequence, distance, planned travel time,
planned departure/arrival, delivery window, monsoon and day-of-week features.

Actual arrival, actual travel and leave-outlet timestamps are never used as
features.

Validation is chronological: the earliest 80% of dates train the models and
the latest 20% are held out. The service model is a histogram gradient
boosting regressor. The late model is a histogram gradient boosting
classifier, and its probability output is clipped to `[0, 1]`.

## Task 2A preparation

Every training order is counted once, including deferred and not-run orders,
because the brief defines them as demand. Orders are grouped by depot, brand,
ISO year and ISO week. Chilled volume is the order volume for Fresh chilled
orders and zero for Style and Tech.

The baseline forecast combines the historical mean for the same ISO week with
the recent eight-week mean:

```text
forecast = 0.65 × same-ISO-week mean + 0.35 × recent-eight-week mean
```

This is deliberately transparent for the first submission baseline and does
not use future observations.

## Task 2B preparation and policy

The peak-day allocator:

1. removes vehicles marked `in_workshop`;
2. prioritizes orders deferred yesterday, then days since last served, chilled
   orders and larger volume;
3. filters vehicles by depot, temperature and van-only access;
4. packs orders into same-brand, same-district trips;
5. checks weight, volume, two-trip, Fresh 270-minute and Style/Tech
   480-minute budgets, delivery windows, mall windows and fuel quotas;
6. marks orders without a feasible remaining slot as deferred.

Task 2B output is validated against the supplied feasibility checker before it
is considered complete.
