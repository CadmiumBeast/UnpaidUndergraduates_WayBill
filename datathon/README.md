# Waypoint Datathon solution

This folder contains the reproducible baseline, notebook, model artifacts and
submission CSVs for Tasks 1, 2A and 2B. The supplied competition data remains
local and is ignored by Git; do not commit or upload `datathon/data/` or any
derivative dataset.

## Rebuild the artifacts

Run these commands from the repository root after placing the supplied data at
`datathon/data/`:

```bash
python3 -m pip install pandas numpy scikit-learn joblib nbformat
python3 datathon/solution.py
python3 check_allocation.py datathon/outputs/submission_task2b.csv
```

The script writes:

- `outputs/submission_task1.csv`
- `outputs/submission_task2a.csv`
- `outputs/submission_task2b.csv`
- `models/` with the Task 1 models and Task 2A forecast policy
- `reports/` with validation metrics and the allocation policy

The final notebook is `TeamName_FinalNotebook.ipynb`. It reruns the three
solution functions, displays the generated outputs and performs basic schema
checks. `DATA-PREPROCESSING.md` documents labels, leakage controls, features,
forecasting and allocation decisions.

The Datathon-specific architecture, AI disclosure and final packaging checks
are in [`ARCHITECTURE.md`](./ARCHITECTURE.md),
[`AI-DISCLOSURE.md`](./AI-DISCLOSURE.md) and
[`SUBMISSION-CHECKLIST.md`](./SUBMISSION-CHECKLIST.md).

## Submission checklist

Before creating the zip, confirm that it contains the notebook, model files,
three submission CSVs, preprocessing document, architecture diagrams, AI
disclosure and the final video link. It must not contain the supplied raw data,
`.env` files or credentials.
