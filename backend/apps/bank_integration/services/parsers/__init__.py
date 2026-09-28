from .ofx import parse_ofx
from .picpay_csv import parse_picpay_csv

# Formato detectado pela extensão do arquivo enviado. Cada parser recebe o
# arquivo e devolve uma lista de dicts: {external_id, date, amount, description}.
PARSERS_BY_EXTENSION = {
    "ofx": parse_ofx,
    "qfx": parse_ofx,
    "csv": parse_picpay_csv,
}
