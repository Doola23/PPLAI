import re
import numpy as np
import pandas as pd


def normalise_name(name: str) -> str:
    if pd.isna(name):
        return ''
    name = str(name).lower().strip()
    replacements = {
        'á':'a','à':'a','ä':'a','â':'a','ã':'a',
        'é':'e','è':'e','ë':'e','ê':'e','ę':'e',
        'í':'i','ì':'i','ï':'i','î':'i',
        'ó':'o','ò':'o','ö':'o','ô':'o','õ':'o','ő':'o',
        'ú':'u','ù':'u','ü':'u','û':'u','ű':'u',
        'ñ':'n','ç':'c','ý':'y','ß':'ss',
        'ø':'o','å':'a','æ':'ae','ř':'r',
        'š':'s','ž':'z','č':'c','ě':'e',
        'ğ':'g','ş':'s','ı':'i','ć':'c',
        'đ':'d','ł':'l','ń':'n','ą':'a',
        'ź':'z','ż':'z',
    }
    for k, v in replacements.items():
        name = name.replace(k, v)
    name = re.sub(r'[^a-z\s]', '', name)
    return ' '.join(name.split())


def parse_market_value(val) -> float:
    if pd.isna(val):
        return np.nan
    s = str(val).replace('€', '').replace(',', '.').strip()
    try:
        if 'm' in s:
            return float(s.replace('m', ''))
        elif 'k' in s:
            return float(s.replace('k', '')) / 1000
        else:
            return float(s)
    except Exception:
        return np.nan


def season_to_start_year(s) -> float:
    s = str(s)
    if '-' in s:
        parts = s.split('-')
        try:
            return int(parts[0])
        except Exception:
            pass
    return np.nan
