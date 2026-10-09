"""Reproducible baseline solution for the Waypoint Datathon.

The script keeps all competition-data reads and generated artifacts inside the
datathon directory. It builds:

* Task 1 service-time regression and late-arrival classification;
* Task 2A a transparent seasonal demand forecast;
* Task 2B a constraint-aware greedy peak-day allocation.

Run from the repository root with: python3 datathon/solution.py
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
GENERAL = DATA / "General Data"
TRAIN = DATA / "Training Data"
TEST = DATA / "Test Data"
TEMPLATES = DATA / "Submission Templates"
OUTPUT = ROOT / "outputs"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"


def read_csv(folder: Path, name: str) -> pd.DataFrame:
    return pd.read_csv(folder / name)


def clock_minutes(series: pd.Series) -> pd.Series:
    parsed = pd.to_timedelta(series.astype(str) + ":00", errors="coerce")
    return parsed.dt.total_seconds().div(60)


def add_clock_features(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    for column in [
        "planned_depart_time",
        "planned_arrival_time",
        "window_open_time",
        "window_close_time",
    ]:
        if column in frame:
            frame[f"{column}_min"] = clock_minutes(frame[column])
    if {"window_open_time_min", "window_close_time_min"}.issubset(frame):
        frame["window_length_min"] = (
            frame["window_close_time_min"] - frame["window_open_time_min"]
        ).clip(lower=0)
    return frame


def task1_frames() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    deliveries = read_csv(TRAIN, "deliveries_train.csv")
    route_train = read_csv(TRAIN, "route_legs_train.csv")
    route_test = read_csv(TEST, "route_legs_test.csv")
    outlets = read_csv(GENERAL, "outlets.csv")

    train = deliveries[deliveries["route_id"].notna()].merge(
        route_train,
        left_on=["route_id", "seq_in_route"],
        right_on=["route_id", "seq"],
        how="inner",
        suffixes=("_order", "_route"),
    )
    test = read_csv(TEST, "task1_test_inputs.csv").merge(
        route_test,
        left_on=["route_id", "seq_in_route"],
        right_on=["route_id", "seq"],
        how="left",
        suffixes=("_order", "_route"),
    )
    train = train.merge(outlets, on="outlet_id", how="left", suffixes=("", "_outlet"))
    test = test.merge(outlets, on="outlet_id", how="left", suffixes=("", "_outlet"))

    for frame in (train, test):
        if "planned_arrival_time" not in frame:
            frame["planned_arrival_time"] = frame["planned_arrival_time_route"].fillna(
                frame["planned_arrival_time_order"]
            )
        frame["planned_depart_time"] = frame["planned_depart_time"].fillna("00:00")
        frame["planned_arrival_time"] = frame["planned_arrival_time"].fillna("00:00")
        frame["window_open_time"] = frame["window_open_time"].fillna("00:00")
        frame["window_close_time"] = frame["window_close_time"].fillna("23:59")
        frame["planned_travel_duration_min"] = frame["planned_travel_duration_min"].fillna(0)
        frame["distance_km"] = frame["distance_km"].fillna(0)
        frame["monsoon"] = frame["monsoon"].fillna(0)
        frame["dow"] = frame["dow"].fillna(0)
        frame["seq_in_route"] = frame["seq_in_route"].fillna(0)
        frame["order_date"] = pd.to_datetime(frame["order_date"])
        frame["date"] = pd.to_datetime(frame["date"], errors="coerce").fillna(frame["order_date"])
        frame["date_month"] = frame["date"].dt.month
        frame["date_day"] = frame["date"].dt.day
        frame["date_week"] = frame["date"].dt.isocalendar().week.astype(int)
        frame["planned_depart_time"] = frame["planned_depart_time"].fillna("00:00")
        frame["planned_arrival_time"] = frame["planned_arrival_time"].fillna("00:00")
        frame = add_clock_features(frame)

    train = add_clock_features(train)
    test = add_clock_features(test)
    train["arrival_actual_min"] = clock_minutes(train["arrival_time"])
    train["leave_actual_min"] = clock_minutes(train["leave_outlet_time"])
    train["arrival_window_open_min"] = clock_minutes(train["window_open_time"])
    train["window_close_actual_min"] = clock_minutes(train["window_close_time"])
    train["service_minutes"] = train["leave_actual_min"] - np.maximum(
        train["arrival_actual_min"], train["arrival_window_open_min"]
    )
    train["late"] = (train["arrival_actual_min"] > train["window_close_actual_min"]).astype(int)
    train["service_minutes"] = train["service_minutes"].clip(lower=1)
    return train, test, outlets


TASK1_CATEGORICAL = [
    "brand_order",
    "district_order",
    "depot_order",
    "temp_requirement",
    "vehicle_type_order",
    "vehicle_temp_order",
    "dock_type",
    "parking_constraint",
    "mall_window",
]
TASK1_NUMERIC = [
    "order_units",
    "order_weight_kg",
    "order_volume_m3",
    "seq_in_route",
    "distance_km",
    "planned_travel_duration_min",
    "monsoon",
    "dow",
    "date_month",
    "date_day",
    "date_week",
    "planned_depart_time_min",
    "planned_arrival_time_min",
    "window_open_time_min",
    "window_close_time_min",
    "window_length_min",
]


def task1_features(frame: pd.DataFrame) -> pd.DataFrame:
    values = frame.copy()
    for column in TASK1_CATEGORICAL:
        values[column] = values.get(column, "unknown").fillna("unknown").astype(str)
    for column in TASK1_NUMERIC:
        values[column] = pd.to_numeric(values.get(column, 0), errors="coerce").fillna(0)
    return values[TASK1_CATEGORICAL + TASK1_NUMERIC]


def task1_model(categorical: list[str], numeric: list[str], estimator):
    prep = ColumnTransformer(
        [
            (
                "categorical",
                OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1),
                categorical,
            ),
            ("numeric", "passthrough", numeric),
        ],
        remainder="drop",
    )
    return Pipeline([("prep", prep), ("model", estimator)])


def run_task1() -> dict:
    train, test, _ = task1_frames()
    dates = train["date"].sort_values().unique()
    cutoff = dates[int(len(dates) * 0.8)]
    train_mask = train["date"] < cutoff
    x_train = task1_features(train.loc[train_mask])
    x_valid = task1_features(train.loc[~train_mask])
    y_service_train = train.loc[train_mask, "service_minutes"]
    y_service_valid = train.loc[~train_mask, "service_minutes"]
    y_late_train = train.loc[train_mask, "late"]
    y_late_valid = train.loc[~train_mask, "late"]

    reg = task1_model(
        TASK1_CATEGORICAL,
        TASK1_NUMERIC,
        HistGradientBoostingRegressor(
            max_iter=220, learning_rate=0.06, max_leaf_nodes=31, l2_regularization=1.0, random_state=42
        ),
    )
    clf = task1_model(
        TASK1_CATEGORICAL,
        TASK1_NUMERIC,
        HistGradientBoostingClassifier(
            max_iter=220, learning_rate=0.06, max_leaf_nodes=31, l2_regularization=1.0, random_state=42
        ),
    )
    reg.fit(x_train, y_service_train)
    clf.fit(x_train, y_late_train)

    service_valid = np.maximum(1, reg.predict(x_valid))
    late_valid = clf.predict_proba(x_valid)[:, 1]
    test_service = np.maximum(1, reg.predict(task1_features(test)))
    test_late = np.clip(clf.predict_proba(task1_features(test))[:, 1], 0, 1)
    output = read_csv(TEMPLATES, "submission_task1.csv")
    predictions = pd.DataFrame(
        {"delivery_id": test["delivery_id"], "pred_service_min": test_service, "pred_late_prob": test_late}
    )
    output = output[["delivery_id"]].merge(predictions, on="delivery_id", how="left")
    output["pred_service_min"] = output["pred_service_min"].round(2)
    output["pred_late_prob"] = output["pred_late_prob"].round(5)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT / "submission_task1.csv", index=False)
    joblib.dump(reg, MODELS / "task1_service_time.joblib")
    joblib.dump(clf, MODELS / "task1_late_probability.joblib")
    metrics = {
        "validation_cutoff": str(cutoff),
        "validation_rows": int((~train_mask).sum()),
        "service_mae_minutes": round(float(mean_absolute_error(y_service_valid, service_valid)), 4),
        "late_accuracy": round(float(accuracy_score(y_late_valid, late_valid >= 0.5)), 4),
        "late_roc_auc": round(float(roc_auc_score(y_late_valid, late_valid)), 4),
        "service_label": "leave_outlet_time - max(actual_arrival, window_open)",
        "late_label": "actual_arrival > window_close",
    }
    (REPORTS / "task1_metrics.json").write_text(json.dumps(metrics, indent=2))
    return metrics


def add_calendar_columns(frame: pd.DataFrame, calendar: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    return frame.merge(calendar, on=["iso_year", "iso_week"], how="left")


def run_task2a() -> dict:
    deliveries = read_csv(TRAIN, "deliveries_train.csv")
    calendar = read_csv(GENERAL, "calendar.csv")
    deliveries["order_date"] = pd.to_datetime(deliveries["order_date"])
    deliveries["iso_year"] = deliveries["order_date"].dt.isocalendar().year.astype(int)
    deliveries["iso_week"] = deliveries["order_date"].dt.isocalendar().week.astype(int)
    deliveries["chilled_volume_m3"] = np.where(
        deliveries["temp_requirement"].eq("chilled"), deliveries["order_volume_m3"], 0
    )
    weekly = (
        deliveries.groupby(["depot", "brand", "iso_year", "iso_week"], as_index=False)
        .agg(total_volume_m3=("order_volume_m3", "sum"), chilled_volume_m3=("chilled_volume_m3", "sum"))
    )
    test = read_csv(TEST, "task2a_test_inputs.csv")
    # A transparent seasonal baseline: the same ISO week in history is weighted
    # with the most recent eight-week level. This avoids future leakage and is
    # stable for the short ten-week forecasting horizon.
    predictions = []
    for row in test.itertuples(index=False):
        series = weekly[(weekly.depot == row.depot) & (weekly.brand == row.brand)]
        same_week = series[series.iso_week == row.iso_week]
        recent = series.sort_values(["iso_year", "iso_week"]).tail(8)
        same_total = float(same_week.total_volume_m3.mean()) if len(same_week) else 0.0
        same_chilled = float(same_week.chilled_volume_m3.mean()) if len(same_week) else 0.0
        recent_total = float(recent.total_volume_m3.mean()) if len(recent) else 0.0
        recent_chilled = float(recent.chilled_volume_m3.mean()) if len(recent) else 0.0
        total = 0.65 * same_total + 0.35 * recent_total
        chilled = 0.65 * same_chilled + 0.35 * recent_chilled
        if row.brand != "Fresh":
            chilled = 0.0
        predictions.append(
            {"row_id": row.row_id, "pred_total_volume_m3": max(0, total), "pred_chilled_volume_m3": max(0, chilled)}
        )
    output = read_csv(TEMPLATES, "submission_task2a.csv")[["row_id"]].merge(
        pd.DataFrame(predictions), on="row_id", how="left"
    )
    output[["pred_total_volume_m3", "pred_chilled_volume_m3"]] = output[
        ["pred_total_volume_m3", "pred_chilled_volume_m3"]
    ].round(3)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT / "submission_task2a.csv", index=False)
    policy = {
        "method": "0.65 same ISO-week historical mean + 0.35 recent eight-week mean",
        "chilled_rule": "Only Fresh contributes chilled volume; Style and Tech are zero",
        "leakage_control": "Forecast uses only order history before the requested forecast week",
    }
    (MODELS / "task2a_forecast_policy.json").write_text(json.dumps(policy, indent=2))
    return policy


@dataclass
class TripState:
    vehicle_id: str
    trip_no: int
    brand: str
    district: str
    orders: list[dict] = field(default_factory=list)
    weight: float = 0.0
    volume: float = 0.0
    minutes: float = 0.0
    distance_km: float = 0.0


def duration(orders: Iterable[dict], travel: pd.DataFrame, allowances: pd.DataFrame) -> float:
    values = list(orders)
    if not values:
        return 0.0
    district = values[0]["district"]
    row = travel[travel["district"].eq(district)].iloc[0]
    brand = values[0]["brand"]
    minutes = float(row["depot_to_district_freeflow_min"])
    minutes += float(row["inter_stop_freeflow_min"]) * max(0, len(values) - 1)
    for order in values:
        allowance = allowances[
            allowances.brand.eq(brand) & allowances.dock_type.eq(order["dock_type"])
        ]
        minutes += float(allowance.service_allowance_min.iloc[0]) if len(allowance) else 15.0
    return minutes


def trip_distance(orders: Iterable[dict], travel: pd.DataFrame) -> float:
    values = list(orders)
    if not values:
        return 0.0
    row = travel[travel["district"].eq(values[0]["district"])].iloc[0]
    return float(row["depot_to_district_km"]) + float(row["inter_stop_km"]) * max(0, len(values) - 1)


def clock_value(value: str) -> float:
    hours, minutes = str(value).split(":")[:2]
    return int(hours) * 60 + int(minutes)


def schedule_feasible(orders: Iterable[dict], travel: pd.DataFrame, allowances: pd.DataFrame) -> bool:
    """Check an earliest-arrival schedule for one same-district trip."""
    values = sorted(list(orders), key=lambda x: (clock_value(x["window_close_time"]), x["order_ref"]))
    if not values:
        return True
    row = travel[travel["district"].eq(values[0]["district"])].iloc[0]
    elapsed = 210.0 if values[0]["brand"] == "Fresh" else 360.0
    for index, order in enumerate(values):
        if index:
            elapsed += float(row["inter_stop_freeflow_min"])
        arrival = elapsed + float(row["depot_to_district_freeflow_min"]) if index == 0 else elapsed
        window_open = clock_value(order["window_open_time"])
        window_close = clock_value(order["window_close_time"])
        if isinstance(order.get("mall_window"), str):
            mall_open, mall_close = order["mall_window"].split("-")
            window_open = max(window_open, clock_value(mall_open))
            window_close = min(window_close, clock_value(mall_close))
        arrival = max(arrival, window_open)
        if arrival > window_close:
            return False
        allowance = allowances[
            allowances.brand.eq(order["brand"]) & allowances.dock_type.eq(order["dock_type"])
        ]
        elapsed = arrival + (float(allowance.service_allowance_min.iloc[0]) if len(allowance) else 15.0)
    return True


def run_task2b() -> dict:
    orders = read_csv(TEST, "task2b_peak_day_scenarios.csv").to_dict("records")
    fleet_status = read_csv(TEST, "task2b_peak_day_fleet.csv")
    vehicles = read_csv(GENERAL, "vehicles.csv")
    travel = read_csv(GENERAL, "district_travel.csv")
    allowances = read_csv(GENERAL, "service_allowance.csv")
    available = fleet_status[fleet_status.status.eq("available")].merge(vehicles, on="vehicle_id")
    available_records = available.to_dict("records")
    trips: dict[str, list[TripState]] = {v["vehicle_id"]: [] for v in available_records}
    assignments: dict[str, tuple[str, int]] = {}

    def fits(order, vehicle, trip: TripState | None, candidate_orders: list[dict]) -> bool:
        if vehicle["depot"] != order["depot"]:
            return False
        if order["temp_requirement"] == "chilled" and vehicle["temp"] != "reefer":
            return False
        if order["parking_constraint"] == "van_only" and vehicle["type"] != "van":
            return False
        projected = candidate_orders + [order]
        weight = sum(float(x["order_weight_kg"]) for x in projected)
        volume = sum(float(x["order_volume_m3"]) for x in projected)
        if weight > float(vehicle["weight_cap_kg"]) or volume > float(vehicle["volume_cap_m3"]):
            return False
        if not schedule_feasible(projected, travel, allowances):
            return False
        return True

    def budget_key(brand: str) -> str:
        return "Fresh" if brand == "Fresh" else "Other"

    # Serve deferred-yesterday orders first, then chilled and larger orders.
    orders = sorted(
        orders,
        key=lambda x: (
            -int(x["deferred_yesterday"]),
            -int(x["days_since_last_served"]),
            0 if x["temp_requirement"] == "chilled" else 1,
            -float(x["order_volume_m3"]),
        ),
    )
    budget_used: dict[str, dict[str, float]] = {
        v["vehicle_id"]: {"Fresh": 0.0, "Other": 0.0} for v in available_records
    }
    fuel_used = {v["vehicle_id"]: 0.0 for v in available_records}
    deferred = []
    for order in orders:
        candidates = []
        for vehicle in available_records:
            vehicle_trips = trips[vehicle["vehicle_id"]]
            for trip in vehicle_trips:
                if trip.brand != order["brand"] or trip.district != order["district"]:
                    continue
                if not fits(order, vehicle, trip, trip.orders):
                    continue
                projected_duration = duration(trip.orders + [order], travel, allowances)
                projected_distance = trip_distance(trip.orders + [order], travel)
                projected_fuel = fuel_used[vehicle["vehicle_id"]] - trip.distance_km / float(vehicle["km_per_l"]) + projected_distance / float(vehicle["km_per_l"])
                if projected_fuel > float(vehicle["weekly_fuel_quota_l"]):
                    continue
                projected_budget = budget_used[vehicle["vehicle_id"]][budget_key(order["brand"])] - trip.minutes + projected_duration
                limit = 270.0 if order["brand"] == "Fresh" else 480.0
                if projected_budget <= limit:
                    candidates.append((projected_duration, vehicle, trip, projected_budget, projected_distance))
            if len(vehicle_trips) < 2 and fits(order, vehicle, None, []):
                new_duration = duration([order], travel, allowances)
                new_distance = trip_distance([order], travel)
                key = budget_key(order["brand"])
                limit = 270.0 if order["brand"] == "Fresh" else 480.0
                new_fuel = new_distance / float(vehicle["km_per_l"])
                if fuel_used[vehicle["vehicle_id"]] + new_fuel > float(vehicle["weekly_fuel_quota_l"]):
                    continue
                if budget_used[vehicle["vehicle_id"]][key] + new_duration <= limit:
                    candidates.append((new_duration, vehicle, None, budget_used[vehicle["vehicle_id"]][key] + new_duration, new_distance))
        if not candidates:
            deferred.append(order)
            continue
        _, vehicle, trip, projected_budget, projected_distance = min(candidates, key=lambda x: (x[3], x[0], x[1]["vehicle_id"]))
        if trip is None:
            trip = TripState(vehicle["vehicle_id"], len(trips[vehicle["vehicle_id"]]) + 1, order["brand"], order["district"])
            trips[vehicle["vehicle_id"]].append(trip)
        old_minutes = trip.minutes
        trip.orders.append(order)
        trip.weight += float(order["order_weight_kg"])
        trip.volume += float(order["order_volume_m3"])
        trip.minutes = duration(trip.orders, travel, allowances)
        fuel_used[vehicle["vehicle_id"]] += (projected_distance - trip.distance_km) / float(vehicle["km_per_l"])
        trip.distance_km = projected_distance
        budget_used[vehicle["vehicle_id"]][budget_key(order["brand"])] += trip.minutes - old_minutes
        assignments[order["order_ref"]] = (vehicle["vehicle_id"], trip.trip_no)

    rows = []
    for order in read_csv(TEST, "task2b_peak_day_scenarios.csv").to_dict("records"):
        vehicle_id, trip_no = assignments.get(order["order_ref"], ("", ""))
        rows.append(
            {
                "scenario": order["scenario"],
                "order_ref": order["order_ref"],
                "outlet_id": order["outlet_id"],
                "decision": "served" if vehicle_id else "deferred",
                "vehicle_id": vehicle_id,
                "trip_id": trip_no,
            }
        )
    output = pd.DataFrame(rows)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    output.to_csv(OUTPUT / "submission_task2b.csv", index=False)
    served = output[output.decision.eq("served")]
    policy = {
        "priority": ["deferred_yesterday", "days_since_last_served", "chilled", "larger volume"],
        "served_orders": int(len(served)),
        "deferred_orders": int((output.decision == "deferred").sum()),
        "vehicles_used": int(served.vehicle_id.nunique()),
        "trips_used": int(served[["vehicle_id", "trip_id"]].drop_duplicates().shape[0]),
        "constraints": "Available vehicles only; depot, temperature, van-only access, weight, volume, delivery/mall windows, fuel quotas, trip count and time budgets checked.",
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "task2b_policy.json").write_text(json.dumps(policy, indent=2))
    return policy


def main() -> None:
    print("Task 1", run_task1())
    print("Task 2A", run_task2a())
    print("Task 2B", run_task2b())
    print(f"Outputs written to {OUTPUT}")


if __name__ == "__main__":
    main()
