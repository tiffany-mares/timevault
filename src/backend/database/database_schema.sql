-- This table will be for storing information from the Canadian WW1 Dataset
CREATE TABLE ww1_enlistment(
    FName VARCHAR(22) NOT NULL,
    Minit CHAR(1),
    LName VARCHAR(27) NOT NULL,
    Regiment_number BIGINT,
    Rank VARCHAR(23),
    Enlistment_Year INT, 
    Year_of_Birth INT, 
    Place_of_Birth VARCHAR(32),
    Occupation VARCHAR(32),
    Marital_Status VARCHAR(12)
);

--This table will be for storing information from the court martials dataset--
CREATE TABLE ww1_court_martial(
    FName VARCHAR(22),
    Minit CHAR(1),
    LName VARCHAR(27) NOT NULL,
    Regiment_number BIGINT,
    Rank VARCHAR(23),
    Unit_Type VARCHAR(38),
    Enlistment_Year INT,
    Offence VARCHAR(55)
);

--This table will be for storing user information such as username, password (which must be hashed first) and account type--
CREATE TABLE app_user (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','viewer'))
);

--We can create indexes for common queries later on--
CREATE INDEX idx_regiment ON ww1_enlistment (Regiment_number);
CREATE INDEX idx_lname1 ON ww1_enlistment (LName);
CREATE INDEX idx_lname2 ON ww1_court_martial (LName);
CREATE INDEX idx_offence ON ww1_court_martial (Offence);

CREATE TABLE user_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- This table stores the result of joining enlistment and court martial records
CREATE TABLE joined_courtmartialled_soldiers AS
SELECT DISTINCT e.* FROM ww1_enlistment e
JOIN ww1_court_martial c ON e.LName = c.LName
AND (
    (c.Rank IN ('Lieutenant', 'Captain', 'Major', 'Colonel', 'General')
        AND e.FName = c.FName)
    OR e.Regiment_number = c.Regiment_number
);