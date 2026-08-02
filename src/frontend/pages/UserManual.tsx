import { PageLayout } from "@/components/PageLayout";
import { WireBox } from "@/components/wireframe";
import { SectionNav } from "@/components/SectionNav";
import { BarChart3, GitCompare, Brain, Database, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const offenceCodes = [
  { code: "4", label: "Offences in relation to the enemy punishable with death" },
  { code: "5", label: "Offences in relation to the enemy not punishable with death" },
  { code: "6", label: "Offences punishable more severely on active service than at other times" },
  { code: "7", label: "Mutiny and sedition" },
  { code: "8", label: "Striking or threatening superior officer" },
  { code: "9", label: "Disobedience to superior officer" },
  { code: "10", label: "Insubordination" },
  { code: "11", label: "Neglect to obey garrison or other orders" },
  { code: "12", label: "Desertion" },
  { code: "13", label: "Fraudulent enlistment" },
  { code: "14", label: "Assistance of or connivance at desertion" },
  { code: "15", label: "Absence from duty without leave" },
  { code: "16", label: "Scandalous conduct of officer" },
  { code: "17", label: "Fraud by persons in charge of money or goods" },
  { code: "18", label: "Disgraceful conduct of soldier" },
  { code: "19", label: "Drunkenness" },
  { code: "20", label: "Permitting escape of person in custody" },
  { code: "21", label: "Irregular arrest or confinement" },
  { code: "22", label: "Escape from confinement" },
  { code: "23", label: "Corrupt dealings in respect of supplies to forces" },
  { code: "24", label: "Deficiency in and injury to equipment" },
  { code: "25", label: "Falsifying official documents and false declarations" },
  { code: "26", label: "Neglect to report and signing in blank" },
  { code: "27", label: "False accusation or false statement by soldier" },
  { code: "28", label: "Offences in relation to courts martial" },
  { code: "29", label: "False evidence" },
  { code: "30", label: "Offences in relation to billeting (the practice of soldiers lodging in private homes while on active service)" },
  { code: "32", label: "Enlistment of soldier or sailor discharged with ignominy or disgrace" },
  { code: "33", label: "False answers or declarations on enlistment" },
  { code: "37", label: "Ill-treating soldier" },
  { code: "38", label: "Duelling and attempting to commit suicide" },
  { code: "40", label: "Conduct to prejudice of military discipline" },
  { code: "41", label: "Offences punishable by ordinary law of England (or the Canadian civil court)" },
];


const UserManual = () => {
    return (
        <PageLayout code="P-UM" title="User Manual" subtitle="Guide to using the TimeVault platform for exploring CEF disciplinary patterns (1914-1918)" maxWidth="max-w-4xl">
            <SectionNav sections={[
                { id: "um-overview", label: "Overview" },
                { id: "um-how-to", label: "How to Use" },
                { id: "um-modules", label: "Modules" },
                { id: "um-offences", label: "Offence Codes" },
                { id: "um-occupations", label: "Occupations" },
                { id: "um-interpret", label: "Interpreting Results" },
                { id: "um-notes", label: "Important Notes" },
            ]} />

            <div id="um-overview" className="scroll-mt-4">
            <WireBox dashed={false} label="OVERVIEW">
                <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                    <p>This page explains how to use the TimeVault platform to explore disciplinary patterns within the Canadian Expeditionary Force (CEF) during the First World War (1914-1918).</p>
                    <p>The system allows users to analyze courts martial records, compare disciplinary patterns across groups, and discover broader trends in military discipline.</p>
                    <p>All analysis is conducted using aggregated historical data to support responsible interpretation of archival records.</p>
                </div>
            </WireBox>
            </div>

            <div id="um-how-to" className="scroll-mt-4">
                <WireBox dashed={false} label="HOW TO USE THE SYSTEM">
                    <div className="space-y-2 text-sm font-body text-muted-foreground leading-relaxed">
                        <p>The platform is organized into several modules. Each module focuses on a different type of analysis.</p>
                        <p>Users can navigate between modules using the main menu.</p>
                    </div>
                </WireBox>
            </div>

            <div id="um-modules" className="scroll-mt-4">
            <WireBox dashed={false} label="SYSTEM MODULES">
                <div className="space-y-6">

                    <Link to="/overview" id="um-offence-trends" className="block border border-border rounded-sm p-4 space-y-3 scroll-mt-4 group hover:border-olive/50 hover:shadow-md hover:bg-olive/[0.03] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start gap-3">
                          <BarChart3 className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p className="font-serif font-semibold text-sm group-hover:text-olive transition-colors">Offence Trends</p>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-olive mt-0.5 transition-colors ml-auto" />
                        </div>
                        <div className="text-sm font-body text-muted-foreground space-y-2 leading-relaxed pl-8">
                          <p>The Offence Trends module provides an overview of the most common disciplinary offences recorded in WWI courts martial records.</p>
                            <p>This module allows users to:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                              <li>Identify the most frequently recorded offences</li>
                                <li>Examine how offence patterns changed between 1914 and 1918</li>
                              <li>Explore demographic characteristics such as: age groups, birthplace, residence, marital status</li>
                            </ul>
                            <p>Charts in this module show aggregate patterns, helping users understand how disciplinary activity evolved during the war.</p>
                          <p className="italic text-xs">This module is best used for broad exploratory analysis.</p>
                        </div>
                    </Link>

                    <Link to="/compare" id="um-compare" className="block border border-border rounded-sm p-4 space-y-3 scroll-mt-4 group hover:border-olive/50 hover:shadow-md hover:bg-olive/[0.03] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start gap-3">
                            <GitCompare className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                          <p className="font-serif font-semibold text-sm group-hover:text-olive transition-colors">Comparative Analysis</p>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-olive mt-0.5 transition-colors ml-auto" />
                      </div>
                        <div className="text-sm font-body text-muted-foreground space-y-2 leading-relaxed pl-8">
                            <p>The Comparative Analysis module allows users to compare disciplinary patterns between two groups.</p>

                          <p className="font-medium text-foreground text-xs uppercase tracking-wide mt-3">Single Category Comparisons</p>
                            <p className="text-xs">Example comparisons:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                                <li>Rank: Private vs Corporal</li>
                              <li>Occupation: Farmer vs Labourer</li>
                                <li>Birthplace: Ontario vs Quebec</li>
                            </ul>

                            <p className="font-medium text-foreground text-xs uppercase tracking-wide mt-3">Double Category Comparisons</p>
                          <p className="text-xs">This allows more specific comparisons by combining two categories.</p>
                            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                              <li>Unit A + Private rank vs Unit B + Private rank</li>
                                <li>Birthplace Ontario + Married vs Quebec + Married</li>
                            </ul>

                          <p>This module displays charts that highlight differences in offence patterns between the selected groups.</p>
                        </div>
                    </Link>

                    <Link to="/advanced" id="um-ml" className="block border border-border rounded-sm p-4 space-y-3 scroll-mt-4 group hover:border-olive/50 hover:shadow-md hover:bg-olive/[0.03] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <Brain className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p className="font-serif font-semibold text-sm group-hover:text-olive transition-colors">Machine Learning Analysis</p>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-olive mt-0.5 transition-colors ml-auto" />
                        </div>
                        <div className="text-sm font-body text-muted-foreground space-y-2 leading-relaxed pl-8">
                            <p>The Machine Learning Analysis module uses three different algorithms to uncover patterns between soldier demographics and disciplinary outcomes during WWI.</p>

                            <p className="font-medium text-foreground text-xs uppercase tracking-wide mt-3">How to use</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs pl-2">
                                <li>Select one of three analysis methods (Decision Tree, Logistic Regression, or Naive Bayes)</li>
                                <li>Choose which demographic features to include (minimum 2 required for the decision tree method)</li>
                                <li>Click "Run Analysis" to generate the results</li>
                            </ol>

                            <p className="font-medium text-foreground text-xs uppercase tracking-wide mt-3">Available features</p>
                            <p className="text-xs">The Decision Tree and Logistic Regression methods draw on the following soldier characteristics taken from the original enlistment records. Users may select which features to include, with a minimum of two required for Decision Tree.</p>
                            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                                <li><span className="font-semibold">Rank:</span> The military rank held at the time of enlistment, such as Private, Corporal, or Sergeant.</li>
                                <li><span className="font-semibold">Birthplace:</span> The place of birth as recorded on the enlistment form.</li>
                                <li><span className="font-semibold">Occupation:</span> The civilian occupation held prior to enlisting in the Canadian Expeditionary Force.</li>
                                <li><span className="font-semibold">Marital Status:</span> Whether the soldier was recorded as Single, Married, or Widower at the time of enlistment.</li>
                                <li><span className="font-semibold">Enlistment Year:</span> The calendar year in which the soldier formally enlisted (1914 through 1918).</li>
                                <li><span className="font-semibold">Birth Year:</span> The year of birth as stated on the enlistment record.</li>
                                <li><span className="font-semibold">Unit Type:</span> The type of military unit, such as Infantry, Artillery, Medical, or Cavalry & Mounted.</li>
                            </ul>
                            <p className="text-xs mt-2">The Naive Bayes method uses a fixed set of three features (Rank, Unit Type, and Enlistment Year) drawn from the courts martial records rather than the full enlistment dataset. Users can switch between these features on the results page to explore different dimensions of the data.</p>

                            <p className="font-medium text-foreground text-xs uppercase tracking-wide mt-3">Analysis methods</p>
                            <div className="space-y-4 mt-2">
                                <div className="border-l-2 border-olive/30 pl-3 space-y-2">
                                    <p className="font-serif font-medium text-sm text-foreground">Decision Tree: Predicting Court Martial</p>
                                    <p className="text-xs">The Decision Tree model addresses a straightforward question: given what we know about a soldier's background at enlistment, can we predict whether that soldier would later face a court martial? To answer this, the algorithm examines the full enlistment dataset of over 57,000 soldiers and labels each one as either court-martialled or not, based on whether they appear in the court martial records.</p>
                                    <p className="text-xs">The model works by repeatedly splitting the dataset on the feature that best separates court-martialled soldiers from everyone else. For instance, the first split might divide soldiers by rank, because Privates were more likely to face disciplinary proceedings than officers. Each subsequent split refines this further, creating a branching flowchart of rules that traces different paths through the data. Categorical features like birthplace, occupation, and marital status use one-hot encoding, so each split asks a clear yes/no question about a single category (e.g. "Occupation = Labourer?").</p>
                                    <p className="text-xs">The result is an interactive visual decision tree that can be explored in vertical, horizontal, or plain text format. The tree starts with only the first level visible. Click any decision node to expand or collapse its branches, allowing you to drill into the paths that interest you without being overwhelmed by the full tree at once.</p>
                                    <p className="text-xs">Each final leaf node shows the court martial rate for that subgroup and compares it to the overall baseline rate (approximately 1.6% of all soldiers). Leaves are colour-coded to make patterns immediately visible: red and amber for groups with higher-than-average risk, green and teal for lower-than-average risk, and neutral for groups close to the baseline. Each leaf also includes a plain-language label like "2.1× more likely than average" or "Similar to average".</p>
                                    <p className="text-xs">Alongside the tree, the system generates key findings that summarize which features matter most, which categories of soldiers had the highest or lowest court martial rates, and how the model performs overall. This method is most useful when the goal is to understand the decision rules and conditions that distinguish court-martialled soldiers from the general enlistment population.</p>
                                </div>
                                <div className="border-l-2 border-olive/30 pl-3 space-y-2">
                                    <p className="font-serif font-medium text-sm text-foreground">Logistic Regression: Ranking Feature Importance</p>
                                    <p className="text-xs">The Logistic Regression model tackles a related but distinct question: across all the demographic features, which specific values have the strongest influence on the likelihood of being court-martialled? Rather than building a tree of branching rules, this model calculates a numerical coefficient for every possible value of every feature.</p>
                                    <p className="text-xs">Before training, each categorical feature is one-hot encoded: for instance, the "Rank" feature becomes separate binary columns for Private, Corporal, Sergeant, and so on. One category per feature is dropped as the reference category to avoid mathematical redundancy. All coefficients are then interpreted relative to this reference. A coefficient of +0.8 on "Rank: Private" means Privates have 0.8 higher log-odds of court martial compared to the dropped reference rank.</p>
                                    <p className="text-xs">A positive coefficient means that holding a particular value (for example, being a Labourer, or enlisting in 1916) is associated with a higher probability of court martial. A negative coefficient means the opposite. The magnitude of the coefficient reflects the strength of that association. In practical terms, a coefficient of +1.0 roughly triples the odds of court martial compared to the reference, while -1.0 roughly divides them by three. Values near zero indicate little independent effect.</p>
                                    <p className="text-xs">The results are presented as a horizontal bar chart. Green bars extending right indicate features that increase court martial likelihood, while red bars extending left indicate features that decrease it. Longer bars mean stronger effects. The chart can be sorted by magnitude (strongest effects first), or by direction (all positive first, or all negative first). Feature labels can be positioned on either side of the chart for readability.</p>
                                    <p className="text-xs">Alongside the chart, the system generates key findings that identify which feature categories show the widest variation in court martial risk, whether combat or support unit types carry higher risk, and which specific ranks, birthplaces, or enlistment years are most associated with court martial. The model is evaluated using precision, recall, and AUC (Area Under the ROC Curve), a measure of how well the model distinguishes between court-martialled and non-court-martialled soldiers across all possible thresholds.</p>
                                    <p className="text-xs">This approach is particularly valuable for researchers who want a ranked summary of risk factors rather than a set of branching rules. It answers "how much does each feature matter?" in a single, easy-to-read visualization and is especially helpful for comparing the relative influence of different occupations, birthplaces, or ranks side by side.</p>
                                </div>
                                <div className="border-l-2 border-olive/30 pl-3 space-y-2">
                                    <p className="font-serif font-medium text-sm text-foreground">Naive Bayes: Pattern Discovery by Offence</p>
                                    <p className="text-xs">The Naive Bayes model asks a fundamentally different question from the other two methods. Instead of predicting whether a soldier was court-martialled, it focuses exclusively on soldiers who were court-martialled and discovers which demographic characteristics are overrepresented or underrepresented within each offence category. It is a pattern discovery tool rather than a prediction model.</p>
                                    <p className="text-xs">The algorithm uses a Categorical Naive Bayes classifier trained on the full courts martial dataset (over 11,000 records with offence codes expanded into separate rows). Individual offence codes from the British Army Act are grouped into 9 semantic categories: Absence/Desertion, Drunkenness, Insubordination, Misconduct, Combat/Enemy, Fraud/Theft/Property, Neglect/Orders, Custody Offences, and Other. The model learns conditional probability tables for three features: Rank, Unit Type, and Enlistment Year.</p>
                                    <p className="text-xs">For each offence category, the model calculates P(feature value | offence class), the probability of each feature value given that offence. It then compares this to the overall baseline probability of that feature value across all offences, producing a "lift" metric. A lift of 2.0 means a value is twice as common within that offence category as it is overall; a lift of 0.5 means it is half as common. This reveals which demographic groups are disproportionately associated with specific types of charges.</p>
                                    <p className="text-xs">The results page includes four interactive visualizations. The <span className="font-semibold">Offence Distribution</span> chart shows the proportion of each offence category in the dataset. The <span className="font-semibold">Top Pattern Lifts</span> chart highlights the strongest overrepresentations, the feature values most disproportionately associated with each offence type. The <span className="font-semibold">Conditional Probabilities</span> heatmap displays the full probability table for a selected feature, showing how feature values are distributed within each offence class. The <span className="font-semibold">Offence Breakdown</span> stacked bar chart shows, within each feature value (e.g. each rank or unit type), what proportion of offences falls into each category. Users can switch between features using the selector above the charts.</p>
                                    <p className="text-xs">Alongside the visualizations, the system generates key findings that identify the most common offence categories, the strongest overrepresented and underrepresented patterns, and notable temporal trends across enlistment years. The model is trained on the full dataset without a train/test split, since the goal is to extract the most stable probability estimates rather than to evaluate predictive accuracy. Laplace smoothing (alpha = 1.0) is applied to handle feature values that may not appear in every offence category.</p>
                                    <p className="text-xs">This method is most useful when the goal is to understand which types of soldiers were associated with which types of charges, for example, whether certain ranks or unit types appear more frequently in drunkenness charges versus desertion charges. It provides a richer, category-level view of disciplinary patterns that complements the binary court-martial predictions of the other two methods.</p>
                                </div>
                            </div>

                            <p className="font-medium text-foreground text-xs uppercase tracking-wide mt-3">Understanding the metrics</p>
                            <p className="text-xs">Each model is evaluated using three standard performance metrics. These numbers help users understand how well the model performed and what its limitations are.</p>
                            <div className="space-y-2 text-xs pl-2">
                                <p><span className="font-semibold">Accuracy</span> measures the overall percentage of predictions that were correct, whether the model said "court-martialled" or "not court-martialled." While this may seem like the most intuitive metric, it can be misleading with imbalanced data. Because only about 1.6% of soldiers were actually court-martialled, a model that blindly predicted "not court-martialled" for everyone would still achieve roughly 98% accuracy while being completely useless.</p>
                                <p><span className="font-semibold">Precision</span> measures, among all soldiers the model flagged as court-martialled, how many truly were. A low precision value (around 2%) is expected and reflects the extreme imbalance in the dataset. The model deliberately casts a wide net to catch as many court-martialled soldiers as possible, which inevitably means it also flags many soldiers who were not actually court-martialled. This is not a flaw but rather a conscious trade-off in the model design.</p>
                                <p><span className="font-semibold">Recall</span> measures, among all soldiers who were genuinely court-martialled, how many the model successfully identified. A higher recall means the model is doing a better job of finding the court-martialled soldiers within the much larger population. This is the metric that matters most for this type of analysis, because the primary goal is to discover what demographic patterns are associated with court martial, not to build a screening tool.</p>
                            </div>
                            <p className="text-xs mt-2">The model uses a technique called balanced class weighting, which instructs the algorithm to treat the small group of court-martialled soldiers as equally important to the much larger group who were not. Without this adjustment, the model would learn to ignore the minority class entirely and simply predict "not court-martialled" for every soldier. The trade-off is that the model achieves higher recall at the expense of lower precision, which is the appropriate choice for exploratory historical analysis.</p>

                            <p className="italic text-xs mt-3">Machine learning results produced by this system are exploratory tools intended to support historical research. They reveal statistical patterns in the archival data but should always be interpreted alongside broader historical context, including the social conditions, military practices, and administrative realities of the First World War.</p>
                        </div>
                    </Link>

                    <Link to="/metadata" id="um-dataset" className="block border border-border rounded-sm p-4 space-y-3 scroll-mt-4 group hover:border-olive/50 hover:shadow-md hover:bg-olive/[0.03] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start gap-3">
                          <Database className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p className="font-serif font-semibold text-sm group-hover:text-olive transition-colors">Dataset Information</p>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-olive mt-0.5 transition-colors ml-auto" />
                      </div>
                        <div className="text-sm font-body text-muted-foreground space-y-2 leading-relaxed pl-8">
                          <p>The Dataset Information module provides transparency about the historical records used in this system. It includes:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs pl-2">
                              <li>Descriptions of the original Canadian archival sources</li>
                                <li>Temporal and geographic coverage of the datasets</li>
                              <li>Explanations of known data limitations</li>
                                <li>Metadata and documentation about the data structure</li>
                            </ul>
                          <p className="italic text-xs">Users are encouraged to review this section before interpreting analysis results.</p>
                        </div>
                    </Link>
                </div>
            </WireBox>
            </div>

            <div id="um-offences" className="scroll-mt-4">
            <WireBox dashed={false} label="OFFENCE CODE REFERENCE">
                <div className="text-sm font-body text-muted-foreground mb-4 space-y-2 leading-relaxed">
                    <p>In total, there are 174 punishable offences in the Army Act for which soldiers were liable to be court-martialled.</p>
                    <p>Listed below are the offences findable in the "Courts Martial-First World War" database. For a list of all 174 punishable offences in the Army Act, see the <a href="/documents/Punishable_Offences_Analysis.pdf" target="_blank" rel="noopener noreferrer" className="italic text-olive underline hover:text-olive-light transition-colors">Punishable Offences Analysis</a>.</p>
                </div>
                <div className="border border-border rounded-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-olive/10 text-xs font-body font-semibold uppercase tracking-wide text-olive border-b border-border">
                        <div className="col-span-2">Section</div>
                        <div className="col-span-10">Offence Description</div>
                    </div>
                    {offenceCodes.map((o, i) => (
                        <div key={o.code} className={`grid grid-cols-12 gap-2 p-3 text-xs font-body ${i % 2 ? "bg-parchment-dark/30" : "bg-card"}`}>
                            <div className="col-span-2 font-mono font-bold text-olive">{o.code}</div>
                            <div className="col-span-10">{o.label}</div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground italic mt-3 font-body">These offences reflect disciplinary rules used within the Canadian Expeditionary Force during the war.</p>
            </WireBox>
            </div>

            <div id="um-occupations" className="scroll-mt-4">
            <WireBox dashed={false} label="OCCUPATION CATEGORY EXAMPLES">
                <div className="space-y-3">
                    {[
                        { cat: "Agriculture", examples: "Farmer, Farm Labourer, Farm Hand, Rancher" },
                        { cat: "Industrial / Skilled Trades", examples: "Machinist, Carpenter, Electrician, Plumber, Boilermaker, Iron Worker, Mason, Cabinet Maker" },
                        { cat: "Transportation / Rail", examples: "Teamster, Brakeman, Conductor, Switchman, Railroad Labourer, Locomotive Fireman" },
                        { cat: "Maritime", examples: "Sailor, Seaman, Marine Engineer, Fisherman, Sea Farer" },
                        { cat: "Professional / White-Collar", examples: "Lawyer, Civil Engineer, Surveyor, Actuary, Journalist, Clerk, Bank Clerk" },
                        { cat: "Service / Retail", examples: "Waiter, Cook, Baker, Hotel Keeper, Salesman" },
                        { cat: "Students", examples: "Student, Law Student, Medical Student" },
                        { cat: "Military / Government", examples: "Soldier, R.N.W.M. Police, Civil Servant" },
                    ].map((item, i) => (
                        <div key={item.cat} className={`grid grid-cols-12 gap-2 p-3 text-xs font-body rounded-sm ${i % 2 ? "bg-parchment-dark/30" : "bg-card"} border border-border/50`}>
                            <div className="col-span-4 font-serif font-semibold text-sm text-olive">{i + 1}. {item.cat}</div>
                            <div className="col-span-8 text-muted-foreground">{item.examples}</div>
                        </div>
                    ))}
                </div>
            </WireBox>
            </div>

            <div id="um-interpret" className="scroll-mt-4">
                <WireBox dashed={false} label="HOW TO INTERPRET THE RESULTS" accent="olive">
                    <div className="flex items-start gap-3 mb-4">
                        <Info className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-body text-muted-foreground">When exploring the system, users should consider the following points.</p>
                    </div>
                    <div className="space-y-4">
                        {[
                            {
                                title: "Charts show aggregated patterns",
                                desc: "All charts display trends across groups of soldiers rather than individual records.",
                            },
                            {
                                title: "Differences between groups reflect recorded disciplinary proceedings",
                                desc: "Courts martial data reflects formal disciplinary actions recorded in military archives. It does not capture all forms of misconduct or disciplinary activity.",
                            },
                            {
                                title: "Historical context matters",
                                desc: "Patterns in the data may be influenced by wartime conditions, military hierarchy, operational environments, and administrative practices. Users should interpret results within the broader context of WWI military history.",
                            },
                        ].map((item) => (
                            <div key={item.title} className="border-l-2 border-olive/30 pl-4 space-y-1">
                                <p className="font-serif font-medium text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </WireBox>
            </div>

            <div id="um-notes" className="scroll-mt-4">
            <WireBox dashed={false} label="IMPORTANT NOTES" className="border-rust/30 bg-rust/5">
                <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-rust mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-body text-muted-foreground">Ethical and methodological notes for responsible use.</p>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground font-body pl-8 leading-relaxed">
                    <li className="flex items-start gap-2">
                        <span className="text-rust font-bold mt-px">•</span>
                        <span>All analysis uses Canadian aggregate data only. No individual-level inference is possible.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-rust font-bold mt-px">•</span>
                        <span>Canadian regimental numbers and personal identifiers are never displayed in the system.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-rust font-bold mt-px">•</span>
                        <span>Machine learning results are exploratory tools used to identify patterns in Canadian CEF disciplinary records. They are not predictive models.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-rust font-bold mt-px">•</span>
                        <span>Exported reports include Canadian data source citations and system metadata to support transparency and reproducibility.</span>
                    </li>
                </ul>
            </WireBox>
            </div>
        </PageLayout>
    );
};

export default UserManual;
