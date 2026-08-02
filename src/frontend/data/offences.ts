export interface Offence {
    code: string;
    section: number;
    description: string;
}
export const OFFENCES: Offence[] = [
  { code: "4", section: 4, description: "Offences in relation to the enemy punishable with death" },
  { code: "5", section: 5, description: "Offences in relation to the enemy not punishable with death" },
  { code: "6", section: 6, description: "Offences punishable more severely on active service than at other times" },
  { code: "7", section: 7, description: "Mutiny and sedition" },
  { code: "8", section: 8, description: "Striking or threatening superior officer" },
    { code: "9", section: 9, description: "Disobedience to superior officer" },
    { code: "10", section: 10, description: "Insubordination" },
    { code: "11", section: 11, description: "Neglect to obey garrison or other orders" },
  { code: "12", section: 12, description: "Desertion" },
  { code: "13", section: 13, description: "Fraudulent enlistment" },
  { code: "14", section: 14, description: "Assistance of or connivance at desertion" },
    { code: "15", section: 15, description: "Absence from duty without leave" },
  { code: "16", section: 16, description: "Scandalous conduct of officer" },
  { code: "17", section: 17, description: "Fraud by persons in charge of money or goods" },
    { code: "18", section: 18, description: "Disgraceful conduct of soldier" },
    { code: "19", section: 19, description: "Drunkenness" },
  { code: "20", section: 20, description: "Permitting escape of person in custody" },
  { code: "21", section: 21, description: "Irregular arrest or confinement" },
  { code: "22", section: 22, description: "Escape from confinement" },
    { code: "23", section: 23, description: "Corrupt dealings in respect of supplies to forces" },
    { code: "24", section: 24, description: "Deficiency in and injury to equipment" },
  { code: "25", section: 25, description: "Falsifying official documents and false declarations" },
  { code: "26", section: 26, description: "Neglect to report and signing in blank" },
    { code: "27", section: 27, description: "False accusation or false statement by soldier" },
  { code: "28", section: 28, description: "Offences in relation to courts martial" },
  { code: "29", section: 29, description: "False evidence" },
    { code: "30", section: 30, description: "Offences in relation to billeting" },
    { code: "32", section: 32, description: "Enlistment of soldier or sailor discharged with ignominy or disgrace" },
  { code: "33", section: 33, description: "False answers or declarations on enlistment" },
  { code: "37", section: 37, description: "Ill-treating soldier" },
    { code: "38", section: 38, description: "Duelling and attempting to commit suicide" },
  { code: "40", section: 40, description: "Conduct to prejudice of military discipline" },
  { code: "41", section: 41, description: "Offences punishable by ordinary law of England (or the Canadian civil court)" },
];

export const OFFENCE_CODE_OPTIONS = OFFENCES.map(o => ({
    id: o.code,
    label: `${o.code} - ${o.description}`,
}));
