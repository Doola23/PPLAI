"""
Uploads the generated 2025-26 player stat predictions to DynamoDB, mirroring the
same pattern match_prediction/upload_outputs.py and injury_prediction/db.py use.

Table: player-stats-predictions (partition key: Player)
Run generate_predictions.py first to produce the CSVs this reads.
"""
import os
from decimal import Decimal

import boto3
import pandas as pd
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'), encoding='utf-8-sig')

dynamodb = boto3.resource(
    'dynamodb',
    region_name=os.getenv('AWS_REGION', 'eu-north-1'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
)

TABLE_NAME = 'player-stats-predictions'
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

POSITION_FILES = [
    'Strikers_2025_Predictions.csv',
    'Wingers_2025_Predictions.csv',
    'Centre_Backs_2025_Predictions.csv',
    'Fullbacks_2025_Predictions.csv',
    'Defensive_Midfielders_2025_Predictions.csv',
    'Central_Midfielders_2025_Predictions.csv',
    'Attacking_Midfielders_2025_Predictions.csv',
]


def upload_csv(table, file_path):
    df = pd.read_csv(file_path)
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
    count = 0
    for _, row in df.iterrows():
        item = {}
        for col in df.columns:
            val = row[col]
            if pd.isna(val):
                continue
            if isinstance(val, float):
                item[col] = Decimal(str(round(val, 4)))
            elif isinstance(val, bool):
                item[col] = bool(val)
            elif isinstance(val, (int, pd.Int64Dtype().type)):
                item[col] = int(val)
            else:
                item[col] = str(val)
        if 'Player' not in item:
            continue
        item['season'] = '2025-2026'
        table.put_item(Item=item)
        count += 1
    return count


def ensure_table_exists():
    existing = [t.name for t in dynamodb.tables.all()]
    if TABLE_NAME in existing:
        return dynamodb.Table(TABLE_NAME)
    print(f"Creating table {TABLE_NAME} (doesn't exist yet)...")
    table = dynamodb.create_table(
        TableName=TABLE_NAME,
        KeySchema=[{'AttributeName': 'Player', 'KeyType': 'HASH'}],
        AttributeDefinitions=[{'AttributeName': 'Player', 'AttributeType': 'S'}],
        BillingMode='PAY_PER_REQUEST',
    )
    table.wait_until_exists()
    print("Table created.")
    return table


def main():
    print(f"Uploading player stat predictions to DynamoDB table '{TABLE_NAME}'...")
    table = ensure_table_exists()
    total = 0
    for fname in POSITION_FILES:
        path = os.path.join(OUT_DIR, fname)
        if not os.path.exists(path):
            print(f"  Skipping {fname} (not found -- run generate_predictions.py first)")
            continue
        count = upload_csv(table, path)
        print(f"  {fname}: {count} items uploaded")
        total += count
    print(f"\nDone. {total} players uploaded to '{TABLE_NAME}'.")


if __name__ == '__main__':
    main()
