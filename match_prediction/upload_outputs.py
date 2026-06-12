import boto3
import pandas as pd
import os
from decimal import Decimal

dynamodb = boto3.resource(
    'dynamodb',
    region_name='eu-north-1',
    aws_access_key_id='AKIASLRF6IA64R73PQHD',
    aws_secret_access_key='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'
)

def to_decimal(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_decimal(i) for i in obj]
    return obj

def upload_csv(table_name, file_path, partition_key, extra_keys={}):
    table = dynamodb.Table(table_name)
    df = pd.read_csv(file_path)
    count = 0
    for _, row in df.iterrows():
        item = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                continue
            if isinstance(val, float):
                item[col] = Decimal(str(val))
            elif isinstance(val, bool):
                item[col] = bool(val)
            elif isinstance(val, int):
                item[col] = int(val)
            else:
                item[col] = str(val)
        # Add extra keys if needed
        for k, v in extra_keys.items():
            item[k] = v(row)
        table.put_item(Item=item)
        count += 1
    print(f"   ✓ {table_name} — {count} items uploaded")

OUT = r"C:\Users\jana\Desktop\jayjayokocha\outputs"

def upload_csv(table_name, file_path, partition_key, id_func=None):
    table = dynamodb.Table(table_name)
    df = pd.read_csv(file_path)
    # Drop unnamed index columns
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    count = 0
    for _, row in df.iterrows():
        item = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                continue
            if isinstance(val, float):
                item[col] = Decimal(str(val))
            elif isinstance(val, bool):
                item[col] = bool(val)
            elif isinstance(val, int):
                item[col] = int(val)
            else:
                item[col] = str(val)
        if id_func:
            item[partition_key] = id_func(row)
        table.put_item(Item=item)
        count += 1
    print(f"   ✓ {table_name} — {count} items")

print("Uploading match outputs to DynamoDB...")

# match_id function
def match_id(row): return f"{row['Home']}_{row['Away']}"

upload_csv('match-output-predictions',          f"{OUT}\\match_predictions.csv",        'match_id',  match_id)
upload_csv('match-output-draw-risk',            f"{OUT}\\draw_risk_predictions.csv",    'match_id',  match_id)
upload_csv('match-output-standings-actual',     f"{OUT}\\actual_standings.csv",         'Team')
upload_csv('match-output-standings-predicted',  f"{OUT}\\predicted_standings.csv",      'Team')
upload_csv('match-output-standings-comparison', f"{OUT}\\standings_comparison.csv",     'Team')
upload_csv('match-output-analyst-season',       f"{OUT}\\analyst_reports_season.csv",   'Team')
upload_csv('match-output-analyst-last5',        f"{OUT}\\analyst_reports_last5.csv",    'Team')
upload_csv('match-output-shap',                 f"{OUT}\\shap_importance.csv",          'Feature')
# Cross validation — convert Fold to string
cv_df = pd.read_csv(f"{OUT}\\cross_validation.csv")
cv_df['Fold'] = cv_df['Fold'].astype(str)
cv_table = dynamodb.Table('match-output-cross-validation')
for _, row in cv_df.iterrows():
    item = {}
    for col in cv_df.columns:
        val = row[col]
        if pd.isna(val): continue
        if col == 'Fold':
            item[col] = str(val)
        elif isinstance(val, float):
            item[col] = Decimal(str(val))
        elif isinstance(val, int):
            item[col] = int(val)
        else:
            item[col] = str(val)
    cv_table.put_item(Item=item)
print(f"   ✓ match-output-cross-validation — {len(cv_df)} items")

# Calibration — combine both files
print("   Uploading calibration...")
cal_table = dynamodb.Table('match-output-calibration')
for fname in ['calibration_validation.csv', 'calibration_test.csv']:
    df = pd.read_csv(f"{OUT}\\{fname}")
    for _, row in df.iterrows():
        item = {
            'label_outcome': f"{row['Label']}_{row['Outcome']}_{str(row['Mean_Predicted_Prob'])}",
            'Label':    str(row['Label']),
            'Outcome':  str(row['Outcome']),
            'Mean_Predicted_Prob': Decimal(str(row['Mean_Predicted_Prob'])),
            'Fraction_Positive':   Decimal(str(row['Fraction_Positive'])),
        }
        cal_table.put_item(Item=item)
print(f"   ✓ match-output-calibration")

print("\nAll done! 🎉")