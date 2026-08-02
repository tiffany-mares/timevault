import random

random.seed(42)

FIRST_NAMES = [
    'James','William','Robert','Arthur','George','Thomas','John','Edward','Frederick',
    'Henry','Albert','Charles','Walter','Ernest','Harold','Alfred','Frank','Percy',
    'Leonard','Samuel','Herbert','Cecil','Reginald','Norman','Stanley','Victor','Howard',
    'Raymond','Donald','Gordon','Patrick','Douglas','Kenneth','Alexander','Hugh','Andrew',
    'Archibald','Peter','Ian','Malcolm','Angus','Lachlan','Hector','Bruce','Colin',
    'Neil','Alistair','Clifford','Wilfred','Oliver','Russell','Chester','Bernard',
    'Horace','Lloyd','Murray','Cyril','Edgar','Garnet','Milton','Ralph','Orville',
    'Wallace','Emile','Louis','Marcel','Fernand','Lionel','Roland','Armand','Gerard',
    'Wilfrid','Adelard','Elmer','Harvey','Irving','Carson','Vernon','Mervin','Delbert',
    'Norval','Lorne','Basil','Sterling','Bertram','Clement','Dawson','Eldon','Floyd',
    'Grant','Ivan','Keith','Leslie','Maxwell','Neville','Owen','Preston','Quincy',
    'Rupert','Sheldon','Thornton','Ulric','Vaughan','Wendell','Xavier','Aldous','Barton',
    'Clayton','Duncan','Emmett','Fraser','Glenn','Harlan','Jasper','Kendrick','Layton',
    'Murdoch','Nolan','Oswald','Palmer','Roderick','Sanford','Terrence','Upton','Walden',
    'Yorick','Bryson','Arden','Zebulon','Abel','Benedict','Cedric','Desmond','Earnest',
    'Felix','Gideon','Hamish','Ivor','Jules','Kirkland','Lester','Morley','Newton',
    'Oberon','Percival','Quentin','Randolph','Seymour','Tobias','Uriah','Winston',
    'Ambrose','Barnaby','Cornelius','Dominic','Ebenezer','Finlay','Godfrey','Hubert',
    'Ignatius','Jarvis','Kelvin','Lambert','Montague','Nigel','Ormond','Prentice',
    'Rufus','Silas','Tremont','Ulysses','Vergil','Winslow','Abner','Baxter','Calvert',
    'Dexter','Ephraim','Fletcher','Gavin','Holden','Innes','Josiah','Keegan','Lemuel',
    'Merton','Norris','Ogden','Philander','Reuben','Sullivan','Trent','Urban','Vance',
    'Whitfield','Alvin','Blair','Crawford','Dalton','Eliot','Forrest','Griffith',
    'Hadley','Irwin','Judson','Kirby','Ludlow','Manfred','Nelson','Orrin','Pierce',
    'Ransom','Sinclair','Thatcher','Vernon','Wyatt','Angus','Boyd','Callum','Dougal',
    'Ewan','Fergus','Gregor','Hamish','Innes','Jamie'
]

MIDDLE_INITIALS = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

LAST_NAMES = [
    'MacDonald','Thompson','Campbell','Wilson','Brown','Stewart','Reid','Murray',
    'Ross','Mitchell','Fraser','Morrison','Graham','Henderson','Patterson','Crawford',
    'Sinclair','Douglas','Grant','MacLean','Anderson','Mackenzie','Taylor','Clark',
    'Robertson','Hamilton','Kennedy','Scott','Martin','Young','Lawson','MacPherson',
    'Drummond','Mackay','Ferguson','Cunningham','Wallace','Sutherland','Forbes',
    'Cameron','MacLeod','Munro','Ramsay','Kerr','Baxter','Pratt','Beaulieu',
    'McIntyre','Davenport','Flett','Grenier','Tremblay','Gagnon','Bouchard','Cote',
    'Pelletier','Bergeron','Gauthier','Levesque','Poirier','Michaud','O\'Brien',
    'Sullivan','Murphy','Kelly','Walsh','Byrne','Duffy','Quinn','Doyle','Brennan',
    'MacNeil','MacKinnon','Chicken','Chicken','Chicken','MacDougall','McMillan',
    'McLeod','McGregor','McRae','McPhee','McTavish','McCormick','McCallum','McEwen',
    'McLaughlin','McArthur','McBride','McDonald','McKay','McKinnon','McLennan',
    'McQueen','McVicar','Blackwood','Carruthers','Cochrane','Donaldson','Edmonds',
    'Fitzpatrick','Galbraith','Harrington','Ingram','Johnstone','Kirkpatrick',
    'Livingstone','MacFarlane','Nicholson','Oliver','Paterson','Rutherford',
    'Saunders','Urquhart','Whitaker','Armstrong','Bell','Craig','Davidson',
    'Elliott','Fleming','Gibson','Hunter','Irwin','Jackson','Kilpatrick',
    'Lambert','Maxwell','Neilson','Ogilvie','Phillips','Richardson','Simpson',
    'Turner','Vaughan','Webster','Allan','Boyd','Chambers','Dixon','Evans',
    'Gordon','Harris','Johnston','Lawrie','Matheson','Norris','Pearson',
    'Russell','Sharpe','Thomson','Walker','Blair','Cowan','Duff','Fowler',
    'Gray','Hay','Jamieson','Knox','Lindsay','Millar','Noble','Owen',
    'Porter','Rae','Smith','Todd','Watt','Aitken','Barr','Chisholm',
    'Dewar','Fairbairn','Gilmour','Hood','Kemp','Lang','Moffat','Park',
    'Ritchie','Stirling','Tait','Wood','Warden','Black','Cooper','Dean',
    'Fisher','Green','Hall','King','Lee','Moore','Price','Reed','Stone',
    'Ward','White','Wright','Baker','Carter','Davis','Edwards','Fox',
    'Hart','James','Lewis','Mason','Newton','Page','Rogers','Shaw','West'
]

