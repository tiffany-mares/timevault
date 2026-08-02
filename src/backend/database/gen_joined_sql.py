import psycopg2, os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '.env'))
conn = psycopg2.connect(
    host=os.getenv('DB_HOST'), database=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'),
    port=os.getenv('DB_PORT')
)
cur = conn.cursor()
cur.execute('SELECT * FROM joined_courtmartialled_soldiers')
rows = cur.fetchall()
conn.close()

def sql_val(v):
    if v is None:
        return 'NULL'
    if isinstance(v, (int, float)):
        return str(int(v))
    s = str(v).replace("'", "''")
    return f"'{s}'"

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'joined_courtmartialled_data.sql')
with open(out_path, 'w') as f:
    f.write('INSERT INTO joined_courtmartialled_soldiers (FName, Minit, LName, Regiment_number, Rank, Enlistment_Year, Year_of_Birth, Place_of_Birth, Occupation, Marital_Status) VALUES\n')
    for i, row in enumerate(rows):
        vals = ', '.join(sql_val(v) for v in row)
        sep = ';' if i == len(rows) - 1 else ','
        f.write(f'({vals}){sep}\n')

print(f'Wrote {len(rows)} rows to {out_path}')
