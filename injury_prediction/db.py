"""DynamoDB connection and table I/O utilities."""

import logging
import os
from decimal import Decimal

import boto3
import pandas as pd
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Injury module table names
TABLE_NAMES = {
    'minutes':     'injuries-player-minutes',
    'injuries':    'injuries-combined-clean',
    'players':     'injuries-players-combined',
    'fpl':         'injuries-fpl-historical',
    'fpl_api':     'injuries-fpl-api',
    'breaks':      'injuries-international-breaks',
    'predictions': 'injuries-predictions',
}


def _get_resource():
    return boto3.resource(
        'dynamodb',
        region_name='eu-north-1',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    )


def _convert_decimals(obj):
    """Recursively convert DynamoDB Decimal types to Python float."""
    if isinstance(obj, list):
        return [_convert_decimals(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _convert_decimals(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return float(obj)
    return obj


def scan_table(key: str) -> pd.DataFrame:
    """
    Scan a full DynamoDB table with pagination and return as a DataFrame.
    key must be one of the keys in TABLE_NAMES.
    """
    table_name = TABLE_NAMES[key]
    dynamodb   = _get_resource()
    table      = dynamodb.Table(table_name)
    items      = []

    print(f"  Loading {table_name}...", end=' ', flush=True)
    response = table.scan()
    items.extend(response['Items'])

    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])

    items = _convert_decimals(items)
    df    = pd.DataFrame(items)
    print(f"{len(df):,} rows")
    return df


def write_predictions(df: pd.DataFrame) -> None:
    """Write prediction results back to the injuries-predictions DynamoDB table."""
    dynamodb = _get_resource()
    table    = dynamodb.Table(TABLE_NAMES['predictions'])

    records              = df.copy()
    records['match_date'] = records['match_date'].astype(str)

    # DynamoDB requires Python-native numeric types, not numpy types
    for col in records.columns:
        if records[col].dtype in ['float64', 'float32']:
            records[col] = records[col].apply(
                lambda x: Decimal(str(round(x, 6))) if pd.notna(x) else None
            )
        elif records[col].dtype in ['int64', 'int32']:
            records[col] = records[col].apply(
                lambda x: int(x) if pd.notna(x) else None
            )

    print(f"Writing {len(records):,} predictions to DynamoDB...", end=' ', flush=True)
    with table.batch_writer() as batch:
        for _, row in records.iterrows():
            item = {k: v for k, v in row.to_dict().items()
                    if v is not None and str(v) != 'nan'}
            batch.put_item(Item=item)
    print("done")