RANKS = [
    'Private','Private','Private','Private','Private','Private','Private','Private',
    'Private','Private','Private','Private','Private','Private','Private',
    'Corporal','Corporal','Corporal','Corporal',
    'Sergeant','Sergeant','Sergeant',
    'Sergeant-Major',
    'Lieutenant','Lieutenant',
    'Captain',
    'Major',
    'Colonel',
    'General',
    'Cadet',
]

PLACES_OF_BIRTH = [
    'Ontario','Ontario','Ontario','Ontario','Ontario','Ontario',
    'Quebec','Quebec','Quebec',
    'Nova Scotia','Nova Scotia',
    'Manitoba','Manitoba',
    'British Columbia','British Columbia',
    'Alberta','Alberta',
    'Saskatchewan','Saskatchewan',
    'New Brunswick','New Brunswick',
    'Prince Edward Island',
    'England','England',
    'USA',
    'Other',
]

OCCUPATIONS = [
    'Agriculture','Agriculture','Agriculture','Agriculture','Agriculture',
    'Industrial & Skilled Trades','Industrial & Skilled Trades','Industrial & Skilled Trades','Industrial & Skilled Trades',
    'Professional & White-Collar','Professional & White-Collar','Professional & White-Collar',
    'Service & Retail','Service & Retail',
    'Maritime & Fishing','Maritime & Fishing',
    'Military & Government','Military & Government',
    'Students & Trainees','Students & Trainees',
    'Transportation & Rail',
]

MARITAL_STATUSES = [
    'Single','Single','Single','Single','Single','Single',
    'Married','Married','Married','Married',
    'Widowed',
]

UNIT_TYPES = [
    'Medical',
    'Medical',
    'Service',
    'Service',
    'Reserves & Training',
    'Reserves & Training',
    'Reserves & Training',
    'Police',
    'Artillery',
    'Artillery',
    'Artillery',
    'Artillery',
    'Cavalry & Mounted',
    'Cavalry & Mounted',
    'Forestry Corps',
    'Forestry Corps',
    'Headquarters',
    'Engineers & Signals',
    'Engineers & Signals',
    'Machine Gun Corps',
    'Machine Gun Corps',
]

OFFENCES = [
    '15 - Absence from duty without leave',
    '15 - Absence from duty without leave',
    '15 - Absence from duty without leave',
    '15 - Absence from duty without leave',
    '15 - Absence from duty without leave',
    '15 - Absence from duty without leave',
    '19 - Drunkenness',
    '19 - Drunkenness',
    '19 - Drunkenness',
    '19 - Drunkenness',
    '19 - Drunkenness',
    '9 - Disobedience to superior officer',
    '9 - Disobedience to superior officer',
    '9 - Disobedience to superior officer',
    '10 - Insubordination',
    '10 - Insubordination',
    '10 - Insubordination',
    '12 - Desertion',
    '12 - Desertion',
    '40 - Conduct to prejudice of military discipline',
    '40 - Conduct to prejudice of military discipline',
    '40 - Conduct to prejudice of military discipline',
    '11 - Neglect to obey garrison or other orders',
    '11 - Neglect to obey garrison or other orders',
    '8 - Striking or threatening superior officer',
    '8 - Striking or threatening superior officer',
    '18 - Disgraceful conduct of soldier',
    '18 - Disgraceful conduct of soldier',
    '22 - Escape from confinement',
    '24 - Deficiency in and injury to equipment',
    '24 - Deficiency in and injury to equipment',
    '6 - Offences punishable more severely on active service than at other times',
    '6 - Offences punishable more severely on active service than at other times',
    '41 - Offences punishable by ordinary law of England (or the Canadian civil court)',
    '41 - Offences punishable by ordinary law of England (or the Canadian civil court)',
    '14 - Assistance of or connivance at desertion',
    '27 - False accusation or false statement by soldier',
    '25 - Falsifying official documents and false declarations',
    '17 - Fraud by persons in charge of money or goods',
    '37 - Ill-treating soldier',
    '4 - Offences in relation to the enemy punishable with death',
    '5 - Offences in relation to the enemy not punishable with death',
    '13 - Fraudulent enlistment',
    '26 - Neglect to report and signing in blank',
    '33 - False answers or declarations on enlistment',
    '20 - Permitting escape of person in custody',
    '35 - Traitorous words',
    '36 - Injurious disclosures',
    '38 - Duelling and attempting to commit suicide',
    '7 - Mutiny and sedition',
]

ENLISTMENT_YEAR_WEIGHTS = {1914: 15, 1915: 30, 1916: 25, 1917: 20, 1918: 10}

def weighted_year():
    years = []
    for y, w in ENLISTMENT_YEAR_WEIGHTS.items():
        years.extend([y] * w)
    return random.choice(years)

def sql_escape(s):
    return s.replace("'", "''")

def generate_enlistment_records(n):
    records = []
    used_regiment_numbers = set()
    for _ in range(n):
        fname = random.choice(FIRST_NAMES)
        minit = random.choice(MIDDLE_INITIALS)
        lname = random.choice(LAST_NAMES)
        while True:
            reg_num = random.randint(10000, 99999)
            if reg_num not in used_regiment_numbers:
                used_regiment_numbers.add(reg_num)
                break
        rank = random.choice(RANKS)
        year = weighted_year()
        birth_year = random.randint(1870, 1900)
        birthplace = random.choice(PLACES_OF_BIRTH)
        occupation = random.choice(OCCUPATIONS)
        marital = random.choice(MARITAL_STATUSES)
        unit_type  = random.choice(UNIT_TYPES)
        records.append((fname, minit, lname, reg_num, rank,
                         year, birth_year, birthplace, occupation, marital, unit_type))
    return records

def generate_court_martial_records(enlistment_records, n):
    records = []
    pool = [r for r in enlistment_records]
    for _ in range(n):
        soldier = random.choice(pool)
        fname, minit, lname, reg_num, rank, enlist_year = soldier[:6]
        unit_type = soldier[10]  
        offence = random.choice(OFFENCES)
        records.append((fname, minit, lname, reg_num, rank, unit_type, enlist_year, offence))
    return records

def format_enlistment_values(records):
    lines = []
    for r in records:
        fname,minit,lname,reg_num,rank,year,birth_year,birthplace,occupation,marital,unit_type = r
        lines.append(
            f"    ('{sql_escape(fname)}', '{minit}', '{sql_escape(lname)}', "
            f"{reg_num}, '{sql_escape(rank)}', {year}, {birth_year}, "
            f"'{sql_escape(birthplace)}', '{sql_escape(occupation)}', "
            f"'{sql_escape(marital)}', '{sql_escape(unit_type)}')"
        )
    return ',\n'.join(lines)

def format_court_martial_values(records):
    lines = []
    for r in records:
        fname, minit, lname, reg_num, rank, unit_type, enlist_year, offence = r
        lines.append(
            f"    ('{sql_escape(fname)}', '{minit}', '{sql_escape(lname)}', "
            f"{reg_num}, '{sql_escape(rank)}', '{sql_escape(unit_type)}', "
            f"{enlist_year}, '{sql_escape(offence)}')"
        )
    return ',\n'.join(lines)

NUM_ENLISTMENT = 2000
NUM_COURT_MARTIAL = 800

enlistment_records = generate_enlistment_records(NUM_ENLISTMENT)
court_martial_records = generate_court_martial_records(enlistment_records, NUM_COURT_MARTIAL)

if __name__ == "__main__":
    sql = f"""-- Sample data for TimeVault
-- Based on Canadian Expeditionary Force (CEF) WWI records (1914-1918)
-- Generated dataset: {NUM_ENLISTMENT} enlistment records, {NUM_COURT_MARTIAL} court martial records

-- =============================================================================
-- ww1_enlistment ({NUM_ENLISTMENT} records)
-- =============================================================================
INSERT INTO ww1_enlistment (FName, Minit, LName, Regiment_number, Rank, Enlistment_Year, Year_of_Birth, Place_of_Birth, Occupation, Marital_Status, Unit_Type)
VALUES
{format_enlistment_values(enlistment_records)};

-- =============================================================================
-- ww1_court_martial ({NUM_COURT_MARTIAL} records)
-- =============================================================================
INSERT INTO ww1_court_martial (FName, Minit, LName, Regiment_number, Rank, Unit_Type, Enlistment_Year, Offence)
VALUES
{format_court_martial_values(court_martial_records)};
"""

    with open('sample_data.sql', 'w', encoding='utf-8') as f:
        f.write(sql)

    print(f"Generated {NUM_ENLISTMENT} enlistment records and {NUM_COURT_MARTIAL} court martial records.")
    print(f"Total: {NUM_ENLISTMENT + NUM_COURT_MARTIAL} records written to sample_data.sql")
